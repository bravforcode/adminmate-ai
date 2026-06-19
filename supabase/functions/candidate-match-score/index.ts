import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getCorsHeaders, getJsonHeaders, handleCorsPreflight,
  verifyAuth, enforceRateLimit, logRequest, getGeminiKey,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'
import { excludeSensitiveFieldsForAI, validateNoSensitiveFields } from '../_shared/sensitiveFields.ts'

const FN = 'candidate-match-score'
const SCORING_VERSION = '1.0.0'
const PROMPT_VERSION = '1.0.0'

const SCORING_CRITERIA = [
  { key: 'skill_match', label: 'Job Fit / Skill Match', weight: 0.40 },
  { key: 'experience', label: 'Proven Experience', weight: 0.25 },
  { key: 'trust_integrity', label: 'Trust & Integrity', weight: 0.15 },
  { key: 'culture_fit', label: 'Culture Fit', weight: 0.10 },
  { key: 'problem_solving', label: 'Problem-Solving', weight: 0.05 },
  { key: 'communication', label: 'Communication', weight: 0.03 },
  { key: 'growth_potential', label: 'Growth Potential', weight: 0.02 },
]

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const h = getJsonHeaders(req)
  const start = Date.now()
  let companyId: string | undefined
  let userId: string | undefined

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: h })
    }

    // Auth
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: h })
    userId = user.id

    // Rate limit
    const rateLimited = await enforceRateLimit(supabase, user.id, 'match_score', 10, 60, req)
    if (rateLimited) return rateLimited

    // Parse body
    let body: any
    try { body = await req.json() }
    catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400, headers: h }) }

    const { candidate_id, job_id, application_id } = body
    if (!candidate_id || !job_id) {
      return new Response(JSON.stringify({ success: false, error: 'candidate_id and job_id are required' }), { status: 400, headers: h })
    }

    // Resolve company_id from job (server-side — never trust client)
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, company_id, title, title_th, department, location, employment_type, experience_level, skills_required, requirements, description, description_th')
      .eq('id', job_id)
      .single()

    if (jobErr || !job) {
      return new Response(JSON.stringify({ success: false, error: 'Job not found' }), { status: 404, headers: h })
    }
    companyId = job.company_id

    // Permission check
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .eq('company_id', companyId)
      .single()

    if (!profile || !['admin', 'hr_manager', 'hr_staff', 'recruiter'].includes(profile.role)) {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient permissions' }), { status: 403, headers: h })
    }

    // Fetch candidate + CV data
    const [{ data: candidate }, { data: cvDoc }, { data: application }] = await Promise.all([
      supabase.from('candidates').select('*').eq('id', candidate_id).eq('company_id', companyId).single(),
      supabase.from('cv_documents').select('*').eq('candidate_id', candidate_id).eq('is_current', true).maybeSingle(),
      application_id
        ? supabase.from('applications').select('*').eq('id', application_id).eq('candidate_id', candidate_id).single()
        : Promise.resolve({ data: null }),
    ])

    if (!candidate) {
      return new Response(JSON.stringify({ success: false, error: 'Candidate not found' }), { status: 404, headers: h })
    }

    // ── SENSITIVE FIELD EXCLUSION ──
    // Remove all protected attributes before AI processing
    const candidatePayload: Record<string, unknown> = {
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      current_position: candidate.current_position,
      experience_years: candidate.experience_years,
      linkedin_url: candidate.linkedin_url,
      portfolio_url: candidate.portfolio_url,
      preferred_language: candidate.preferred_language,
    }

    // Add CV data if available
    if (cvDoc) {
      candidatePayload.summary = cvDoc.summary
      candidatePayload.skills_extracted = cvDoc.skills_extracted
      candidatePayload.experience_years = cvDoc.experience_years ?? candidate.experience_years
      candidatePayload.education_extracted = cvDoc.education_extracted
      candidatePayload.language_proficiency = cvDoc.language_proficiency
      candidatePayload.raw_text = cvDoc.raw_text?.slice(0, 8000) // limit size
    }

    // Add application data
    if (application) {
      candidatePayload.cover_letter = application.cover_letter
      candidatePayload.recruiter_notes = application.recruiter_notes
    }

    // CRITICAL: Exclude sensitive fields
    const { sanitized, excluded } = excludeSensitiveFieldsForAI(candidatePayload)
    validateNoSensitiveFields(sanitized) // throws if violation

    // Check for Gemini API key
    const geminiKey = getGeminiKey()
    if (!geminiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'AI provider not configured. Contact administrator.',
        code: 'AI_NOT_CONFIGURED',
      }), { status: 503, headers: h })
    }

    // Build job requirements context
    const jobContext = [
      `Job: ${job.title}${job.title_th ? ` / ${job.title_th}` : ''}`,
      `Department: ${job.department || 'N/A'}`,
      `Location: ${job.location || 'N/A'}`,
      `Type: ${job.employment_type || 'N/A'}`,
      `Level: ${job.experience_level || 'N/A'}`,
      job.description ? `Description: ${job.description.slice(0, 2000)}` : '',
      job.skills_required?.length ? `Required Skills: ${job.skills_required.join(', ')}` : '',
      job.requirements?.length ? `Requirements: ${job.requirements.join('; ')}` : '',
    ].filter(Boolean).join('\n')

    // Call Gemini for scoring
    const { GoogleGenAI } = await import('https://esm.sh/@google/genai@latest')
    const genai = new GoogleGenAI({ apiKey: geminiKey })

    const systemPrompt = `You are an evidence-based HR scoring assistant. You evaluate candidates against job requirements using ONLY the evidence provided.

CRITICAL RULES:
1. You must NEVER fabricate scores. If evidence is missing, set score to null and status to "missing".
2. You must NEVER use sensitive attributes (age, gender, religion, race, nationality, disability, photo, etc.) in scoring.
3. Culture Fit, Problem-Solving, Growth Potential, and Trust & Integrity usually require interview or structured evidence. If no such evidence exists, set score to null.
4. Communication can ONLY be scored from job-relevant written answers or interview notes — NOT from name, language, accent, or nationality.
5. Every score MUST include evidence items showing what data supports it.
6. If fewer than 3 criteria can be scored, set overallScore to null and recommendation to "not_enough_evidence".
7. Always set humanOverrideRequired to true.

OUTPUT JSON SCHEMA:
{
  "overallScore": number | null,
  "confidence": "low" | "medium" | "high",
  "recommendation": "shortlist" | "review" | "manual_review" | "not_enough_evidence",
  "breakdown": [
    {
      "criterion": "string",
      "weight": number,
      "score": number | null,
      "confidence": "low" | "medium" | "high",
      "evidence": [
        { "field": "string", "label": "string", "value": "string|number|boolean|null", "source": "string", "status": "supported"|"missing"|"needs_interview"|"manual_review", "explanation": "string" }
      ],
      "missingEvidence": ["string"],
      "limitations": ["string"]
    }
  ],
  "redFlags": ["string"],
  "gaps": ["string"]
}`

    const userPrompt = `Evaluate this candidate for the job position.

JOB REQUIREMENTS:
${jobContext}

CANDIDATE EVIDENCE:
${JSON.stringify(sanitized, null, 2)}

SCORING CRITERIA (weights):
${SCORING_CRITERIA.map(c => `- ${c.label}: ${(c.weight * 100)}%`).join('\n')}

Return ONLY valid JSON matching the schema. No markdown, no explanation outside JSON.`

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    })

    const responseText = response.text ?? ''
    let result: any
    try {
      result = JSON.parse(responseText)
    } catch {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid AI response format')
      }
    }

    // Validate: no fabricated scores for criteria without evidence
    if (result.breakdown) {
      for (const item of result.breakdown) {
        if (item.score !== null && (!item.evidence || item.evidence.length === 0)) {
          // Score without evidence — force null
          item.score = null
          item.confidence = 'low'
          item.missingEvidence = [...(item.missingEvidence || []), 'No supporting evidence found']
        }
      }
    }

    // Ensure humanOverrideRequired is always true
    result.humanOverrideRequired = true

    // Build final result
    const matchResult = {
      candidateId: candidate_id,
      jobId: job_id,
      companyId,
      overallScore: result.overallScore ?? null,
      confidence: result.confidence || 'low',
      recommendation: result.recommendation || 'manual_review',
      breakdown: result.breakdown || [],
      redFlags: result.redFlags || [],
      gaps: result.gaps || [],
      sensitiveFieldsExcluded: excluded,
      humanOverrideRequired: true as const,
      modelName: 'gemini-2.5-flash',
      promptVersion: PROMPT_VERSION,
      scoringVersion: SCORING_VERSION,
      createdAt: new Date().toISOString(),
    }

    // Persist to DB
    const { error: insertErr } = await supabase
      .from('candidate_match_scores')
      .upsert({
        company_id: companyId,
        candidate_id,
        job_id,
        application_id: application_id || null,
        overall_score: matchResult.overallScore,
        confidence: matchResult.confidence,
        recommendation: matchResult.recommendation,
        breakdown: matchResult.breakdown,
        red_flags: matchResult.redFlags,
        gaps: matchResult.gaps,
        sensitive_fields_excluded: excluded,
        human_override_required: true,
        prompt_version: PROMPT_VERSION,
        scoring_version: SCORING_VERSION,
        created_by: user.id,
      }, { onConflict: 'company_id,candidate_id,job_id' })

    if (insertErr) {
      console.error(`[${FN}] DB write error:`, insertErr.message)
    }

    // Log AI run
    await supabase.from('ai_recruiting_runs').insert({
      company_id: companyId,
      job_id,
      candidate_id,
      application_id: application_id || null,
      run_type: 'match_score',
      status: 'completed',
      model_name: 'gemini-2.5-flash',
      prompt_version: PROMPT_VERSION,
      output_summary: `Score: ${matchResult.overallScore}, Recommendation: ${matchResult.recommendation}, Confidence: ${matchResult.confidence}`,
      created_by: user.id,
      completed_at: new Date().toISOString(),
    })

    const duration = Date.now() - start
    console.log(`[${FN}] OK ${duration}ms candidate=${candidate_id} score=${matchResult.overallScore}`)

    return new Response(JSON.stringify({ success: true, result: matchResult }), { status: 200, headers: h })
  } catch (err) {
    console.error(`[${FN}] Error:`, err)
    // Log failed run
    if (companyId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await supabase.from('ai_recruiting_runs').insert({
        company_id: companyId,
        run_type: 'match_score',
        status: 'failed',
        model_name: 'gemini-2.5-flash',
        prompt_version: PROMPT_VERSION,
        error_message: String(err).slice(0, 1000),
        created_by: userId,
      })
    }
    return new Response(JSON.stringify({ success: false, error: 'Scoring failed. Please try again.' }), { status: 500, headers: h })
  }
})
