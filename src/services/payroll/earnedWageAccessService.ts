import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Earned Wage Access (EWA) Service
   Allows employees to draw earned wages before payday.
   
   ⚠️ LEGAL REVIEW REQUIRED BEFORE PRODUCTION USE
   This service may be subject to BOT (Bank of Thailand) regulations
   on financial services. Consult legal counsel before enabling
   for real employees.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

export interface EWABalance {
  id: string
  company_id: string
  employee_id: string
  total_earned: number
  total_withdrawn: number
  available_balance: number
  pay_period_start: string
  pay_period_end: string
  updated_at: string
}

export interface EWAWithdrawal {
  id: string
  company_id: string
  employee_id: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  payment_method: 'promptpay' | 'bank_transfer'
  payment_ref?: string
  created_at: string
  completed_at?: string
}

export interface EWAConfig {
  company_id: string
  enabled: boolean
  max_percentage: number // Max % of earned wages (e.g., 50)
  fee_percentage: number // Fee % per withdrawal (e.g., 1.5)
  min_withdrawal: number // Minimum withdrawal amount
  max_withdrawals_per_period: number // Max withdrawals per pay period
  payment_method: 'promptpay' | 'bank_transfer'
  legal_review_completed: boolean // ⚠️ Must be true before enabling
}

// ── Constants ───────────────────────────────────────────────

const FEE_PERCENTAGE_DEFAULT = 1.5
const MAX_PERCENTAGE_DEFAULT = 50
const MIN_WITHDRAWAL_DEFAULT = 100
const MAX_WITHDRAWALS_DEFAULT = 3

// ── Balance Calculation ─────────────────────────────────────

/**
 * Calculate earned-to-date balance for an employee.
 * Based on elapsed working days in the current pay period.
 */
export async function calculateEWABalance(
  companyId: string,
  employeeId: string
): Promise<EWABalance> {
  // Get EWA config
  const config = await getEWAConfig(companyId)
  if (!config.enabled) {
    throw new Error('EWA is not enabled for this company')
  }

  // ⚠️ Legal check
  if (!config.legal_review_completed) {
    throw new Error('EWA requires legal review before activation. Contact legal counsel.')
  }

  // Get current pay period
  const { data: cycle } = await supabase
    .from('payroll_cycles')
    .select('id, period_start, period_end, status')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('period_start', { ascending: false })
    .limit(1)
    .single()

  if (!cycle) {
    throw new Error('No open payroll period found')
  }

  // Get employee salary
  const today = new Date().toISOString().split('T')[0]
  const { data: salary } = await supabase
    .from('salary_structures')
    .select('base_salary')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .single()

  if (!salary) {
    throw new Error('No salary structure found for employee')
  }

  // Calculate earned amount based on elapsed days
  const periodStart = new Date(cycle.period_start)
  const periodEnd = new Date(cycle.period_end)
  const now = new Date()
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  const progress = Math.min(elapsedDays / totalDays, 1)

  const totalEarned = salary.base_salary * progress

  // Get previous withdrawals in this period
  const { data: withdrawals } = await supabase
    .from('ewa_withdrawals')
    .select('amount')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .gte('created_at', cycle.period_start)
    .lte('created_at', cycle.period_end)
    .in('status', ['completed', 'pending', 'processing'])

  const totalWithdrawn = (withdrawals ?? []).reduce((sum, w) => sum + w.amount, 0)

  // Available = (earned × max_percentage) - withdrawn
  const maxAvailable = totalEarned * (config.max_percentage / 100)
  const availableBalance = Math.max(0, maxAvailable - totalWithdrawn)

  return {
    id: `${companyId}-${employeeId}-${cycle.id}`,
    company_id: companyId,
    employee_id: employeeId,
    total_earned: totalEarned,
    total_withdrawn: totalWithdrawn,
    available_balance: availableBalance,
    pay_period_start: cycle.period_start,
    pay_period_end: cycle.period_end,
    updated_at: new Date().toISOString(),
  }
}

// ── Withdrawal ──────────────────────────────────────────────

/**
 * Process an EWA withdrawal request.
 * Calculates fee, validates limits, creates withdrawal record.
 */
