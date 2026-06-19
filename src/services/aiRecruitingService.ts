import { supabase } from '../lib/supabase'
import type {
  CandidateMatchScoreResult,
  CandidateAISummary,
  AIRun,
  MatchScoreInput,
  CandidateSummaryInput,
  OverrideInput,
  HROverride,
} from '../types/aiRecruiting'

/* ============================================================
   AI Recruiting Service — Client-side API layer
   All calls go through Edge Functions (service-role).
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
  if (!json.success) throw new Error(json.error || 'AI function failed')
  return json
}

// ── Match Score ─────────────────────────────────────────────

export async function calculateMatchScore(input: MatchScoreInput): Promise<CandidateMatchScoreResult> {
  const result = await invokeFunction<{ result: CandidateMatchScoreResult }>(
    'candidate-match-score',
    {
      candidate_id: input.candidateId,
      job_id: input.jobId,
      application_id: input.applicationId,
    }
  )
  return result.result
}

export async function getMatchScores(companyId: string, candidateId?: string): Promise<CandidateMatchScoreResult[]> {
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

export async function getMatchScoreForJob(candidateId: string, jobId: string): Promise<CandidateMatchScoreResult | null> {
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

// ── Candidate Summary ───────────────────────────────────────

export async function generateCandidateSummary(input: CandidateSummaryInput): Promise<CandidateAISummary> {
  const result = await invokeFunction<{ summary: CandidateAISummary }>(
    'candidate-summary',
    {
      candidate_id: input.candidateId,
      application_id: input.applicationId,
    }
  )
  return result.summary
}

export async function getCandidateSummaries(companyId: string, candidateId: string): Promise<CandidateAISummary[]> {
  const { data, error } = await supabase
    .from('candidate_ai_summaries')
    .select('*')
    .eq('company_id', companyId)
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as CandidateAISummary[]
}

// ── HR Override ─────────────────────────────────────────────

export async function overrideMatchScore(input: OverrideInput): Promise<HROverride> {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error('Override reason is required (minimum 3 characters)')
  }

  // Update the score record
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

// ── AI Run Log ──────────────────────────────────────────────

export async function getAIRuns(companyId: string, runType?: string): Promise<AIRun[]> {
  let query = supabase
    .from('ai_recruiting_runs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (runType) query = query.eq('run_type', runType)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as AIRun[]
}

// ── Sensitive Fields ────────────────────────────────────────

export async function getSensitiveFieldsForAI(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_sensitive_field_names', {})
  if (error) throw error
  return data ?? []
}

/**
 * Client-side sanitized candidate data for display.
 * Actual AI processing uses server-side exclusion in edge functions.
 */
export function sanitizeCandidateDataForDisplay(
  data: Record<string, unknown>,
  sensitiveFields: string[]
): Record<string, unknown> {
  const result = { ...data }
  for (const field of sensitiveFields) {
    if (field in result) delete result[field]
  }
  return result
}
