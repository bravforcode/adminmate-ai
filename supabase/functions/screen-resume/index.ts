import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@latest'
import {
  corsHeaders,
  JSON_HEADERS,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  getGeminiKey,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'screen-resume'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS })
    userId = user.id

    const rateLimited = await enforceRateLimit(supabase, user.id, 'screen_resume', 20, 60)
    if (rateLimited) return rateLimited

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS }) }

    const { applicationId, jobId, cvDocumentId, companyId } = body
    if (!applicationId || !jobId || !cvDocumentId) {
      return new Response(JSON.stringify({ success: false, error: 'applicationId, jobId, and cvDocumentId are required' }), { status: 400, headers: JSON_HEADERS })
    }

    const [{ data: job }, { data: cv }] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', jobId).single(),
      supabase.from('cv_documents').select('*').eq('id', cvDocumentId).single(),
    ])
    if (!job || !cv) {
      return new Response(JSON.stringify({ success: false, error: 'Job or CV not found' }), { status: 404, headers: JSON_HEADERS })
    }
    if (companyId && job.company_id && job.company_id !== companyId) {
      return new Response(JSON.stringify({ success: false, error: 'Job does not belong to this company' }), { status: 403, headers: JSON_HEADERS })
    }

    const cvContent = cv?.parsed_content || cv?.raw_text || 'No CV content available'
    const jobContent = `Job: ${job?.title}\nDepartment: ${job?.department}\nDescription: ${job?.description}\nRequirements: ${(job?.requirements || []).join('\n')}\nSkills: ${(job?.skills_required || []).join(', ')}`

    const ai = new GoogleGenAI({ apiKey: getGeminiKey() })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are an expert AI recruiter. Analyze this candidate against the job requirements. Be fair and unbiased. Return ONLY valid JSON (no markdown): { "match_score": number (0-100), "skill_match": [{"skill":"string","score":number,"evidence":"string"}], "experience_match": "string", "missing_skills": ["string"], "suggested_interview_questions": ["5 questions"], "overall_summary": "string (2-3 paragraphs)", "strengths": ["string"], "concerns": ["string"] }`,
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
      contents: `${jobContent}\n\nCandidate CV Data:\n${JSON.stringify(cvContent)}`,
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!analysis) {
      return new Response(JSON.stringify({ success: false, error: 'AI returned no parseable content' }), { status: 502, headers: JSON_HEADERS })
    }

    await supabase
      .from('applications')
      .update({
        ai_match_score: analysis.match_score,
        ai_analysis: analysis,
        ai_skill_match: analysis.skill_match,
        ai_missing_skills: analysis.missing_skills,
        ai_suggested_questions: analysis.suggested_interview_questions,
        ai_summary: analysis.overall_summary,
        status: 'ai_screening',
        screened_at: new Date().toISOString(),
      })
      .eq('id', applicationId)

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(JSON.stringify({ success: true, data: analysis }), { headers: JSON_HEADERS })
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, corsHeaders)
  }
})
