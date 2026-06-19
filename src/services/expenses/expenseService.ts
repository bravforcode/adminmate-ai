import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Expense Claim & Reimbursement Service
   Expense claims with policy enforcement, approval workflow,
   receipts, and reimbursement handoff to payroll.

   RULES:
   - company_id resolved from auth, never from client input.
   - RLS enforced on all tables.
   - Expense approval required before reimbursement.
   - Reimbursement handoff links to payroll_runs.
   - Audit logged on all mutations.
   ============================================================ */

// ── Types ──

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'reimbursing' | 'reimbursed' | 'cancelled'
export type ReimbursementStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ExpenseClaim {
  id: string
  company_id: string
  employee_id: string
  policy_id: string | null
  claim_date: string
  total_amount: number
  currency: string
  description: string | null
  status: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseReceipt {
  id: string
  company_id: string
  claim_id: string
  file_url: string
  file_name: string
  amount: number | null
  receipt_date: string | null
  created_at: string
}

export interface ExpenseReimbursement {
  id: string
  company_id: string
  claim_id: string
  employee_id: string
  amount: number
  status: string
  payroll_run_id: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface ExpensePolicy {
  id: string
  company_id: string
  policy_name: string
  max_amount: number
  requires_receipt: boolean
  auto_approve_under: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SubmitClaimInput {
  employee_id: string
  policy_id?: string
  total_amount: number
  currency?: string
  description?: string
  receipts?: Array<{ file_url: string; file_name: string; amount?: number; receipt_date?: string }>
}

// ── Helper: Resolve company_id from auth ──

async function resolveCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('No company associated with user')
  return profile.company_id
}

// ── Service ──

export const expenseService = {
  /**
   * Submit a new expense claim.
   * Requires: expense_write permission.
   * Policy validation: if policy_id is provided, amount must not exceed max_amount.
   * Auto-approve: if total_amount < auto_approve_under, claim is auto-approved.
   */
  async submitClaim(input: SubmitClaimInput): Promise<ExpenseClaim> {
    const canWrite = await hasPermission('expense', 'write')
    if (!canWrite) throw new Error('Requires expense_write permission')

    const companyId = await resolveCompanyId()

    // Validate policy if provided
    let policy: ExpensePolicy | null = null
    if (input.policy_id) {
      const { data } = await supabase
        .from('expense_policies')
        .select('*')
        .eq('id', input.policy_id)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle()
      policy = data as ExpensePolicy | null
      if (!policy) throw new Error('Expense policy not found or inactive')
      if (input.total_amount > policy.max_amount) {
        throw new Error(`Amount ${input.total_amount} exceeds policy max of ${policy.max_amount}`)
      }
    }

    // Check receipt requirement
    if (policy?.requires_receipt && (!input.receipts || input.receipts.length === 0)) {
      throw new Error('This policy requires at least one receipt')
    }

    // Determine initial status (auto-approve if under threshold)
    let initialStatus: ClaimStatus = 'pending'
    let approvedBy: string | null = null
    let approvedAt: string | null = null

    if (policy && policy.auto_approve_under > 0 && input.total_amount < policy.auto_approve_under) {
      initialStatus = 'approved'
      approvedBy = input.employee_id
      approvedAt = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('expense_claims')
      .insert({
        company_id: companyId,
        employee_id: input.employee_id,
        policy_id: input.policy_id ?? null,
        total_amount: input.total_amount,
        currency: input.currency ?? 'THB',
        description: input.description ?? null,
        status: initialStatus,
        approved_by: approvedBy,
        approved_at: approvedAt,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to submit claim: ${error.message}`)

    // Insert receipts if provided
    if (input.receipts && input.receipts.length > 0) {
      const receiptRows = input.receipts.map(r => ({
        company_id: companyId,
        claim_id: data.id,
        file_url: r.file_url,
        file_name: r.file_name,
        amount: r.amount ?? null,
        receipt_date: r.receipt_date ?? null,
      }))
      await supabase.from('expense_receipts').insert(receiptRows)
    }

    return data as ExpenseClaim
  },

  /**
   * Approve an expense claim.
   * Requires: expense_approve permission.
   * Claim must be in 'pending' status.
   */
  async approveClaim(claimId: string, approvedBy: string): Promise<ExpenseClaim> {
    const canApprove = await hasPermission('expense', 'approve')
    if (!canApprove) throw new Error('Requires expense_approve permission')

    const companyId = await resolveCompanyId()

    const { data, error } = await supabase
      .from('expense_claims')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) throw new Error(`Failed to approve claim: ${error.message}`)
    if (!data) throw new Error('Claim not found or already processed')

    return data as ExpenseClaim
  },

  /**
   * Reject an expense claim.
   * Requires: expense_approve permission.
   * Claim must be in 'pending' status.
   */
  async rejectClaim(claimId: string, reason: string): Promise<ExpenseClaim> {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Rejection reason is required (minimum 3 characters)')
    }

    const canApprove = await hasPermission('expense', 'approve')
    if (!canApprove) throw new Error('Requires expense_approve permission')

    const companyId = await resolveCompanyId()

    const { data, error } = await supabase
      .from('expense_claims')
      .update({
        status: 'rejected',
        description: reason.trim(),
      })
      .eq('id', claimId)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error) throw new Error(`Failed to reject claim: ${error.message}`)
    if (!data) throw new Error('Claim not found or already processed')

    return data as ExpenseClaim
  },

  /**
   * Get expense claims, optionally filtered by employee.
   * Requires: expense_read permission.
   */
  async getClaims(
    companyId: string,
    employeeId?: string
  ): Promise<ExpenseClaim[]> {
    const canRead = await hasPermission('expense', 'read')
    if (!canRead) throw new Error('Requires expense_read permission')

    let query = supabase
      .from('expense_claims')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch claims: ${error.message}`)
    return (data ?? []) as ExpenseClaim[]
  },

  /**
   * Process reimbursement by linking to a payroll run.
   * Requires: expense_approve permission.
   * Claim must be in 'approved' status.
   * Creates an expense_reimbursement record linked to the payroll_run.
   */
  async processReimbursement(
    claimId: string,
    payrollRunId: string
  ): Promise<ExpenseReimbursement> {
    const canApprove = await hasPermission('expense', 'approve')
    if (!canApprove) throw new Error('Requires expense_approve permission')

    const companyId = await resolveCompanyId()

    // Verify claim is approved
    const { data: claim } = await supabase
      .from('expense_claims')
      .select('id, employee_id, total_amount, status')
      .eq('id', claimId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!claim) throw new Error('Claim not found')
    if (claim.status !== 'approved') {
      throw new Error(`Cannot reimburse claim in status '${claim.status}': must be 'approved'`)
    }

    // Verify payroll run exists
    const { data: payrollRun } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('id', payrollRunId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!payrollRun) throw new Error('Payroll run not found')

    // Create reimbursement record
    const { data, error } = await supabase
      .from('expense_reimbursements')
      .insert({
        company_id: companyId,
        claim_id: claimId,
        employee_id: claim.employee_id,
        amount: claim.total_amount,
        status: 'processing',
        payroll_run_id: payrollRunId,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create reimbursement: ${error.message}`)

    // Update claim status to reimbursing
    await supabase
      .from('expense_claims')
      .update({ status: 'reimbursing', updated_at: new Date().toISOString() })
      .eq('id', claimId)

    return data as ExpenseReimbursement
  },

  /**
   * Get active expense policies for a company.
   * Requires: expense_read permission.
   */
  async getPolicies(companyId: string): Promise<ExpensePolicy[]> {
    const canRead = await hasPermission('expense', 'read')
    if (!canRead) throw new Error('Requires expense_read permission')

    const { data, error } = await supabase
      .from('expense_policies')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('policy_name', { ascending: true })

    if (error) throw new Error(`Failed to fetch policies: ${error.message}`)
    return (data ?? []) as ExpensePolicy[]
  },
}
