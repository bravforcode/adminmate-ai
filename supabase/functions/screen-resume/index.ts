import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@latest'
import { corsHeaders, verifyAuth } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const user = await verifyAuth(req, supabase)
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  try {
    const { applicationId, jobId, cvDocumentId, companyId } = await req.json()

    const [{ data: job }, { data: cv }] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', jobId).single(),
      supabase.from('cv_documents').select('*').eq('id', cvDocumentId).single(),
    ])

    const cvContent = cv?.parsed_content || cv?.raw_text || 'No CV content available'
    const jobContent = `Job: ${job?.title}\nDepartment: ${job?.department}\nDescription: ${job?.description}\nRequirements: ${(job?.requirements || []).join('\n')}\nSkills: ${(job?.skills_required || []).join(', ')}`

    const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are an expert AI recruiter. Analyze this candidate against the job requirements. Be fair and unbiased. Return ONLY valid JSON (no markdown): { "match_score": number (0-100), "skill_match": [{"skill":"string","score":number,"evidence":"string"}], "experience_match": "string", "missing_skills": ["string"], "suggested_interview_questions": ["5 questions"], "overall_summary": "string (2-3 paragraphs)", "strengths": ["string"], "concerns": ["string"] }`,
        temperature: 0.3, maxOutputTokens: 4096,
      },
      contents: `${jobContent}\n\nCandidate CV Data:\n${JSON.stringify(cvContent)}`,
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (analysis) {
      await supabase.from('applications').update({
        ai_match_score: analysis.match_score,
        ai_analysis: analysis,
        ai_skill_match: analysis.skill_match,
        ai_missing_skills: analysis.missing_skills,
        ai_suggested_questions: analysis.suggested_interview_questions,
        ai_summary: analysis.overall_summary,
        status: 'ai_screening',
        screened_at: new Date().toISOString(),
      }).eq('id', applicationId)
    }

    return new Response(JSON.stringify({ success: true, data: analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return errorResponse(error, 500, corsHeaders)
  }
})
