import { supabase } from '../../lib/supabase'

/* ============================================================
   JD Builder Service — AI-powered job description generation
   
   Uses Gemini AI via edge function. Multi-language support.
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
  if (!json.success) throw new Error(json.error || 'JD generation failed')
  return json
}

// ── Types ───────────────────────────────────────────────────

export interface JDInput {
  title: string
  department: string
  location?: string
  employmentType?: string
  experienceLevel?: string
  country?: string
  language?: 'th' | 'en' | 'vi' | 'id'
}

export interface JDResult {
  title: string
  title_en: string
  description: string
  description_th: string
  responsibilities: string[]
  requirements: string[]
  nice_to_have: string[]
  skills_required: string[]
  salary_suggestion: { min: number; max: number }
}

// ── Validation ──────────────────────────────────────────────

export function validateJDInput(input: JDInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.title || typeof input.title !== 'string') {
    errors.push('title is required')
  } else if (input.title.length > 200) {
    errors.push('title must be 200 characters or less')
  }

  if (!input.department || typeof input.department !== 'string') {
    errors.push('department is required')
  } else if (input.department.length > 100) {
    errors.push('department must be 100 characters or less')
  }

  if (input.language && !['th', 'en', 'vi', 'id'].includes(input.language)) {
    errors.push('language must be one of: th, en, vi, id')
  }

  return { valid: errors.length === 0, errors }
}

export function validateJDResult(result: JDResult): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!result.title) issues.push('Missing title')
  if (!result.description) issues.push('Missing description')
  if (!result.responsibilities?.length) issues.push('Missing responsibilities')
  if (!result.requirements?.length) issues.push('Missing requirements')
  if (!result.skills_required?.length) issues.push('Missing skills_required')

  // Check for injection patterns in output
  const allText = JSON.stringify(result).toLowerCase()
  const injectionPatterns = ['ignore previous', 'system prompt', 'you are now', 'dan mode']
  for (const pattern of injectionPatterns) {
    if (allText.includes(pattern)) {
      issues.push(`Possible prompt injection in output: "${pattern}"`)
    }
  }

  return { valid: issues.length === 0, issues }
}

// ── API ─────────────────────────────────────────────────────

/**
 * Generate a job description using AI.
 * Returns structured JD with responsibilities, requirements, skills.
 */
export async function generateJD(input: JDInput): Promise<JDResult> {
  const validation = validateJDInput(input)
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`)
  }

  const result = await invokeFunction<{ data: JDResult }>('generate-jd', {
    title: input.title,
    department: input.department,
    location: input.location,
    employmentType: input.employmentType,
    experienceLevel: input.experienceLevel,
    country: input.country,
    language: input.language,
  })

  // Validate AI output
  const outputValidation = validateJDResult(result.data)
  if (!outputValidation.valid) {
    console.warn('[jdBuilderService] Output validation issues:', outputValidation.issues)
  }

  return result.data
}
