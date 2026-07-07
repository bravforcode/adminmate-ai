import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

/**
 * Client-side helper for sensitive field exclusion.
 * AI/scoring services must use this before processing candidate data.
 */

let cachedFields: string[] = []
let cacheTimestamp = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function getSensitiveFieldNames(): Promise<string[]> {
  if (cachedFields.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedFields
  }
  const { data, error } = await supabase.rpc('get_sensitive_field_names', {})
  if (error) {
    logger.error('Failed to fetch sensitive fields', { error: error.message })
    return []
  }
  cachedFields = data ?? []
  cacheTimestamp = Date.now()
  return cachedFields
}

export async function isSensitiveField(fieldName: string): Promise<boolean> {
  const fields = await getSensitiveFieldNames()
  return fields.includes(fieldName)
}

/**
 * Remove sensitive fields from an object before AI scoring.
 * Returns a new object with sensitive fields excluded.
 */
export async function excludeSensitiveFields<T extends Record<string, unknown>>(
  data: T
): Promise<Partial<T>> {
  const fields = await getSensitiveFieldNames()
  const result = { ...data }
  for (const field of fields) {
    delete result[field]
  }
  return result
}

/**
 * Synchronous check against cached list.
 * Must call getSensitiveFieldNames() first to populate cache.
 */
export function isSensitiveFieldSync(fieldName: string): boolean {
  return cachedFields?.includes(fieldName) ?? false
}
