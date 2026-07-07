import { supabase } from '../../lib/supabase'

/* ============================================================
   Offboarding Case Service
   Creates offboarding cases, tracks completion, handles overrides.
   ============================================================ */

export type OffboardingReason = 'resignation' | 'termination' | 'contract_end' | 'retirement' | 'redundancy' | 'probation_failed' | 'other'
export type OffboardingStatus = 'draft' | 'active' | 'waiting_for_employee' | 'waiting_for_hr' | 'waiting_for_manager' | 'waiting_for_it' | 'waiting_for_finance' | 'ready_for_completion' | 'completed' | 'cancelled'
export type CaseItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked' | 'failed'
export type AssignedRole = 'hr' | 'manager' | 'employee' | 'finance' | 'it_admin' | 'admin'

export interface OffboardingCase {
  id: string
  company_id: string
  employee_user_id: string
  manager_user_id?: string
  legal_entity_id?: string
  template_id?: string
  offboarding_reason: OffboardingReason
  reason_notes?: string
  notice_date?: string
  last_working_day: string
  status: OffboardingStatus
  final_settlement_status: string
  completion_percentage: number
  completed_at?: string
  completed_by?: string
  override_completed: boolean
  override_reason?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface OffboardingCaseItem {
  id: string
  company_id: string
  offboarding_case_id: string
  template_item_id?: string
  item_type: string
  title: string
  description?: string
  required: boolean
  assigned_role: AssignedRole
  assigned_to?: string
  status: CaseItemStatus
  due_date?: string
  completed_by?: string
  completed_at?: string
  skip_reason?: string
  block_reason?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * Create offboarding case for an employee.
 * Validates no duplicate active case exists.
 */
export async function createOffboardingCase(
  companyId: string,
  employeeUserId: string,
  input: {
    offboardingReason: OffboardingReason
    lastWorkingDay: string
    reasonNotes?: string
    noticeDate?: string
    managerUserId?: string
    legalEntityId?: string
  },
  createdBy: string
): Promise<OffboardingCase> {
  // Check for existing active case
  const { data: existing } = await supabase
    .from('offboarding_cases')
    .select('id')
    .eq('company_id', companyId)
    .eq('employee_user_id', employeeUserId)
    .in('status', ['draft', 'active', 'waiting_for_employee', 'waiting_for_hr', 'waiting_for_manager', 'waiting_for_it', 'waiting_for_finance', 'ready_for_completion'])
    .maybeSingle()
  if (existing) throw new Error('Active offboarding case already exists for this employee')

  // Find default template
  const { data: template } = await supabase
    .from('offboarding_templates')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_default', true)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  // Create case
  const { data: offCase, error: caseErr } = await supabase
    .from('offboarding_cases')
    .insert({
      company_id: companyId,
      employee_user_id: employeeUserId,
      manager_user_id: input.managerUserId || null,
      legal_entity_id: input.legalEntityId || null,
      template_id: template?.id || null,
      offboarding_reason: input.offboardingReason,
      reason_notes: input.reasonNotes || null,
      notice_date: input.noticeDate || null,
      last_working_day: input.lastWorkingDay,
      status: 'active',
      created_by: createdBy,
    })
    .select()
    .single()
  if (caseErr) throw caseErr

  // Create items from template
  if (template) {
    const { data: templateItems } = await supabase
      .from('offboarding_template_items')
      .select('*')
      .eq('template_id', template.id)
      .order('sort_order')

    if (templateItems && templateItems.length > 0) {
      const lwd = new Date(input.lastWorkingDay)
      const items = templateItems.map(ti => {
        let dueDate: string | null = null
        if (ti.due_days_before_last_day) {
          dueDate = new Date(lwd.getTime() - ti.due_days_before_last_day * 86400000).toISOString().split('T')[0]
        } else if (ti.due_days_after_last_day) {
          dueDate = new Date(lwd.getTime() + ti.due_days_after_last_day * 86400000).toISOString().split('T')[0]
        }
        return {
          company_id: companyId,
          offboarding_case_id: offCase.id,
          template_item_id: ti.id,
          item_type: ti.item_type,
          title: ti.title,
          description: ti.description,
          required: ti.required,
          assigned_role: ti.assigned_role,
          status: 'pending' as const,
          due_date: dueDate,
          metadata: ti.metadata || {},
        }
      })
      await supabase.from('offboarding_case_items').insert(items)
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: createdBy,
    action: 'offboarding.created',
    resource_type: 'offboarding_case',
    resource_id: offCase.id,
    details: JSON.stringify({ employee_user_id: employeeUserId, reason: input.offboardingReason, last_working_day: input.lastWorkingDay }),
  })

  return offCase as unknown as OffboardingCase
}

export async function getOffboardingCase(id: string): Promise<OffboardingCase | null> {
  const { data, error } = await supabase
    .from('offboarding_cases')
    .select('*, offboarding_case_items(*), offboarding_asset_returns(*), offboarding_access_revocations(*), exit_interviews(*), final_settlement_readiness(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as OffboardingCase | null
}

export async function listOffboardingCases(
  companyId: string,
  filters?: { status?: string; reason?: string }
): Promise<OffboardingCase[]> {
  let query = supabase
    .from('offboarding_cases')
    .select('*, user_profiles!offboarding_cases_employee_user_id_fkey(full_name)')
    .eq('company_id', companyId)
    .order('last_working_day', { ascending: true })
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.reason) query = query.eq('offboarding_reason', filters.reason)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as OffboardingCase[]
}

export async function calculateCompletion(caseId: string): Promise<{ percentage: number; totalRequired: number; completedRequired: number }> {
  const { data: items } = await supabase
    .from('offboarding_case_items')
    .select('required, status')
    .eq('offboarding_case_id', caseId)
  if (!items || items.length === 0) return { percentage: 100, totalRequired: 0, completedRequired: 0 }
  const totalRequired = items.filter(i => i.required).length
  const completedRequired = items.filter(i => i.required && ['completed', 'skipped'].includes(i.status)).length
  const percentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100
  return { percentage, totalRequired, completedRequired }
}

export async function completeOffboarding(
  caseId: string,
  completedBy: string,
  overrideReason?: string
): Promise<void> {
  const { percentage, totalRequired, completedRequired } = await calculateCompletion(caseId)
  if (totalRequired > 0 && completedRequired < totalRequired && !overrideReason) {
    throw new Error(`Cannot complete: ${totalRequired - completedRequired} required items remaining. Use override with reason.`)
  }
  const updates: Record<string, unknown> = {
    status: 'completed',
    completion_percentage: percentage,
    completed_at: new Date().toISOString(),
    completed_by: completedBy,
    updated_at: new Date().toISOString(),
  }
  if (overrideReason) {
    updates.override_completed = true
    updates.override_reason = overrideReason
  }
  const { error } = await supabase.from('offboarding_cases').update(updates).eq('id', caseId)
  if (error) throw error
  const { data: c } = await supabase.from('offboarding_cases').select('company_id').eq('id', caseId).single()
  if (c) {
    await supabase.from('audit_logs').insert({
      company_id: c.company_id,
      user_id: completedBy,
      action: overrideReason ? 'offboarding.override_completed' : 'offboarding.completed',
      resource_type: 'offboarding_case',
      resource_id: caseId,
      details: JSON.stringify({ percentage, override: !!overrideReason, override_reason: overrideReason }),
    })
  }
}

export async function completeCaseItem(itemId: string, completedBy: string): Promise<void> {
  const { error } = await supabase
    .from('offboarding_case_items')
    .update({ status: 'completed', completed_by: completedBy, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}

export async function skipCaseItem(itemId: string, reason: string): Promise<void> {
  if (!reason || reason.trim().length < 3) throw new Error('Skip reason required')
  const { error } = await supabase
    .from('offboarding_case_items')
    .update({ status: 'skipped', skip_reason: reason.trim(), updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}
