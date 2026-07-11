import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'
import { calculatePayroll, getPayrollStrategy, type PayrollContext } from './countryPayrollStrategy'
// Ensure TH strategy is registered (side-effect import)
import './thailandPayrollStrategy'

export interface PayrollRun {
  id: string
  company_id: string
  cycle_id: string
  status: 'draft' | 'calculating' | 'calculated' | 'approved' | 'paid' | 'rejected'
  total_gross: number
  total_deductions: number
  total_net: number
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface PayrollRunItem {
  id: string
  company_id: string
  run_id: string
  employee_id: string
  base_salary: number
  overtime_pay: number
  bonus: number
  other_earnings: number
  social_security_employee: number
  social_security_employer: number
  Withholding_Tax: number
  other_deductions: number
  net_pay: number
  status: string
  created_at: string
  updated_at: string
}

/**
 * Create a payroll run for a cycle.
 * Populates run items from active employees with valid salary structures.
 * Requires: payroll_write permission.
 */
export async function createRun(cycleId: string): Promise<PayrollRun> {
  const canWrite = await hasPermission('payroll', 'write')
  if (!canWrite) throw new Error('Requires payroll_write permission')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('No company associated with user')
  const companyId = profile.company_id

  // Fetch cycle to validate it's open
  const { data: cycle } = await supabase
    .from('payroll_cycles')
    .select('id, status')
    .eq('id', cycleId)
    .single()

  if (!cycle) throw new Error('Payroll cycle not found')
  if (cycle.status === 'closed') throw new Error('Cannot create run for closed cycle')

  // Create run record
  const { data: run, error: runErr } = await supabase
    .from('payroll_runs')
    .insert({
      company_id: companyId,
      cycle_id: cycleId,
      status: 'draft',
    })
    .select()
    .single()

  if (runErr || !run) throw new Error(`Failed to create payroll run: ${runErr?.message}`)

  // Fetch active employees with current salary structures
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', companyId)
    .eq('employment_status', 'active')

  if (!employees || employees.length === 0) {
    return run as PayrollRun
  }

  const employeeIds = employees.map(e => e.id)

  // Fetch current salary structures for these employees
  const today = new Date().toISOString().split('T')[0]
  const { data: structures } = await supabase
    .from('salary_structures')
    .select('employee_id, base_salary')
    .in('employee_id', employeeIds)
    .eq('company_id', companyId)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)

