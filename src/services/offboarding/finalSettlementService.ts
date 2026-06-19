import { supabase } from '../../lib/supabase'

/* ============================================================
   Final Settlement Readiness Service
   Prepares readiness for payroll — does NOT calculate payroll.
   ============================================================ */

export type SettlementStatus = 'not_started' | 'blocked' | 'pending_review' | 'ready_for_payroll' | 'sent_to_payroll' | 'completed'

export interface FinalSettlementReadiness {
  id: string
  company_id: string
  offboarding_case_id: string
  employee_user_id: string
  payroll_cycle_id?: string
  status: SettlementStatus
  blockers: string[]
  unpaid_leave_days?: number
  pending_expense_amount?: number
  asset_deduction_amount?: number
  notes?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

/**
 * Calculate final settlement readiness.
 * Checks blockers from offboarding case items.
 * Does NOT calculate actual payroll amounts.
 */
export async function calculateFinalSettlementReadiness(
  companyId: string,
  caseId: string,
  employeeUserId: string
): Promise<FinalSettlementReadiness> {
  // Check for incomplete required items
  const { data: items } = await supabase
    .from('offboarding_case_items')
    .select('title, required, status')
    .eq('offboarding_case_id', caseId)
    .eq('required', true)
    .not('status', 'in', '("completed","skipped")')

  const blockers = (items ?? []).map(i => i.title)

  // Check asset returns
  const { data: assets } = await supabase
    .from('offboarding_asset_returns')
    .select('asset_name, status')
    .eq('offboarding_case_id', caseId)
    .eq('return_required', true)
    .not('status', 'in', '("returned","waived")')

  const assetBlockers = (assets ?? []).map(a => `Asset not returned: ${a.asset_name}`)
  blockers.push(...assetBlockers)

  // Check access revocations
  const { data: access } = await supabase
    .from('offboarding_access_revocations')
    .select('system_name, status')
    .eq('offboarding_case_id', caseId)
    .eq('revocation_required', true)
    .not('status', 'in', '("revoked","skipped")')

  const accessBlockers = (access ?? []).map(a => `Access not revoked: ${a.system_name}`)
  blockers.push(...accessBlockers)

  const status: SettlementStatus = blockers.length > 0 ? 'blocked' : 'pending_review'

  // Upsert readiness record
  const { data: existing } = await supabase
    .from('final_settlement_readiness')
    .select('id')
    .eq('offboarding_case_id', caseId)
    .maybeSingle()

  const updateData = {
    company_id: companyId,
    offboarding_case_id: caseId,
    employee_user_id: employeeUserId,
    status,
    blockers,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    await supabase.from('final_settlement_readiness').update(updateData).eq('id', existing.id)
  } else {
    await supabase.from('final_settlement_readiness').insert(updateData)
  }

  const { data: result } = await supabase
    .from('final_settlement_readiness')
    .select('*')
    .eq('offboarding_case_id', caseId)
    .single()

  return result as unknown as FinalSettlementReadiness
}

/**
 * Mark final settlement as ready for payroll.
 * Requires finance_approver or admin/owner permission.
 */
export async function markFinalSettlementReady(
  caseId: string,
  reviewedBy: string,
  notes?: string
): Promise<void> {
  const { data: readiness } = await supabase
    .from('final_settlement_readiness')
    .select('status, blockers')
    .eq('offboarding_case_id', caseId)
    .single()

  if (!readiness) throw new Error('Final settlement readiness not found')
  if (readiness.status === 'blocked' && (!readiness.blockers || readiness.blockers.length === 0)) {
    // Should not happen, but safety check
    throw new Error('Cannot mark ready: status is blocked')
  }
  if (readiness.status === 'blocked') {
    throw new Error(`Cannot mark ready: ${readiness.blockers?.length} blockers remain`)
  }

  await supabase
    .from('final_settlement_readiness')
    .update({
      status: 'ready_for_payroll',
      notes: notes || null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('offboarding_case_id', caseId)

  // Update case settlement status
  await supabase
    .from('offboarding_cases')
    .update({ final_settlement_status: 'ready_for_payroll', updated_at: new Date().toISOString() })
    .eq('id', caseId)

  await supabase.from('audit_logs').insert({
    company_id: (await supabase.from('offboarding_cases').select('company_id').eq('id', caseId).single()).data?.company_id,
    user_id: reviewedBy,
    action: 'final_settlement.ready',
    resource_type: 'offboarding_case',
    resource_id: caseId,
    details: JSON.stringify({ notes }),
  })
}

export async function getFinalSettlementReadiness(caseId: string): Promise<FinalSettlementReadiness | null> {
  const { data, error } = await supabase
    .from('final_settlement_readiness')
    .select('*')
    .eq('offboarding_case_id', caseId)
    .maybeSingle()
  if (error) throw error
  return data as unknown as FinalSettlementReadiness | null
}
