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

const FN = 'parse-resume'

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

    const rateLimited = await enforceRateLimit(supabase, user.id, 'parse_resume', 20, 60)
    if (rateLimited) return rateLimited

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS }) }

    const { cvDocumentId, candidateId, companyId } = body
    if (!cvDocumentId || typeof cvDocumentId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'cvDocumentId is required' }), { status: 400, headers: JSON_HEADERS })
    }

    const { data: cvDoc, error: cvError } = await supabase
      .from('cv_documents')
      .select('file_url, candidate_id, company_id')
      .eq('id', cvDocumentId)
      .single()
    if (cvError || !cvDoc) {
      return new Response(JSON.stringify({ success: false, error: 'CV document not found' }), { status: 404, headers: JSON_HEADERS })
    }

    if (companyId && cvDoc.company_id && cvDoc.company_id !== companyId) {
      return new Response(JSON.stringify({ success: false, error: 'CV does not belong to this company' }), { status: 403, headers: JSON_HEADERS })
    }

    const fileRes = await fetch(cvDoc.file_url)
    if (!fileRes.ok) {
      return new Response(JSON.stringify({ success: false, error: 'Could not download CV file' }), { status: 502, headers: JSON_HEADERS })
    }
    const fileBuffer = await fileRes.arrayBuffer()
    const fileText = new TextDecoder('utf-8', { fatal: false }).decode(fileBuffer)

    if (!fileText || fileText.length < 20) {
      return new Response(JSON.stringify({ success: false, error: 'CV file is empty or unreadable' }), { status: 422, headers: JSON_HEADERS })
    }

    const ai = new GoogleGenAI({ apiKey: getGeminiKey() })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `Extract structured data from this resume text. Return ONLY valid JSON: { "full_name": "string", "email": "string", "phone": "string", "location": "string", "linkedin_url": "string", "portfolio_url": "string", "summary": "string", "total_experience_years": number, "work_experience": [{"company":"string","title":"string","start_date":"string","end_date":"string","description":"string","skills_used":["string"]}], "education": [{"institution":"string","degree":"string","field":"string","start_date":"string","end_date":"string"}], "skills": [{"name":"string","level":"string","years":number}], "languages": [{"name":"string","level":"string"}], "certifications": [{"name":"string","issuer":"string","date":"string"}] }`,
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
      contents: fileText.slice(0, 15000),
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!parsed) {
      return new Response(JSON.stringify({ success: false, error: 'AI returned no parseable content' }), { status: 502, headers: JSON_HEADERS })
    }

    await supabase
      .from('cv_documents')
      .update({
        parsed_content: parsed,
        skills_extracted: (parsed.skills || []).map((s: any) => s.name),
        experience_years: parsed.total_experience_years,
        education_extracted: parsed.education,
        summary: parsed.summary,
      })
      .eq('id', cvDocumentId)

    if (parsed.email && candidateId) {
      const { data: candidate } = await supabase.from('candidates').select('email').eq('id', candidateId).single()
      if (!candidate?.email) {
        await supabase
          .from('candidates')
          .update({
            email: parsed.email,
            phone: parsed.phone || undefined,
            location: parsed.location || undefined,
            linkedin_url: parsed.linkedin_url || undefined,
            portfolio_url: parsed.portfolio_url || undefined,
            experience_years: parsed.total_experience_years,
          })
          .eq('id', candidateId)
      }
    }

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(JSON.stringify({ success: true, data: parsed }), { headers: JSON_HEADERS })
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, corsHeaders)
  }
})
