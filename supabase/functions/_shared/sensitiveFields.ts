/* ============================================================
   Server-side sensitive field exclusion for AI functions.
   Used inside Supabase Edge Functions (Deno).
   ============================================================ */

// Hardcoded fallback — must match sensitive_field_registry seed data.
// Edge functions cannot call RPC at runtime for this; the list is stable.
const FALLBACK_SENSITIVE_FIELDS = [
  'age', 'gender', 'religion', 'race', 'marital_status',
  'nationality', 'disability', 'pregnancy', 'photo',
  'health_data', 'dependent_health_data', 'immigration_status',
  'union_status', 'salary_history',
]

/**
 * Remove sensitive fields from candidate/application data
 * before sending to AI provider.
 * Returns sanitized data + list of excluded fields.
 */
export function excludeSensitiveFieldsForAI(
  data: Record<string, unknown>,
  sensitiveFields: string[] = FALLBACK_SENSITIVE_FIELDS
): { sanitized: Record<string, unknown>; excluded: string[] } {
  const sanitized = { ...data }
  const excluded: string[] = []

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field]
      excluded.push(field)
    }
  }

  return { sanitized, excluded }
}

/**
 * Validate that no sensitive fields leaked into scoring input.
 * Returns true if clean, throws if sensitive data found.
 */
export function validateNoSensitiveFields(
  data: Record<string, unknown>,
  sensitiveFields: string[] = FALLBACK_SENSITIVE_FIELDS
): void {
  for (const field of sensitiveFields) {
    if (field in data && data[field] !== null && data[field] !== undefined) {
      throw new Error(
        `SENSITIVE FIELD VIOLATION: "${field}" must not be included in AI scoring input. ` +
        `This field was found in the payload. Remove it before calling AI.`
      )
    }
  }
}

/**
 * Build a sanitized candidate payload for AI scoring.
 * Extracts only job-relevant, non-sensitive fields.
 */
export function buildCandidatePayloadForAI(candidate: Record<string, unknown>): Record<string, unknown> {
  // Only include fields relevant to job evaluation
  const allowedFields = [
    'full_name', 'email', 'phone', 'location',
    'current_position', 'experience_years', 'skills',
    'linkedin_url', 'portfolio_url', 'preferred_language',
    // CV-derived fields
    'summary', 'work_experience', 'education',
    'skills_extracted', 'languages', 'certifications',
    // Application fields
    'cover_letter', 'recruiter_notes',
  ]

  const payload: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (candidate[field] !== undefined && candidate[field] !== null) {
      payload[field] = candidate[field]
    }
  }

  // Always run exclusion even on allowed list (defense in depth)
  const { sanitized, excluded } = excludeSensitiveFieldsForAI(payload)
  return sanitized
}
