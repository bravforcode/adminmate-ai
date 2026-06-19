import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

export interface PayrollCycle {
  id: string
  company_id: string
  name: string
  period_start: string
  period_end: string
  status: 'draft' | 'active' | 'closed'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateCycleInput {
  name: string
  period_start: string
  period_end: string
}

/**
 * Create a new payroll cycle.
 * Requires: payroll_write permission.
 */
export async function createCycle(input: CreateCycleInput): Promise<PayrollCycle> {
  const canWrite = await hasPermission('payroll', 'write')
  if (!canWrite) throw new Error('Requires payroll_write permission')

  // Resolve company_id from auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('No company associated with user')

  const companyId = profile.company_id

  if (new Date(input.period_end) < new Date(input.period_start)) {
    throw new Error('period_end must be >= period_start')
  }

  const { data, error } = await supabase
    .from('payroll_cycles')
    .insert({
      company_id: companyId,
      name: input.name,
      period_start: input.period_start,
      period_end: input.period_end,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create payroll cycle: ${error.message}`)
  return data as PayrollCycle
}

/**
 * List payroll cycles for a company.
 * Requires: payroll_read permission.
 */
export async function getCycles(companyId: string): Promise<PayrollCycle[]> {
  const canRead = await hasPermission('payroll', 'read')
  if (!canRead) throw new Error('Requires payroll_read permission')

  const { data, error } = await supabase
    .from('payroll_cycles')
    .select('*')
    .eq('company_id', companyId)
    .order('period_start', { ascending: false })

  if (error) throw new Error(`Failed to fetch payroll cycles: ${error.message}`)
  return (data ?? []) as PayrollCycle[]
}

/**
 * Close a payroll cycle (sets status to 'closed').
 * Cannot close if already closed. Cannot close if any run is in 'draft' or 'calculating' status.
 * Requires: payroll_approve permission.
 */
export async function closeCycle(cycleId: string): Promise<PayrollCycle> {
  const canApprove = await hasPermission('payroll', 'approve')
  if (!canApprove) throw new Error('Requires payroll_approve permission')

  // Fetch current cycle
  const { data: cycle, error: fetchErr } = await supabase
    .from('payroll_cycles')
    .select('id, status, company_id')
    .eq('id', cycleId)
    .single()

  if (fetchErr || !cycle) throw new Error('Payroll cycle not found')

  if (cycle.status === 'closed') {
    throw new Error('Payroll cycle is already closed')
  }

  // Check no runs are in draft/calculating
  const { data: activeRuns } = await supabase
    .from('payroll_runs')
    .select('id')
    .eq('cycle_id', cycleId)
    .in('status', ['draft', 'calculating'])

  if (activeRuns && activeRuns.length > 0) {
    throw new Error('Cannot close cycle: contains runs in draft or calculating status')
  }

  const { data, error } = await supabase
    .from('payroll_cycles')
    .update({ status: 'closed' })
    .eq('id', cycleId)
    .select()
    .single()

  if (error) throw new Error(`Failed to close payroll cycle: ${error.message}`)

  // Audit event
  await supabase.from('payroll_audit_events').insert({
    company_id: cycle.company_id,
    action: 'cycle.closed',
    details: JSON.stringify({ cycle_id: cycleId }),
  })

  return data as PayrollCycle
}
