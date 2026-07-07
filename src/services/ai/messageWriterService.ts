import { supabase } from '../../lib/supabase'

/* ============================================================
   Message Writer Service — AI-powered HR message generation
   
   Uses Gemini AI via edge function.
   Multi-language, professional tone.
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
  if (!json.success) throw new Error(json.error || 'Message generation failed')
  return json
}

// ── Types ───────────────────────────────────────────────────

export type MessageType =
  | 'interview_invitation'
  | 'rejection'
  | 'offer_congratulations'
  | 'follow_up'
  | 'document_request'
  | 'onboarding_welcome'
  | 'custom'

export interface MessageWriterInput {
  type: MessageType
  candidateName: string
  jobTitle: string
  companyName: string
  language?: 'th' | 'en' | 'vi' | 'id'
  additionalContext?: string
  tone?: 'formal' | 'friendly' | 'neutral'
}

export interface MessageWriterResult {
  subject: string
  body: string
  language: string
  tone: string
}

// ── Validation ──────────────────────────────────────────────

export function validateMessageInput(input: MessageWriterInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.type) errors.push('type is required')
  if (!input.candidateName) errors.push('candidateName is required')
  if (!input.jobTitle) errors.push('jobTitle is required')
  if (!input.companyName) errors.push('companyName is required')

  const validTypes: MessageType[] = [
    'interview_invitation', 'rejection', 'offer_congratulations',
    'follow_up', 'document_request', 'onboarding_welcome', 'custom',
  ]
  if (input.type && !validTypes.includes(input.type)) {
    errors.push(`Invalid type: ${input.type}`)
  }

  return { valid: errors.length === 0, errors }
}

export function validateMessageResult(result: MessageWriterResult): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!result.subject || result.subject.trim().length === 0) {
    issues.push('Missing subject')
  }
  if (!result.body || result.body.trim().length === 0) {
    issues.push('Missing body')
  }

  // Check for injection patterns
  const allText = JSON.stringify(result).toLowerCase()
  const injectionPatterns = ['ignore previous', 'system prompt', 'you are now']
  for (const pattern of injectionPatterns) {
    if (allText.includes(pattern)) {
      issues.push(`Possible prompt injection in output: "${pattern}"`)
    }
  }

  return { valid: issues.length === 0, issues }
}

// ── API ─────────────────────────────────────────────────────

/**
 * Generate a professional HR message.
 * Returns subject and body in the requested language.
 */
export async function generateMessage(input: MessageWriterInput): Promise<MessageWriterResult> {
  const validation = validateMessageInput(input)
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`)
  }

  const result = await invokeFunction<{ data: MessageWriterResult }>('generate-message', {
    type: input.type,
    candidate_name: input.candidateName,
    job_title: input.jobTitle,
    company_name: input.companyName,
    language: input.language,
    additional_context: input.additionalContext,
    tone: input.tone,
  })

  // Validate AI output
  const outputValidation = validateMessageResult(result.data)
  if (!outputValidation.valid) {
    console.warn('[messageWriterService] Output validation issues:', outputValidation.issues)
  }

  return result.data
}
