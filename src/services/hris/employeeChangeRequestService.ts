import { supabase } from '../../lib/supabase'

/* ============================================================
   Employee Change Request Service
   Employee self-service: request profile changes for HR approval.
   ============================================================ */

export type ChangeRequestType = 'personal_info' | 'contact_info' | 'address' | 'emergency_contact' | 'bank_info' | 'document_update' | 'custom'
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface EmployeeChangeRequest {
  id: string
  company_id: string
  employee_id: string
  requested_by: string
  request_type: ChangeRequestType
  current_values: Record<string, unknown>
  requested_values: Record<string, unknown>
  status: ChangeRequestStatus
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export async function createChangeRequest(
  companyId: string,
  employeeId: string,
  requestedBy: string,
  requestType: ChangeRequestType,
  requestedValues: Record<string, unknown>
): Promise<EmployeeChangeRequest> {
  // Fetch current values
  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('*')
    .eq('employee_id', employeeId)
    .single()

  const currentValues: Record<string, unknown> = {}
  if (profile) {
    for (const key of Object.keys(requestedValues)) {
      if (key in profile) currentValues[key] = (profile as Record<string, unknown>)[key]
    }
  }

  const { data, error } = await supabase
    .from('employee_change_requests')
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      requested_by: requestedBy,
      request_type: requestType,
      current_values: currentValues,
      requested_values: requestedValues,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: requestedBy,
    action: 'change_request.created',
    resource_type: 'employee_change_request',
    resource_id: data.id,
    details: JSON.stringify({ request_type: requestType }),
  })

  return data as unknown as EmployeeChangeRequest
}

export async function approveChangeRequest(
  requestId: string,
  approvedBy: string
): Promise<void> {
  const { data: request } = await supabase
    .from('employee_change_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (!request) throw new Error('Change request not found')
  if (request.status !== 'pending') throw new Error(`Cannot approve: status is ${request.status}`)

  // Apply requested values to employee_profiles
  const updates = request.requested_values as Record<string, unknown>
  await supabase
    .from('employee_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('employee_id', request.employee_id)

  // Update request status
  await supabase
    .from('employee_change_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  await supabase.from('audit_logs').insert({
    company_id: request.company_id,
    user_id: approvedBy,
    action: 'change_request.approved',
    resource_type: 'employee_change_request',
    resource_id: requestId,
    details: JSON.stringify({ applied_fields: Object.keys(updates) }),
  })
}

export async function rejectChangeRequest(
  requestId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 3) throw new Error('Rejection reason required')

  const { error } = await supabase
    .from('employee_change_requests')
    .update({
      status: 'rejected',
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
  if (error) throw error
}

export async function listChangeRequests(
  companyId: string,
  filters?: { employeeId?: string; status?: string }
): Promise<EmployeeChangeRequest[]> {
  let query = supabase
    .from('employee_change_requests')
    .select('*, employee_profiles!employee_change_requests_employee_id_fkey(display_name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
  if (filters?.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as EmployeeChangeRequest[]
}
