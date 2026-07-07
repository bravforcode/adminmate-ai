import { supabase } from '../../lib/supabase'

/* ============================================================
   Configuration Readiness Service — Gate C
   Checks whether a tenant has completed required configuration
   before feature modules can be activated.
   ============================================================ */

export interface ReadinessCheck {
  key: string
  label: string
  required: boolean
  passed: boolean
  message: string
}

export interface ReadinessResult {
  company_id: string
  ready: boolean
  hardBlockers: ReadinessCheck[]
  softBlockers: ReadinessCheck[]
  allChecks: ReadinessCheck[]
}

// ─── Individual Checks ──────────────────────────────────────

async function checkLegalEntity(companyId: string): Promise<ReadinessCheck> {
  const { data, error } = await supabase
    .from('legal_entities')
    .select('id, name, tax_id, registration_number, country_code, status')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return {
      key: 'legal_entity',
      label: 'Legal Entity',
      required: true,
      passed: false,
      message: 'No active legal entity found for this company.',
    }
  }

  const missing: string[] = []
  if (!data.name) missing.push('name')
  if (!data.tax_id) missing.push('tax_id')
  if (!data.registration_number) missing.push('registration_number')
  if (!data.country_code) missing.push('country_code')

  if (missing.length > 0) {
    return {
      key: 'legal_entity',
      label: 'Legal Entity',
      required: true,
      passed: false,
      message: `Legal entity is missing required fields: ${missing.join(', ')}.`,
    }
  }

  return {
    key: 'legal_entity',
    label: 'Legal Entity',
    required: true,
    passed: true,
    message: 'Active legal entity with complete registration details.',
  }
}

async function checkLocaleTimezone(companyId: string): Promise<ReadinessCheck> {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('locale, timezone')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    return {
      key: 'locale_timezone',
      label: 'Locale & Timezone',
      required: true,
      passed: false,
      message: 'Company record not found.',
    }
  }

  if (!company.locale || !company.timezone) {
    return {
      key: 'locale_timezone',
      label: 'Locale & Timezone',
      required: true,
      passed: false,
      message: `Missing ${!company.locale ? 'locale' : ''}${!company.locale && !company.timezone ? ' and ' : ''}${!company.timezone ? 'timezone' : ''}.`,
    }
  }

  return {
    key: 'locale_timezone',
    label: 'Locale & Timezone',
    required: true,
    passed: true,
    message: `Locale "${company.locale}" and timezone "${company.timezone}" configured.`,
  }
}

async function checkRoles(companyId: string): Promise<ReadinessCheck> {
  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('company_id', companyId)
    .limit(100)

  if (error) {
    return {
      key: 'roles',
      label: 'Roles',
      required: true,
      passed: false,
      message: `Failed to query roles: ${error.message}`,
    }
  }

  const roles = data ?? []
  const hasAdmin = roles.some((r: { id: string }) => r.id)

  if (!hasAdmin || roles.length < 1) {
    return {
      key: 'roles',
      label: 'Roles',
      required: true,
      passed: false,
      message: 'No roles configured for this company. At least an admin role is required.',
    }
  }

  return {
    key: 'roles',
    label: 'Roles',
    required: true,
    passed: true,
    message: `${roles.length} role(s) configured.`,
  }
}

async function checkDataRetention(companyId: string): Promise<ReadinessCheck> {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .not('data_retention_days', 'is', null)
    .single()

  if (error || !data) {
    return {
      key: 'data_retention',
      label: 'Data Retention',
      required: true,
      passed: false,
      message: 'Data retention policy is not configured.',
    }
  }

  return {
    key: 'data_retention',
    label: 'Data Retention',
    required: true,
    passed: true,
    message: 'Data retention policy is configured.',
  }
}

async function checkTemplates(companyId: string): Promise<ReadinessCheck> {
  const { count, error } = await supabase
    .from('message_templates')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_active', true)

  if (error) {
    return {
      key: 'templates',
      label: 'Templates',
      required: false,
      passed: false,
      message: `Failed to query templates: ${error.message}`,
    }
  }

  if (!count || count === 0) {
    return {
      key: 'templates',
      label: 'Templates',
      required: false,
      passed: false,
      message: 'No active email/message templates found.',
    }
  }

  return {
    key: 'templates',
    label: 'Templates',
    required: false,
    passed: true,
    message: `${count} active template(s) found.`,
  }
}