export async function requestWithdrawal(
  companyId: string,
  employeeId: string,
  amount: number
): Promise<EWAWithdrawal> {
  const config = await getEWAConfig(companyId)
  if (!config.enabled) throw new Error('EWA is not enabled')

  // ⚠️ Legal check
  if (!config.legal_review_completed) {
    throw new Error('EWA requires legal review before activation')
  }

  // Validate minimum
  if (amount < config.min_withdrawal) {
    throw new Error(`Minimum withdrawal is ${config.min_withdrawal}`)
  }

  // Check withdrawal count limit
  const { data: cycle } = await supabase
    .from('payroll_cycles')
    .select('id, period_start, period_end')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('period_start', { ascending: false })
    .limit(1)
    .single()

  if (cycle) {
    const { count } = await supabase
      .from('ewa_withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .gte('created_at', cycle.period_start)
      .in('status', ['completed', 'pending', 'processing'])

    if ((count ?? 0) >= config.max_withdrawals_per_period) {
      throw new Error(`Maximum ${config.max_withdrawals_per_period} withdrawals per period`)
    }
  }

  // Check available balance
  const balance = await calculateEWABalance(companyId, employeeId)
  if (amount > balance.available_balance) {
    throw new Error(`Insufficient earned balance. Available: ${balance.available_balance}`)
  }

  // Calculate fee
  const fee = Math.round(amount * (config.fee_percentage / 100) * 100) / 100
  const netAmount = amount - fee

  // Create withdrawal record
  const { data, error } = await supabase
    .from('ewa_withdrawals')
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      amount,
      fee,
      net_amount: netAmount,
      status: 'pending',
      payment_method: config.payment_method,
    })
    .select()
    .single()

  if (error) throw error

  // TODO: Integrate with PromptPay API for actual payment
  // For now, mark as processing (manual payout workflow)
  await supabase
    .from('ewa_withdrawals')
    .update({ status: 'processing' })
    .eq('id', data.id)

  return data as EWAWithdrawal
}

// ── Config Management ───────────────────────────────────────

export async function getEWAConfig(companyId: string): Promise<EWAConfig> {
  const { data } = await supabase
    .from('company_ewa_config')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (!data) {
    // Return defaults
    return {
      company_id: companyId,
      enabled: false,
      max_percentage: MAX_PERCENTAGE_DEFAULT,
      fee_percentage: FEE_PERCENTAGE_DEFAULT,
      min_withdrawal: MIN_WITHDRAWAL_DEFAULT,
      max_withdrawals_per_period: MAX_WITHDRAWALS_DEFAULT,
      payment_method: 'promptpay',
      legal_review_completed: false,
    }
  }

  return data as EWAConfig
}

export async function updateEWAConfig(
  companyId: string,
  updates: Partial<Omit<EWAConfig, 'company_id'>>
): Promise<EWAConfig> {
  const canWrite = await hasPermission('payroll', 'write')
  if (!canWrite) throw new Error('Requires payroll_write permission')

  // ⚠️ Safety: cannot enable without legal review
  if (updates.enabled && !updates.legal_review_completed) {
    throw new Error('Cannot enable EWA without legal review completed')
  }

  const { data, error } = await supabase
    .from('company_ewa_config')
    .upsert({
      company_id: companyId,
      ...updates,
    })
    .select()
    .single()

  if (error) throw error
  return data as EWAConfig
}

// ── Admin Functions ─────────────────────────────────────────

export async function listWithdrawals(
  companyId: string,
  filters?: { status?: string; employee_id?: string }
): Promise<EWAWithdrawal[]> {
  const canRead = await hasPermission('payroll', 'read')
  if (!canRead) throw new Error('Requires payroll_read permission')

  let query = supabase
    .from('ewa_withdrawals')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.employee_id) {
    query = query.eq('employee_id', filters.employee_id)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as EWAWithdrawal[]
}

export async function approveWithdrawal(
  withdrawalId: string,
  companyId: string
): Promise<EWAWithdrawal> {
  const canApprove = await hasPermission('payroll', 'approve')
  if (!canApprove) throw new Error('Requires payroll_approve permission')

  // TODO: Trigger actual PromptPay payout
  const { data, error } = await supabase
    .from('ewa_withdrawals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) throw error
  return data as EWAWithdrawal
}
