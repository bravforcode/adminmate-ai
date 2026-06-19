import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getCorsHeaders, getJsonHeaders, handleCorsPreflight,
  verifyAuth, enforceRateLimit, getGeminiKey,
} from '../_shared/utils.ts'
import { excludeSensitiveFieldsForAI } from '../_shared/sensitiveFields.ts'

const FN = 'candidate-summary'
const PROMPT_VERSION = '1.0.0'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const h = getJsonHeaders(req)
  let companyId: string | undefined
  let userId: string | undefined

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: h })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: h })
    userId = user.id

    const rateLimited = await enforceRateLimit(supabase, user.id, 'candidate_summary', 15, 60, req)
    if (rateLimited) return rateLimited

    let body: any
    try { body = await req.json() }
    catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400, headers: h }) }

    const { candidate_id, application_id } = body
    if (!candidate_id) {
      return new Response(JSON.stringify({ success: false, error: 'candidate_id is required' }), { status: 400, headers: h })
    }

    // Fetch candidate
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .single()

    if (!candidate) {
      return new Response(JSON.stringify({ success: false, error: 'Candidate not found' }), { status: 404, headers: h })
    }
    companyId = candidate.company_id

    // Fetch CV
    const { data: cvDoc } = await supabase
      .from('cv_documents')
      .select('*')
      .eq('candidate_id', candidate_id)
      .eq('is_current', true)
      .maybeSingle()

    // Fetch application if provided
    let application: any = null
    if (application_id) {
      const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('id', application_id)
        .eq('candidate_id', candidate_id)
        .single()
      application = data
    }

    // Build candidate payload with sensitive field exclusion
    const candidatePayload: Record<string, unknown> = {
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      current_position: candidate.current_position,
      experience_years: candidate.experience_years,
      linkedin_url: candidate.linkedin_url,
      portfolio_url: candidate.portfolio_url,
    }
    if (cvDoc) {
      candidatePayload.summary = cvDoc.summary
      candidatePayload.skills_extracted = cvDoc.skills_extracted
      candidatePayload.experience_years = cvDoc.experience_years ?? candidate.experience_years
      candidatePayload.education_extracted = cvDoc.education_extracted
      candidatePayload.raw_text = cvDoc.raw_text?.slice(0, 6000)
    }
    if (application) {
      candidatePayload.cover_letter = application.cover_letter
    }

    // CRITICAL: Exclude sensitive fields
    const { sanitized, excluded } = excludeSensitiveFieldsForAI(candidatePayload)

    // Check Gemini key
    const geminiKey = getGeminiKey()
    if (!geminiKey) {
      return new Response(JSON.stringify({
        success: false, error: 'AI provider not configured', code: 'AI_NOT_CONFIGURED',
      }), { status: 503, headers: h })
    }

    const { GoogleGenAI } = await import('https://esm.sh/@google/genai@latest')
    const genai = new GoogleGenAI({ apiKey: geminiKey })

    const systemPrompt = `You are an HR candidate analyst. Summarize the candidate profile objectively based ONLY on provided evidence.

RULES:
- Never infer protected attributes (age, gender, religion, race, nationality, etc.)
- Distinguish between facts and assumptions
- Be specific about evidence sources
- If evidence is limited, say so explicitly
- Never fabricate skills or experience not in the evidence

OUTPUT JSON:
{
  "summary": "2-3 sentence objective summary",
  "strengths": ["string array of evidenced strengths"],
  "gaps": ["string array of missing/weak qualifications"],
  "redFlags": ["string array of concerning patterns, only if evidence supports"],
  "confidence": "low"|"medium"|"high"
}`

    const userPrompt = `Summarize this candidate profile.

CANDIDATE DATA:
${JSON.stringify(sanitized, null, 2)}

Return ONLY valid JSON matching the schema.`

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    })

    const responseText = response.text ?? ''
    let result: any
    try { result = JSON.parse(responseText) }
    catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) result = JSON.parse(jsonMatch[0])
      else throw new Error('Invalid AI response')
    }

    // Persist summary
    const { data: saved, error: saveErr } = await supabase
      .from('candidate_ai_summaries')
      .insert({
        company_id: companyId,
        candidate_id,
        application_id: application_id || null,
        summary: result.summary || '',
        strengths: result.strengths || [],
        gaps: result.gaps || [],
        red_flags: result.redFlags || [],
        evidence: [],
        sensitive_fields_excluded: excluded,
        confidence: result.confidence || 'low',
        prompt_version: PROMPT_VERSION,
        created_by: user.id,
      })
      .select()
      .single()

    if (saveErr) console.error(`[${FN}] DB write error:`, saveErr.message)

    // Log AI run
    await supabase.from('ai_recruiting_runs').insert({
      company_id: companyId,
      candidate_id,
      application_id: application_id || null,
      run_type: 'candidate_summary',
      status: 'completed',
      model_name: 'gemini-2.5-flash',
      prompt_version: PROMPT_VERSION,
      output_summary: result.summary?.slice(0, 500),
      created_by: user.id,
      completed_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, summary: saved ?? result }), { status: 200, headers: h })
  } catch (err) {
    console.error(`[${FN}] Error:`, err)
    return new Response(JSON.stringify({ success: false, error: 'Summary generation failed' }), { status: 500, headers: h })
  }
})