  // Create run items for employees with valid salary structures
  const items = (structures ?? []).map(s => ({
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

  // Audit
  await supabase.from('payroll_audit_events').insert({
    company_id: companyId,
    run_id: run.id,
    action: 'run.created',
    details: JSON.stringify({ cycle_id: cycleId, employee_count: items.length }),
    created_by: user.id,
  })

  return run as PayrollRun
}

/**
 * Calculate payroll for a run.
 * Applies TH social security and progressive tax.
 * NOTE: Tax calculation uses simplified bracket lookup.
 *       Progressive tax for brackets with NULL rate marked as requires_accounting_review.
 * Requires: payroll_write permission.
 */
export async function calculateRun(runId: string): Promise<PayrollRun> {
  const canWrite = await hasPermission('payroll', 'write')
  if (!canWrite) throw new Error('Requires payroll_write permission')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch run
  const { data: run } = await supabase
    .from('payroll_runs')
    .select('id, company_id, cycle_id, status, total_gross, total_deductions, total_net, approved_by, approved_at, created_at, updated_at')
    .eq('id', runId)
    .single()

  if (!run) throw new Error('Payroll run not found')
  if (run.status === 'approved' || run.status === 'paid') {
    throw new Error('Cannot calculate an approved or paid run')
  }

  // Set calculating
  await supabase
    .from('payroll_runs')
    .update({ status: 'calculating' })
    .eq('id', runId)

  // Fetch run items
  const { data: items } = await supabase
    .from('payroll_run_items')
    .select('id, company_id, run_id, employee_id, base_salary, overtime_pay, bonus, other_earnings, social_security_employee, social_security_employer, "Withholding_Tax", other_deductions, net_pay, status, created_at, updated_at')
    .eq('run_id', runId)

  if (!items || items.length === 0) {
    await supabase
      .from('payroll_runs')
      .update({ status: 'calculated', total_gross: 0, total_deductions: 0, total_net: 0 })
      .eq('id', runId)
    return run as PayrollRun
  }

  // ── Look up company country for strategy selection ──
  const { data: companySettings } = await supabase
    .from('company_settings')
    .select('country')
    .eq('company_id', run.company_id)
    .single()

  const country = (companySettings?.country as string) || 'TH'
  const strategy = getPayrollStrategy(country)
  if (!strategy) {
    throw new Error(`No payroll strategy registered for country: ${country}. Available strategies must be imported.`)
  }

  const currentYear = new Date().getFullYear()
  const payrollContext: PayrollContext = {
    companyId: run.company_id,
    country,
    year: currentYear,
    config: {},
  }

  // ── Allowance gap warning: flag employees with dependents/marital data ──
  const employeeIds = [...new Set(items.map(i => i.employee_id).filter(Boolean))]
  const { data: employeeProfiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, company_id')
    .in('id', employeeIds)

  const employeesNeedingReview: Array<{ employeeId: string; name: string; reason: string }> = []

  if (employeeIds.length > 0) {
    const { data: taxProfiles } = await supabase
      .from('employee_tax_profiles')
      .select('employee_id, marital_status, number_of_dependents, spouse_allowance, child_allowance')
      .in('employee_id', employeeIds)

    if (taxProfiles) {
      for (const profile of taxProfiles) {
        const reasons: string[] = []
        if (profile.marital_status && profile.marital_status !== 'single') {
          reasons.push(`marital_status=${profile.marital_status}`)
        }
        if (profile.number_of_dependents && profile.number_of_dependents > 0) {
          reasons.push(`${profile.number_of_dependents} dependents`)
        }
        if (profile.spouse_allowance && profile.spouse_allowance > 0) {
          reasons.push(`spouse_allowance=${profile.spouse_allowance}`)
        }
        if (profile.child_allowance && profile.child_allowance > 0) {
          reasons.push(`child_allowance=${profile.child_allowance}`)
        }

        if (reasons.length > 0) {
          const emp = employeeProfiles?.find(e => e.id === profile.employee_id)
          employeesNeedingReview.push({
            employeeId: profile.employee_id,
            name: emp?.full_name ?? profile.employee_id,
            reason: reasons.join(', '),
          })
        }
      }
    }
  }

  let totalGross = 0
  let totalDeductions = 0

  for (const item of items) {
    const grossIncome = item.base_salary + item.overtime_pay + item.bonus + item.other_earnings

    // Use country strategy for calculation
    const result = calculatePayroll({
      employee_id: item.employee_id,
      base_salary: item.base_salary,
      overtime_pay: item.overtime_pay,
      bonus: item.bonus,
      other_earnings: item.other_earnings,
      other_deductions: item.other_deductions,
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
      .eq('id', item.id)
  }

  await supabase
    .from('payroll_runs')
    .update({
      status: 'calculated',
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net: totalGross - totalDeductions,
    })
    .eq('id', runId)

  // Audit
  await supabase.from('payroll_audit_events').insert({
    company_id: run.company_id,
    run_id: runId,
    action: 'run.calculated',
    details: JSON.stringify({
      total_gross: totalGross,
      total_deductions: totalDeductions,
      item_count: items.length,
      // Surface allowance gap warnings in audit trail
      employees_needing_review: employeesNeedingReview.length > 0 ? employeesNeedingReview : undefined,
    }),
    created_by: user.id,
  })

  return {
    ...run,
    status: 'calculated',
    total_gross: totalGross,
    total_deductions: totalDeductions,
    total_net: totalGross - totalDeductions,
    // Surface warnings so callers (UI, approval flow) can act on them
    ...(employeesNeedingReview.length > 0 && { employees_needing_review: employeesNeedingReview }),
  } as PayrollRun
}

/**
 * Approve a payroll run.
 * Can only approve runs in 'calculated' status.
 * Requires: payroll_approve permission.
 */
export async function approveRun(runId: string, approvedBy: string): Promise<PayrollRun> {
  const canApprove = await hasPermission('payroll', 'approve')
  if (!canApprove) throw new Error('Requires payroll_approve permission')

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('id, company_id, cycle_id, status, total_gross, total_deductions, total_net, approved_by, approved_at, created_at, updated_at')
    .eq('id', runId)
    .single()

  if (!run) throw new Error('Payroll run not found')
  if (run.status !== 'calculated') {
    throw new Error(`Cannot approve run in status '${run.status}': must be 'calculated'`)
  }

  const { data, error } = await supabase
    .from('payroll_runs')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .select()
    .single()

  if (error) throw new Error(`Failed to approve payroll run: ${error.message}`)

  // Update all items to approved
  await supabase
    .from('payroll_run_items')
    .update({ status: 'approved' })
    .eq('run_id', runId)

  // Audit
  await supabase.from('payroll_audit_events').insert({
    company_id: run.company_id,
    run_id: runId,
    action: 'run.approved',
    details: JSON.stringify({ approved_by: approvedBy }),
    created_by: approvedBy,
  })

  return data as PayrollRun
}

/**
 * Get a payroll run with its items.
 * Requires: payroll_read permission.
 */
export async function getRun(runId: string): Promise<{ run: PayrollRun; items: PayrollRunItem[] }> {
  const canRead = await hasPermission('payroll', 'read')
  if (!canRead) throw new Error('Requires payroll_read permission')

  const { data: run, error: runErr } = await supabase
    .from('payroll_runs')
    .select('id, company_id, cycle_id, status, total_gross, total_deductions, total_net, approved_by, approved_at, created_at, updated_at')
    .eq('id', runId)
    .single()

  if (runErr || !run) throw new Error('Payroll run not found')

  const { data: items } = await supabase
    .from('payroll_run_items')
    .select('id, company_id, run_id, employee_id, base_salary, overtime_pay, bonus, other_earnings, social_security_employee, social_security_employer, "Withholding_Tax", other_deductions, net_pay, status, created_at, updated_at')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })

  return {
    run: run as PayrollRun,
    items: (items ?? []) as PayrollRunItem[],
  }
}
