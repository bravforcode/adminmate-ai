import { supabase } from '../../lib/supabase'

/* ============================================================
   Resume Screening Service — AI-powered resume analysis
   
   Uses Gemini AI via edge function.
   No keyword matching — real AI analysis.
   ============================================================ */

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Resume screening failed')
  return json
}

// ── Types ───────────────────────────────────────────────────

export interface ResumeScreeningInput {
  applicationId: string
  jobId: string
  cvDocumentId: string
  companyId?: string
}

export interface SkillMatch {
  skill: string
  score: number
  evidence: string
}

export interface ResumeScreeningResult {
  match_score: number
  skill_match: SkillMatch[]
  experience_match: string
  missing_skills: string[]
  suggested_interview_questions: string[]
  overall_summary: string
  strengths: string[]
  concerns: string[]
}

// ── Validation ──────────────────────────────────────────────

export function validateScreeningInput(input: ResumeScreeningInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.applicationId) errors.push('applicationId is required')
  if (!input.jobId) errors.push('jobId is required')
  if (!input.cvDocumentId) errors.push('cvDocumentId is required')

  return { valid: errors.length === 0, errors }
}

export function validateScreeningResult(result: ResumeScreeningResult): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // match_score must be 0-100
  if (typeof result.match_score !== 'number' || result.match_score < 0 || result.match_score > 100) {
    issues.push(`match_score must be 0-100, got ${result.match_score}`)
  }

  // Each skill match must have evidence
  if (result.skill_match) {
    for (const sm of result.skill_match) {
      if (!sm.evidence || sm.evidence.trim().length === 0) {
        issues.push(`Skill "${sm.skill}" has score but no evidence`)
      }
    }
  }

  // Must have summary
  if (!result.overall_summary || result.overall_summary.trim().length === 0) {
    issues.push('Missing overall_summary')
  }

  return { valid: issues.length === 0, issues }
}

// ── API ─────────────────────────────────────────────────────

/**
 * Screen a resume against a job using AI.
 * Returns match score with skill-level breakdown and evidence.
 */
export async function screenResume(input: ResumeScreeningInput): Promise<ResumeScreeningResult> {
  const validation = validateScreeningInput(input)
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`)
  }

  const result = await invokeFunction<{ data: ResumeScreeningResult }>('screen-resume', {
    applicationId: input.applicationId,
    jobId: input.jobId,
    cvDocumentId: input.cvDocumentId,
    companyId: input.companyId,
  })

  // Validate AI output
  const outputValidation = validateScreeningResult(result.data)
  if (!outputValidation.valid) {
    console.warn('[resumeScreeningService] Output validation issues:', outputValidation.issues)
  }

  return result.data
}
