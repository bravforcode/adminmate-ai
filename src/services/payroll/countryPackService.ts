import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'

/* ============================================================
   Country Pack Service — Global Payroll Framework
   Pack lookup, rule versioning, exchange rate snapshots.
   ============================================================ */

export interface CountryPack {
  id: string
  company_id: string
  country_code: string
  pack_name: string
  version: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RuleSet {
  id: string
  country_pack_id: string
  rule_key: string
  rule_name: string
  description: string | null
  created_at: string
}

export interface RuleVersion {
  id: string
  rule_set_id: string
  version_number: string
  effective_from: string
  effective_to: string | null
  rule_config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface ExchangeRateSnapshot {
  id: string
  company_id: string
  source_currency: string
  target_currency: string
  rate: number
  snapshot_date: string
  created_at: string
}

export interface EmployeeTaxProfile {
  id: string
  company_id: string
  employee_id: string
  country_code: string
  tax_id: string | null
  filing_status: string | null
  deductions_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

/* ----------------------------------------------------------
   Stub pack countries — any pack in this list but NOT having
   full rule_config must NOT produce a fake calculation.
   The server MUST block payroll for incomplete packs.
   ---------------------------------------------------------- */
export const STUB_COUNTRY_CODES = ['SG', 'VN', 'ID', 'MY', 'PH', 'JP']

/**
 * Fetch the active country pack for a given country code.
 * Returns null if no pack exists (caller should block payroll).
 */
export async function getActivePack(
  countryCode: string
): Promise<CountryPack | null> {
  const { data, error } = await supabase
    .from('payroll_country_packs')
    .select('*')
    .eq('country_code', countryCode)
    .eq('is_active', true)
    .single()

  if (error) {
    logger.error('Failed to fetch active country pack', { error: error.message })
    return null
  }
  if (!data) return null
  return data as CountryPack
}

/**
 * Check whether a country pack is a stub (not fully implemented).
 * Stubs must NOT be used for actual payroll calculation.
 */
export function isStubPack(countryCode: string): boolean {
  return STUB_COUNTRY_CODES.includes(countryCode)
}

/**
 * Get the effective rule version for a given rule set at a specific date.
 * Returns the version with matching effective_from <= date < effective_to.
 */
export async function getRuleVersion(
  ruleSetId: string,
  effectiveDate: string
): Promise<RuleVersion | null> {
  const { data, error } = await supabase
    .from('payroll_rule_versions')
    .select('*')
    .eq('rule_set_id', ruleSetId)
    .eq('is_active', true)
    .lte('effective_from', effectiveDate)
    .or(`effective_to.is.null,effective_to.gte.${effectiveDate}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    logger.error('Failed to fetch rule version', { error: error.message })
    return null
  }
  if (!data) return null
  return data as RuleVersion
}

/**
 * Snapshot an exchange rate for later payroll use.
 * Upserts by company + currency pair + date.
 */
export async function snapshotExchangeRate(
  companyId: string,
  sourceCurrency: string,
  targetCurrency: string,
  rate: number,
  snapshotDate: string = new Date().toISOString().slice(0, 10)
): Promise<ExchangeRateSnapshot> {
  const { data, error } = await supabase
    .from('exchange_rate_snapshots')
    .upsert(
      {
        company_id: companyId,
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
        rate,
        snapshot_date: snapshotDate,
      },
      { onConflict: 'company_id,source_currency,target_currency,snapshot_date' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to snapshot exchange rate: ${error.message}`)
  return data as ExchangeRateSnapshot
}

/**
 * Fetch all rule sets for a given country pack.
 */
export async function getRuleSetsForPack(
  countryPackId: string
): Promise<RuleSet[]> {
  const { data, error } = await supabase
    .from('payroll_rule_sets')
    .select('*')
    .eq('country_pack_id', countryPackId)
    .order('rule_key')

  if (error) throw new Error(`Failed to fetch rule sets: ${error.message}`)
  return (data ?? []) as RuleSet[]
}

/**
 * Get employee tax profile.
 */
export async function getEmployeeTaxProfile(
  companyId: string,
  employeeId: string
): Promise<EmployeeTaxProfile | null> {
  const { data, error } = await supabase
    .from('employee_tax_profiles')
    .select('*')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .single()

  if (error) {
    logger.error('Failed to fetch employee tax profile', { error: error.message })
    return null
  }
  if (!data) return null
  return data as EmployeeTaxProfile
}
