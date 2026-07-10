import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'
import { getAvailableCountries, calculatePayroll, type PayrollContext } from './countryPayrollStrategy'
// Ensure all strategies are registered
import './thailandPayrollStrategy'
import './indonesiaPayrollStrategy'
import './vietnamPayrollStrategy'

/* ============================================================
   Unified Multi-Country Payroll Service
   Single interface to run payroll across TH + VN + ID.
   Uses strategy pattern for country-specific calculations.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

export interface UnifiedPayrollRun {
  id: string
  company_id: string
  country: string
  country_name: string
  cycle_id: string
  status: string
  employee_count: number
  total_gross: number
  total_deductions: number
  total_net: number
  created_at: string
}

export interface CountryPayrollSummary {
  country: string
  country_name: string
  employee_count: number
  total_gross: number
  total_deductions: number
  total_net: number
  status: string
}

export interface UnifiedPayrollDashboard {
  total_countries: number
  total_employees: number
  total_gross: number
  total_deductions: number
  total_net: number
  by_country: CountryPayrollSummary[]
  runs: UnifiedPayrollRun[]
}

// ── Dashboard ───────────────────────────────────────────────

/**
 * Get unified payroll dashboard across all countries.
 * Shows summary by country + combined totals.
 */
export async function getUnifiedPayrollDashboard(
  companyId: string
): Promise<UnifiedPayrollDashboard> {
  const canRead = await hasPermission('payroll', 'read')
  if (!canRead) throw new Error('Requires payroll_read permission')

  // Get all payroll runs for the company
  const { data: runs } = await supabase
    .from('payroll_runs')
    .select(`
      id, company_id, cycle_id, status, total_gross, total_deductions, total_net, created_at,
      payroll_cycles(period_start, period_end),
      company_settings(country)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50)

  const runsArray = (runs ?? []) as unknown as Array<{
    id: string
    company_id: string
    cycle_id: string
    status: string
    total_gross: number
    total_deductions: number
    total_net: number
    created_at: string
    company_settings: { country: string } | null
  }>

  // Get available countries
  const countries = getAvailableCountries()

  // Group runs by country
  const countryMap = new Map<string, CountryPayrollSummary>()

  for (const country of countries) {
    countryMap.set(country.code, {
      country: country.code,
      country_name: country.name,
      employee_count: 0,
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
      status: 'no_runs',
    })
  }

  for (const run of runsArray) {
    const country = run.company_settings?.country || 'TH'
    const summary = countryMap.get(country)
    if (summary) {
      summary.total_gross += run.total_gross || 0
      summary.total_deductions += run.total_deductions || 0
      summary.total_net += run.total_net || 0
      if (summary.status === 'no_runs') summary.status = run.status
    }
  }

  // Get employee counts per country
  for (const [countryCode, summary] of countryMap) {
    const { count } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('country', countryCode)
      .eq('employment_status', 'active')

    summary.employee_count = count ?? 0
  }

  const byCountry = Array.from(countryMap.values()).filter(c => c.employee_count > 0)

  return {
    total_countries: byCountry.length,
    total_employees: byCountry.reduce((sum, c) => sum + c.employee_count, 0),
    total_gross: byCountry.reduce((sum, c) => sum + c.total_gross, 0),
    total_deductions: byCountry.reduce((sum, c) => sum + c.total_deductions, 0),
    total_net: byCountry.reduce((sum, c) => sum + c.total_net, 0),
    by_country: byCountry,
    runs: runsArray.map(r => ({
      ...r,
      country: r.company_settings?.country || 'TH',
      country_name: countries.find(c => c.code === (r.company_settings?.country || 'TH'))?.name || 'Unknown',
      employee_count: 0,
    })),
  }
}

// ── Multi-Country Run ───────────────────────────────────────

/**
 * Create payroll runs for all active countries in a company.
 * Returns one run per country.
 */
export async function createMultiCountryRuns(
  companyId: string,
  cycleId: string
): Promise<UnifiedPayrollRun[]> {
  const canWrite = await hasPermission('payroll', 'write')
  if (!canWrite) throw new Error('Requires payroll_write permission')

  // Get employees grouped by country
  const { data: employees } = await supabase
    .from('employees')
    .select('id, country')
    .eq('company_id', companyId)
    .eq('employment_status', 'active')

  if (!employees || employees.length === 0) {
    return []
  }

  // Group by country
  const countryGroups = new Map<string, string[]>()
  for (const emp of employees) {
    const country = (emp as { id: string; country: string }).country || 'TH'
    const group = countryGroups.get(country) || []
    group.push((emp as { id: string; country: string }).id)
    countryGroups.set(country, group)
  }

  const runs: UnifiedPayrollRun[] = []
  const countries = getAvailableCountries()

  for (const [countryCode, employeeIds] of countryGroups) {
    // Verify strategy exists for this country
    const strategy = countries.find(c => c.code === countryCode)
    if (!strategy) {
      console.warn(`No payroll strategy for country: ${countryCode}, skipping`)
      continue
    }

    // Create run for this country
    const { data: run, error } = await supabase
      .from('payroll_runs')
      .insert({
        company_id: companyId,
        cycle_id: cycleId,
        status: 'draft',
        metadata: { country: countryCode },
      })
      .select()
      .single()

    if (error) throw error

    // Get salary structures for these employees
    const today = new Date().toISOString().split('T')[0]
    const { data: structures } = await supabase
      .from('salary_structures')
      .select('employee_id, base_salary')
      .in('employee_id', employeeIds)
      .eq('company_id', companyId)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)

    // Create run items
    const items = (structures ?? []).map((s: { employee_id: string; base_salary: number }) => ({
      company_id: companyId,
      run_id: run.id,
      employee_id: s.employee_id,
      base_salary: s.base_salary,
      overtime_pay: 0,
      bonus: 0,
      other_earnings: 0,
      social_security_employee: 0,
      social_security_employer: 0,
      Withholding_Tax: 0,
      other_deductions: 0,
      net_pay: 0,
      status: 'draft',
    }))

    if (items.length > 0) {
      await supabase.from('payroll_run_items').insert(items)
    }

    runs.push({
      ...run,
      country: countryCode,
      country_name: strategy.name,
      employee_count: items.length,
    } as UnifiedPayrollRun)
  }

  return runs
}

/**
 * Calculate all country runs for a cycle.
 * Uses strategy pattern to apply country-specific calculations.
 */
export async function calculateAllCountryRuns(
  companyId: string,
  cycleId: string
): Promise<void> {
  const canWrite = await hasPermission('payroll', 'write')
  if (!canWrite) throw new Error('Requires payroll_write permission')

  // Get all runs for this cycle
  const { data: runs } = await supabase
    .from('payroll_runs')
    .select('id, metadata')
    .eq('company_id', companyId)
    .eq('cycle_id', cycleId)
    .in('status', ['draft', 'calculating'])

  if (!runs || runs.length === 0) return

  for (const run of runs) {
    const metadata = (run as { id: string; metadata: Record<string, unknown> }).metadata
    const country = (metadata?.country as string) || 'TH'

    // Calculate using strategy
    const payrollContext: PayrollContext = {
      companyId,
      country,
      year: new Date().getFullYear(),
      config: {},
    }

    // Get run items
    const { data: items } = await supabase
      .from('payroll_run_items')
      .select('*')
      .eq('run_id', run.id)

    if (!items || items.length === 0) continue

    let totalGross = 0
    let totalDeductions = 0

    for (const item of items) {
      const grossIncome = (item as { base_salary: number; overtime_pay: number; bonus: number; other_earnings: number }).base_salary
        + (item as { overtime_pay: number }).overtime_pay
        + (item as { bonus: number }).bonus
        + (item as { other_earnings: number }).other_earnings

      const result = calculatePayroll({
        employee_id: (item as { employee_id: string }).employee_id,
        base_salary: (item as { base_salary: number }).base_salary,
        overtime_pay: (item as { overtime_pay: number }).overtime_pay,
        bonus: (item as { bonus: number }).bonus,
        other_earnings: (item as { other_earnings: number }).other_earnings,
        other_deductions: (item as { other_deductions: number }).other_deductions,
      }, payrollContext)

      totalGross += grossIncome
      totalDeductions += result.total_deductions

      await supabase
        .from('payroll_run_items')
        .update({
          social_security_employee: result.social_security_employee,
          social_security_employer: result.social_security_employer,
          Withholding_Tax: result.withholding_tax,
          net_pay: result.net_pay,
          status: 'calculated',
        })
        .eq('id', (item as { id: string }).id)
    }

    await supabase
      .from('payroll_runs')
      .update({
        status: 'calculated',
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalGross - totalDeductions,
      })
      .eq('id', run.id)
  }
}
