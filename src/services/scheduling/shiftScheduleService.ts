import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Shift Schedule Service
   Workforce scheduling, shift assignments, swaps, overtime.
   ============================================================ */

export type ScheduleStatus = 'draft' | 'published' | 'archived'
export type AssignmentStatus = 'assigned' | 'confirmed' | 'completed' | 'absent' | 'cancelled'
export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface ShiftTemplate {
  id: string
  company_id: string
  name: string
  start_time: string
  end_time: string
  break_minutes: number
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ShiftSchedule {
  id: string
  company_id: string
  name: string
  start_date: string
  end_date: string
  status: ScheduleStatus
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ShiftAssignment {
  id: string
  company_id: string
  schedule_id: string
  employee_id: string
  shift_template_id: string
  work_date: string
  status: AssignmentStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShiftSwapRequest {
  id: string
  company_id: string
  requester_assignment_id: string
  target_assignment_id: string | null
  requester_id: string
  target_id: string | null
  status: SwapStatus
  reason: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface OvertimeRequest {
  id: string
  company_id: string
  employee_id: string
  request_date: string
  hours: number
  reason: string | null
  status: OvertimeStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export async function createSchedule(
  companyId: string,
  input: {
    name: string
    startDate: string
    endDate: string
  },
  createdBy: string
): Promise<ShiftSchedule> {
  if (!(await hasPermission('schedule', 'write'))) {
    throw new Error('Insufficient permissions: schedule:write required')
  }

  if (new Date(input.endDate) < new Date(input.startDate)) {
    throw new Error('end_date must be >= start_date')
  }

  const { data, error } = await supabase
    .from('shift_schedules')
    .insert({
      company_id: companyId,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'draft',
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: createdBy,
    action: 'schedule.created',
    resource_type: 'shift_schedule',
    resource_id: data.id,
    details: JSON.stringify({ name: input.name, start_date: input.startDate, end_date: input.endDate }),
  })

  return data as unknown as ShiftSchedule
}

export async function publishSchedule(
  scheduleId: string,
  publishedBy: string
): Promise<void> {
  if (!(await hasPermission('schedule', 'write'))) {
    throw new Error('Insufficient permissions: schedule:write required')
  }

  const { data: schedule } = await supabase
    .from('shift_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()
  if (!schedule) throw new Error('Schedule not found')
  if (schedule.status !== 'draft') throw new Error('Only draft schedules can be published')

  const { error } = await supabase
    .from('shift_schedules')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: schedule.company_id,
    user_id: publishedBy,
    action: 'schedule.published',
    resource_type: 'shift_schedule',
    resource_id: scheduleId,
    details: JSON.stringify({ name: schedule.name }),
  })
}

export async function getSchedule(
  scheduleId: string
): Promise<ShiftSchedule & { assignments: ShiftAssignment[] }> {
  if (!(await hasPermission('schedule', 'read'))) {
    throw new Error('Insufficient permissions: schedule:read required')
  }

  const { data, error } = await supabase
    .from('shift_schedules')
    .select('*, shift_assignments(*)')
    .eq('id', scheduleId)
    .single()
  if (error) throw error
  return data as unknown as ShiftSchedule & { assignments: ShiftAssignment[] }
}

export async function assignShift(
  companyId: string,
  input: {
    scheduleId: string
    employeeId: string
    shiftTemplateId: string
    workDate: string
    notes?: string
  },
  createdBy: string
): Promise<ShiftAssignment> {
  if (!(await hasPermission('schedule', 'write'))) {
    throw new Error('Insufficient permissions: schedule:write required')
  }

  // Check no existing assignment for this employee on this date (excluding cancelled)
  const { data: existing } = await supabase
    .from('shift_assignments')
    .select('id')
    .eq('employee_id', input.employeeId)
    .eq('work_date', input.workDate)
    .neq('status', 'cancelled')
    .limit(1)
  if (existing && existing.length > 0) {
    throw new Error('Employee already has an assignment on this date')
  }

  const { data, error } = await supabase
    .from('shift_assignments')
    .insert({
      company_id: companyId,
      schedule_id: input.scheduleId,
      employee_id: input.employeeId,
      shift_template_id: input.shiftTemplateId,
      work_date: input.workDate,
      notes: input.notes || null,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: createdBy,
    action: 'schedule.shift_assigned',
    resource_type: 'shift_assignment',
    resource_id: data.id,
    details: JSON.stringify({ employee_id: input.employeeId, work_date: input.workDate }),
  })

  return data as unknown as ShiftAssignment
}

export async function swapShifts(
  companyId: string,
  input: {
    requesterAssignmentId: string
    targetAssignmentId?: string
    targetId?: string
    reason: string
  },
  requesterId: string
): Promise<ShiftSwapRequest> {
  if (!(await hasPermission('schedule', 'write'))) {
    throw new Error('Insufficient permissions: schedule:write required')
  }

  const { data: requesterAssignment } = await supabase
    .from('shift_assignments')
    .select('*')
    .eq('id', input.requesterAssignmentId)
    .single()
  if (!requesterAssignment) throw new Error('Requester assignment not found')

  if (!input.targetAssignmentId && !input.targetId) {
    throw new Error('Either target_assignment_id or target_id is required')
  }

  const { data, error } = await supabase
    .from('shift_swap_requests')
    .insert({
      company_id: companyId,
      requester_assignment_id: input.requesterAssignmentId,
      target_assignment_id: input.targetAssignmentId || null,
      requester_id: requesterId,
      target_id: input.targetId || requesterAssignment.employee_id,
      reason: input.reason,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: requesterId,
    action: 'schedule.swap_requested',
    resource_type: 'shift_swap_request',
    resource_id: data.id,
    details: JSON.stringify({ reason: input.reason }),
  })

  return data as unknown as ShiftSwapRequest
}

export async function requestOvertime(
  companyId: string,
  input: {
    employeeId: string
    requestDate: string
    hours: number
    reason: string
  },
  requestedBy: string
): Promise<OvertimeRequest> {
  if (!(await hasPermission('schedule', 'write'))) {
    throw new Error('Insufficient permissions: schedule:write required')
  }

  if (input.hours <= 0 || input.hours > 24) {
    throw new Error('Hours must be between 0 and 24')
  }

  const { data, error } = await supabase
    .from('overtime_requests')
    .insert({
      company_id: companyId,
      employee_id: input.employeeId,
      request_date: input.requestDate,
      hours: input.hours,
      reason: input.reason,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: requestedBy,
    action: 'schedule.overtime_requested',
    resource_type: 'overtime_request',
    resource_id: data.id,
    details: JSON.stringify({ employee_id: input.employeeId, hours: input.hours }),
  })

  return data as unknown as OvertimeRequest
}

export async function approveOvertime(
  overtimeId: string,
  approvedBy: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  if (!(await hasPermission('schedule', 'approve'))) {
    throw new Error('Insufficient permissions: schedule:approve required')
  }

  const { data: ot } = await supabase
    .from('overtime_requests')
    .select('*')
    .eq('id', overtimeId)
    .single()
  if (!ot) throw new Error('Overtime request not found')
  if (ot.status !== 'pending') throw new Error('Only pending overtime requests can be approved/rejected')

  const { error } = await supabase
    .from('overtime_requests')
    .update({
      status: decision,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', overtimeId)
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: ot.company_id,
    user_id: approvedBy,
    action: `schedule.overtime_${decision}`,
    resource_type: 'overtime_request',
    resource_id: overtimeId,
    details: JSON.stringify({ employee_id: ot.employee_id, hours: ot.hours, decision }),
  })
}
