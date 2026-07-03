import { supabase } from '../../lib/supabase'

/* ============================================================
   Document Validator Service — AI-powered document checking
   
   Uses Gemini AI via edge function.
   Checks document completeness for onboarding/compliance.
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
  if (!json.success) throw new Error(json.error || 'Document validation failed')
  return json
}

// ── Types ───────────────────────────────────────────────────

export interface DocumentValidationInput {
  documentType: string
  documentContent: string
  requirements?: string[]
  language?: 'th' | 'en' | 'vi' | 'id'
}

export interface DocumentField {
  name: string
  status: 'present' | 'missing' | 'invalid' | 'unclear'
  value?: string
  issue?: string
}

export interface DocumentValidationResult {
  completeness: number // 0-100
  fields: DocumentField[]
  issues: string[]
  suggestions: string[]
  isValid: boolean
}

// ── Validation ──────────────────────────────────────────────

export function validateDocumentInput(input: DocumentValidationInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.documentType) errors.push('documentType is required')
  if (!input.documentContent || input.documentContent.trim().length < 10) {
    errors.push('documentContent is required (min 10 chars)')
  }

  return { valid: errors.length === 0, errors }
}

export function validateDocumentResult(result: DocumentValidationResult): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (typeof result.completeness !== 'number' || result.completeness < 0 || result.completeness > 100) {
    issues.push(`completeness must be 0-100, got ${result.completeness}`)
  }

  if (!Array.isArray(result.fields)) {
    issues.push('fields must be an array')
  } else {
    for (const field of result.fields) {
      if (!field.name) issues.push('Field missing name')
      if (!['present', 'missing', 'invalid', 'unclear'].includes(field.status)) {
        issues.push(`Invalid field status: ${field.status}`)
      }
    }
  }

  return { valid: issues.length === 0, issues }
}

// ── API ─────────────────────────────────────────────────────

/**
 * Validate a document for completeness and correctness.
 * Returns field-level analysis with issues and suggestions.
 */
export async function validateDocument(input: DocumentValidationInput): Promise<DocumentValidationResult> {
  const validation = validateDocumentInput(input)
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`)
  }

  const result = await invokeFunction<{ data: DocumentValidationResult }>('validate-document', {
    document_type: input.documentType,
    document_content: input.documentContent,
    requirements: input.requirements,
    language: input.language,
  })

  // Validate AI output
  const outputValidation = validateDocumentResult(result.data)
  if (!outputValidation.valid) {
    console.warn('[documentValidatorService] Output validation issues:', outputValidation.issues)
  }

  return result.data
}
