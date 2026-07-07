import { supabase } from '../../lib/supabase'

/* ============================================================
   Offer Letter Service — AI-powered offer letter generation
   
   Uses Gemini AI via edge function.
   Multi-language, legal-aware.
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
  if (!json.success) throw new Error(json.error || 'Offer letter generation failed')
  return json
}

// ── Types ───────────────────────────────────────────────────

export interface OfferLetterInput {
  offerId: string
  language?: 'th' | 'en' | 'vi' | 'id'
}

export interface OfferLetterResult {
  header: string
  employee_name: string
  company_name: string
  position: string
  salary_paragraph: string
  benefits_paragraph: string
  working_conditions: string
  termination_clause: string
  confidentiality_clause: string
}

// ── Validation ──────────────────────────────────────────────

export function validateOfferInput(input: OfferLetterInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.offerId) errors.push('offerId is required')
  if (input.language && !['th', 'en', 'vi', 'id'].includes(input.language)) {
    errors.push('language must be one of: th, en, vi, id')
  }

  return { valid: errors.length === 0, errors }
}

export function validateOfferResult(result: OfferLetterResult): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!result.header) issues.push('Missing header')
  if (!result.employee_name) issues.push('Missing employee_name')
  if (!result.company_name) issues.push('Missing company_name')
  if (!result.position) issues.push('Missing position')
  if (!result.salary_paragraph) issues.push('Missing salary_paragraph')
  if (!result.benefits_paragraph) issues.push('Missing benefits_paragraph')
  if (!result.working_conditions) issues.push('Missing working_conditions')
  if (!result.termination_clause) issues.push('Missing termination_clause')
  if (!result.confidentiality_clause) issues.push('Missing confidentiality_clause')

  return { valid: issues.length === 0, issues }
}

// ── API ─────────────────────────────────────────────────────

/**
 * Generate an offer letter using AI.
 * Returns structured offer letter content.
 */
export async function generateOfferLetter(input: OfferLetterInput): Promise<OfferLetterResult> {
  const validation = validateOfferInput(input)
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`)
  }

  const result = await invokeFunction<{ data: OfferLetterResult }>('generate-offer-content', {
    offerId: input.offerId,
    language: input.language,
  })

  // Validate AI output
  const outputValidation = validateOfferResult(result.data)
  if (!outputValidation.valid) {
    console.warn('[offerLetterService] Output validation issues:', outputValidation.issues)
  }

  return result.data
}
