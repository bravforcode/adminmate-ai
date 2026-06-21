import { supabase } from '../../lib/supabase'

/**
 * Enhanced feature flag service.
 * Supports: global, tenant, plan, country, beta, kill-switch flags.
 * Evaluation order: kill_switch -> plan -> country -> tenant -> beta -> global
 */

interface FeatureFlagResult {
  enabled: boolean
  flagType: string
  evaluationPath: string
}

interface BulkFlagResult {
  featureKey: string
  enabled: boolean
  flagType: string
}

let flagCache: Record<string, boolean> = {}
const CACHE_TTL_MS = 60_000
let cacheTimestamps: Record<string, number> = {}

function getCached(cacheKey: string): boolean | null {
  const ts = cacheTimestamps[cacheKey]
  if (ts && Date.now() - ts < CACHE_TTL_MS) {
    return flagCache[cacheKey] ?? null
  }
  delete flagCache[cacheKey]
  delete cacheTimestamps[cacheKey]
  return null
}

function setCache(cacheKey: string, value: boolean): void {
  flagCache[cacheKey] = value
  cacheTimestamps[cacheKey] = Date.now()
}

export function clearFlagCache(): void {
  flagCache = {}
  cacheTimestamps = {}
}

/**
 * Check if a feature is enabled for a given company.
 * Falls back to global default if no company context.
 */
export async function isFeatureEnabled(
  featureKey: string,
  companyId?: string,
  planSlug?: string,
  countryCode?: string
): Promise<boolean> {
  const cacheKey = `${featureKey}:${companyId ?? 'global'}:${planSlug ?? ''}:${countryCode ?? ''}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  const { data, error } = await supabase.rpc('is_feature_enabled', {
    p_feature_key: featureKey,
    p_company_id: companyId ?? null,
    p_plan_slug: planSlug ?? null,
    p_country_code: countryCode ?? null,
  })

  if (error) {
    console.error('Feature flag check failed:', error.message)
    return false
  }

  const result = data === true
  setCache(cacheKey, result)
  return result
}

/**
 * Check a kill switch specifically. Returns true if the kill switch is active (feature OFF).
 */
export async function isKillSwitchActive(featureKey: string): Promise<boolean> {
  const cacheKey = `kill:${featureKey}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  const { data, error } = await supabase
    .from('feature_flags')
    .select('is_kill_switch')
    .eq('key', featureKey)
    .eq('is_kill_switch', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('Kill switch check failed:', error.message)
    return false
  }

  const result = data !== null
  setCache(cacheKey, result)
  return result
}

/**
 * Evaluate all flags for a company in a single call.
 * Useful for bootstrapping the frontend flag state.
 */
export async function evaluateCompanyFlags(
  companyId: string,
  planSlug?: string,
  countryCode?: string
): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.rpc('evaluate_company_flags', {
    p_company_id: companyId,
    p_plan_slug: planSlug ?? null,
    p_country_code: countryCode ?? null,
  })

  if (error) {
    console.error('Bulk flag evaluation failed:', error.message)
    return {}
  }

  const flags: Record<string, boolean> = {}
  if (Array.isArray(data)) {
    for (const row of data as BulkFlagResult[]) {
      flags[row.feature_key] = row.enabled
      setCache(`${row.feature_key}:${companyId}`, row.enabled)
    }
  }
  return flags
}

/**
 * Check if a company is enrolled in a beta feature.
 */
export async function isBetaEnrolled(featureKey: string, companyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('beta_enrollments')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .eq('feature_flag_id',
      supabase.from('feature_flags').select('id').eq('key', featureKey).single()
    )

  if (error) {
    console.error('Beta enrollment check failed:', error.message)
    return false
  }

  return data !== null && data.length > 0
}

/**
 * Enroll a company in a beta feature.
 */
export async function enrollBeta(
  featureKey: string,
  companyId: string,
  expiresAt?: string
): Promise<boolean> {
  const { data: flag, error: flagError } = await supabase
    .from('feature_flags')
    .select('id')
    .eq('key', featureKey)
    .eq('flag_type', 'beta')
    .single()

  if (flagError || !flag) {
    console.error('Beta flag not found:', featureKey)
    return false
  }

  const { error } = await supabase
    .from('beta_enrollments')
    .upsert({
      company_id: companyId,
      feature_flag_id: flag.id,
      enrolled_at: new Date().toISOString(),
      expires_at: expiresAt ?? null,
      status: 'active',
    }, { onConflict: 'company_id,feature_flag_id' })

  if (error) {
    console.error('Beta enrollment failed:', error.message)
    return false
  }

  clearFlagCache()
  return true
}

/**
 * Revoke a company's beta enrollment.
 */
export async function revokeBeta(featureKey: string, companyId: string): Promise<boolean> {
  const { data: flag, error: flagError } = await supabase
    .from('feature_flags')
    .select('id')
    .eq('key', featureKey)
    .single()

  if (flagError || !flag) return false

  const { error } = await supabase
    .from('beta_enrollments')
    .update({ status: 'revoked' })
    .eq('company_id', companyId)
    .eq('feature_flag_id', flag.id)

  if (error) {
    console.error('Beta revocation failed:', error.message)
    return false
  }

  clearFlagCache()
  return true
}

/**
 * Activate or deactivate a kill switch.
 */
export async function setKillSwitch(featureKey: string, activate: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('activate_kill_switch', {
    p_feature_key: featureKey,
    p_activate: activate,
  })

  if (error) {
    console.error('Kill switch toggle failed:', error.message)
    return false
  }

  clearFlagCache()
  return true
}
