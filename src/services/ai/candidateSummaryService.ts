import { supabase } from '../../lib/supabase'

/* ============================================================
   Candidate Summary Service — AI-powered candidate analysis
   
   Uses Gemini AI via edge function.
   Evidence-based, no fabricated data.
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
  if (!json.success) throw new Error(json.error || 'Candidate summary failed')
  return json
}

// ── Types ───────────────────────────────────────────────────

export interface CandidateSummaryInput {
  candidateId: string
  applicationId?: string
  companyId: string
}

export interface CandidateSummaryResult {
  summary: string
  strengths: string[]
  gaps: string[]
  redFlags: string[]
  confidence: 'low' | 'medium' | 'high'
}

// ── Validation ──────────────────────────────────────────────

export function validateSummaryInput(input: CandidateSummaryInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.candidateId) errors.push('candidateId is required')
  if (!input.companyId) errors.push('companyId is required')

  return { valid: errors.length === 0, errors }
}

export function validateSummaryResult(result: CandidateSummaryResult): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!result.summary || result.summary.trim().length === 0) {
    issues.push('Missing summary')
  }

  if (!result.confidence || !['low', 'medium', 'high'].includes(result.confidence)) {
    issues.push(`Invalid confidence: ${result.confidence}`)
  }

  // Strengths and gaps should be arrays
  if (!Array.isArray(result.strengths)) {
    issues.push('strengths must be an array')
  }
  if (!Array.isArray(result.gaps)) {
    issues.push('gaps must be an array')
  }

  return { valid: issues.length === 0, issues }
}

// ── API ─────────────────────────────────────────────────────

/**
 * Generate AI summary for a candidate.
 * Returns evidence-based summary with strengths, gaps, red flags.
 */
export async function generateCandidateSummary(input: CandidateSummaryInput): Promise<CandidateSummaryResult> {
  const validation = validateSummaryInput(input)
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`)
  }

  const result = await invokeFunction<{ summary: CandidateSummaryResult }>('candidate-summary', {
    candidate_id: input.candidateId,
    application_id: input.applicationId,
  })

  // Validate AI output
  const outputValidation = validateSummaryResult(result.summary)
  if (!outputValidation.valid) {
    console.warn('[candidateSummaryService] Output validation issues:', outputValidation.issues)
  }

  return result.summary
}

/**
 * Get existing summaries for a candidate.
 */
export async function getCandidateSummaries(
  companyId: string,
  candidateId: string
): Promise<CandidateSummaryResult[]> {
  const { data, error } = await supabase
    .from('candidate_ai_summaries')
    .select('*')
    .eq('company_id', companyId)
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as CandidateSummaryResult[]
}
