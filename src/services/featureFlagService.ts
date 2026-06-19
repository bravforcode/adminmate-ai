import { supabase } from '../lib/supabase'

/**
 * Feature flag service.
 * Checks both global defaults and company-level overrides.
 */

let flagCache: Record<string, boolean> = {}

export async function isFeatureEnabled(featureKey: string, companyId?: string): Promise<boolean> {
  const cacheKey = `${featureKey}:${companyId ?? 'global'}`
  if (cacheKey in flagCache) return flagCache[cacheKey]

  const { data, error } = await supabase.rpc('is_feature_enabled', {
    p_feature_key: featureKey,
    p_company_id: companyId ?? null,
  })
  if (error) {
    console.error('Feature flag check failed:', error.message)
    return false
  }
  flagCache[cacheKey] = data === true
  return flagCache[cacheKey]
}

export function clearFlagCache(): void {
  flagCache = {}
}
