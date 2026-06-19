import { supabase } from '../lib/supabase'

/**
 * Feature flag service.
 * Checks both global defaults and org-level overrides.
 */

let flagCache: Record<string, boolean> = {}

export async function isFeatureEnabled(featureKey: string, orgId?: string): Promise<boolean> {
  const cacheKey = `${featureKey}:${orgId ?? 'global'}`
  if (cacheKey in flagCache) return flagCache[cacheKey]

  const { data, error } = await supabase.rpc('is_feature_enabled', {
    p_feature_key: featureKey,
    p_org_id: orgId ?? null,
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