async function checkApprovals(companyId: string): Promise<ReadinessCheck> {
  const { data, error } = await supabase
    .from('approval_workflows')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return {
      key: 'approvals',
      label: 'Approvals',
      required: false,
      passed: false,
      message: 'No approval workflow configured.',
    }
  }

  return {
    key: 'approvals',
    label: 'Approvals',
    required: false,
    passed: true,
    message: 'At least one approval workflow is configured.',
  }
}

async function checkProviderConfig(companyId: string): Promise<ReadinessCheck> {
  const { data: provider, error: providerError } = await supabase
    .from('integration_providers')
    .select('id')
    .eq('provider_key', 'email')
    .eq('is_active', true)
    .single()

  if (providerError || !provider) {
    return {
      key: 'provider_config',
      label: 'Provider Config',
      required: false,
      passed: false,
      message: 'No email provider found in system.',
    }
  }

  const { data: config } = await supabase
    .from('integration_configs')
    .select('id')
    .eq('company_id', companyId)
    .eq('provider_id', provider.id)
    .eq('is_enabled', true)
    .maybeSingle()

  if (!config) {
    return {
      key: 'provider_config',
      label: 'Provider Config',
      required: false,
      passed: false,
      message: 'Email provider is not configured or enabled for this company.',
    }
  }

  return {
    key: 'provider_config',
    label: 'Provider Config',
    required: false,
    passed: true,
    message: 'Email provider is configured and enabled.',
  }
}

async function checkPayrollCountryPack(companyId: string): Promise<ReadinessCheck> {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('country')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    return {
      key: 'payroll_country_pack',
      label: 'Payroll Country Pack',
      required: true,
      passed: false,
      message: 'Company record not found.',
    }
  }

  const { data: pack, error: packError } = await supabase
    .from('payroll_country_packs')
    .select('id')
    .eq('company_id', companyId)
    .eq('country_code', company.country)
    .eq('is_active', true)
    .maybeSingle()

  if (packError || !pack) {
    return {
      key: 'payroll_country_pack',
      label: 'Payroll Country Pack',
      required: true,
      passed: false,
      message: `No active payroll country pack for "${company.country}".`,
    }
  }

  return {
    key: 'payroll_country_pack',
    label: 'Payroll Country Pack',
    required: true,
    passed: true,
    message: `Active payroll pack for "${company.country}".`,
  }
}

async function checkBillingEntitlement(companyId: string): Promise<ReadinessCheck> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error || !data) {
    return {
      key: 'billing_entitlement',
      label: 'Billing Entitlement',
      required: true,
      passed: false,
      message: 'No subscription found for this company.',
    }
  }

  if (data.status !== 'active' && data.status !== 'trialing') {
    return {
      key: 'billing_entitlement',
      label: 'Billing Entitlement',
      required: true,
      passed: false,
      message: `Subscription status is "${data.status}". Must be active or trialing.`,
    }
  }

  return {
    key: 'billing_entitlement',
    label: 'Billing Entitlement',
    required: true,
    passed: true,
    message: `Subscription is ${data.status}.`,
  }
}

// ─── Main Readiness Check ───────────────────────────────────

export async function checkConfigurationReadiness(
  companyId: string
): Promise<ReadinessResult> {
  const checks = await Promise.all([
    checkLegalEntity(companyId),
    checkLocaleTimezone(companyId),
    checkRoles(companyId),
    checkDataRetention(companyId),
    checkTemplates(companyId),
    checkApprovals(companyId),
    checkProviderConfig(companyId),
    checkPayrollCountryPack(companyId),
    checkBillingEntitlement(companyId),
  ])

  const hardBlockers = checks.filter((c) => c.required && !c.passed)
  const softBlockers = checks.filter((c) => !c.required && !c.passed)

  return {
    company_id: companyId,
    ready: hardBlockers.length === 0,
    hardBlockers,
    softBlockers,
    allChecks: checks,
  }
}
