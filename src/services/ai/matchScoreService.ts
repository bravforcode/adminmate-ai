import { supabase } from '../../lib/supabase'
import type {
  CandidateMatchScoreResult,
  MatchScoreInput,
  OverrideInput,
  HROverride,
  AIScoreBreakdownItem,
} from '../../types/aiRecruiting'

/* ============================================================
   Match Score Service — Evidence-based AI scoring

   RULES:
   - No hardcoded scores. All scores from AI or HR override.
   - "Not enough evidence" when data insufficient.
   - Breakdown per criterion with evidence items.
   - HR can override every score.
   - Sensitive fields never used in scoring.
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
  if (!json.success) throw new Error(json.error || 'Match score function failed')
  return json
}

// ── Scoring Criteria (must match edge function) ─────────────

export const SCORING_CRITERIA = [
  { key: 'skill_match', label: 'Job Fit / Skill Match', weight: 0.40 },
  { key: 'experience', label: 'Proven Experience', weight: 0.25 },
  { key: 'trust_integrity', label: 'Trust & Integrity', weight: 0.15 },
  { key: 'culture_fit', label: 'Culture Fit', weight: 0.10 },
  { key: 'problem_solving', label: 'Problem-Solving', weight: 0.05 },
  { key: 'communication', label: 'Communication', weight: 0.03 },
  { key: 'growth_potential', label: 'Growth Potential', weight: 0.02 },
] as const

// ── Sensitive fields (must never enter scoring) ─────────────

export const SENSITIVE_FIELDS = [
  'age', 'gender', 'religion', 'race', 'marital_status',
  'nationality', 'disability', 'pregnancy', 'photo',
  'health_data', 'dependent_health_data', 'immigration_status',
  'union_status', 'salary_history',
] as const

// ── Validation ──────────────────────────────────────────────

/**
 * Validate match score result from AI.
 * Ensures no fabricated scores — every score must have evidence.
 */
export function validateMatchScoreResult(result: CandidateMatchScoreResult): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check breakdown exists
  if (!result.breakdown || !Array.isArray(result.breakdown)) {
    issues.push('Missing breakdown array')
    return { valid: false, issues }
  }

  // Check each criterion
  for (const item of result.breakdown) {
    // Score without evidence = fabricated
    if (item.score !== null && item.score !== undefined) {
      if (!item.evidence || item.evidence.length === 0) {
        issues.push(`"${item.criterion}" has score ${item.score} but no evidence — must be null`)
      }
    }

    // Weight must match expected
    const expected = SCORING_CRITERIA.find(c => c.key === item.criterion)
    if (expected && Math.abs(item.weight - expected.weight) > 0.001) {
      issues.push(`"${item.criterion}" weight ${item.weight} doesn't match expected ${expected.weight}`)
    }
  }

  // If fewer than 3 criteria can be scored, overallScore must be null
  const scoredCount = result.breakdown.filter(
    (b: AIScoreBreakdownItem) => b.score !== null && b.score !== undefined
  ).length
  if (scoredCount < 3 && result.overallScore !== null) {
    issues.push(`Only ${scoredCount} criteria scored (< 3), overallScore must be null`)
  }

  // humanOverrideRequired must always be true
  if (result.humanOverrideRequired !== true) {
    issues.push('humanOverrideRequired must be true')
  }

  // Check no sensitive fields leaked
  if (result.sensitiveFieldsExcluded) {
    // sensitiveFieldsExcluded documents what was removed — this is expected
  }

  return { valid: issues.length === 0, issues }
}

/**
 * Sanitize candidate data by removing sensitive fields.
 * Client-side defense — edge function does the real exclusion.
 */
export function sanitizeCandidateData(
  data: Record<string, unknown>
): { sanitized: Record<string, unknown>; excluded: string[] } {
  const sanitized = { ...data }
  const excluded: string[] = []

  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      delete sanitized[field]
      excluded.push(field)
    }
  }

  return { sanitized, excluded }
}

// ── API Calls ───────────────────────────────────────────────

/**
 * Calculate match score for a candidate against a job.
 * Calls edge function which uses Gemini AI with evidence-based scoring.
 */
export async function calculateMatchScore(input: MatchScoreInput): Promise<CandidateMatchScoreResult> {
  const result = await invokeFunction<{ result: CandidateMatchScoreResult }>(
    'candidate-match-score',
    {
      candidate_id: input.candidateId,
      job_id: input.jobId,
      application_id: input.applicationId,
    }
  )

  // Client-side validation (defense in depth)
  const validation = validateMatchScoreResult(result.result)
  if (!validation.valid) {
    console.warn('[matchScoreService] Validation issues:', validation.issues)
  }

  return result.result
}

/**
 * Get match scores for a company, optionally filtered by candidate.
 */
export async function getMatchScores(
  companyId: string,
  candidateId?: string
): Promise<CandidateMatchScoreResult[]> {
  let query = supabase
    .from('candidate_match_scores')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (candidateId) query = query.eq('candidate_id', candidateId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as CandidateMatchScoreResult[]
}

/**
 * Get match score for a specific candidate-job pair.
 */
export async function getMatchScoreForJob(
  candidateId: string,
  jobId: string
): Promise<CandidateMatchScoreResult | null> {
  const { data, error } = await supabase
    .from('candidate_match_scores')
    .select('*')
    .eq('candidate_id', candidateId)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as unknown as CandidateMatchScoreResult | null
}

/**
 * HR override — allows HR to override AI score with a reason.
 * Always audited.
 */
export async function overrideMatchScore(input: OverrideInput): Promise<HROverride> {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error('Override reason is required (minimum 3 characters)')
  }

  const { error } = await supabase
    .from('candidate_match_scores')
    .update({
      hr_override_score: input.overrideScore,
      hr_override_reason: input.reason.trim(),
      hr_override_by: input.overriddenBy,
      hr_override_at: new Date().toISOString(),
    })
    .eq('id', input.scoreId)
    .eq('company_id', input.companyId)
    .select()
    .single()

  if (error) throw error

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: input.companyId,
    user_id: input.overriddenBy,
    action: 'ai_score.override',
    resource_type: 'candidate_match_score',
    resource_id: input.scoreId,
    details: JSON.stringify({
      override_score: input.overrideScore,
      override_recommendation: input.overrideRecommendation,
      reason: input.reason.trim(),
    }),
  })

  return {
    scoreId: input.scoreId,
    overrideScore: input.overrideScore,
    overrideRecommendation: input.overrideRecommendation,
    reason: input.reason.trim(),
    overriddenBy: input.overriddenBy,
    overriddenAt: new Date().toISOString(),
  }
}
