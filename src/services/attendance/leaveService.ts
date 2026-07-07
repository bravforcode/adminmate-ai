import { supabase } from '../../lib/supabase'

/* ============================================================
   Leave Service
   Leave types, requests, balances, approvals.
   ============================================================ */

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveType {
  id: string
  company_id: string
  name: string
  name_th?: string
  code: string
  description?: string
  is_paid: boolean
  max_days_per_year: number
  carry_over_enabled: boolean
  requires_approval: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LeaveBalance {
  id: string
  company_id: string
  employee_id: string
  leave_type_id: string
  year: number
  total_days: number
  used_days: number
  pending_days: number
  carried_over_days: number
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  company_id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: number
  reason?: string
  status: LeaveRequestStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  leave_types?: LeaveType
}

export interface LeaveRequestInput {
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: number
  reason?: string
}

export interface LeaveRequestFilters {
  employee_id?: string
  leave_type_id?: string
  status?: LeaveRequestStatus
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

const PAGE_SIZE = 25

export const leaveService = {
  /**
   * List active leave types for a company.
   */
  async getLeaveTypes(companyId: string): Promise<LeaveType[]> {
    const { data, error } = await supabase
      .from('leave_types')
      .select('id, company_id, name, name_th, code, description, is_paid, max_days_per_year, carry_over_enabled, requires_approval, is_active, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data ?? []
  },

  /**
   * Create a leave request. No auto-approval.
   */
  async createLeaveRequest(
    companyId: string,
    input: LeaveRequestInput
  ): Promise<LeaveRequest> {
    if (input.total_days <= 0) throw new Error('total_days must be positive')
    if (input.end_date < input.start_date) throw new Error('end_date must be >= start_date')

    // Check available balance (used + pending <= total)
    const { data: balance, error: balErr } = await supabase
      .from('leave_balances')
      .select('id, total_days, used_days, pending_days')
      .eq('company_id', companyId)
      .eq('employee_id', input.employee_id)
      .eq('leave_type_id', input.leave_type_id)
      .eq('year', new Date(input.start_date).getFullYear())
      .maybeSingle()

    if (balErr) throw balErr

    if (balance) {
      const available = balance.total_days - balance.used_days - balance.pending_days
      if (input.total_days > available) {
        throw new Error(
          `Insufficient leave balance. Available: ${available} days, requested: ${input.total_days} days`
        )
      }
    }

    // Fetch leave type to check requires_approval
    const { data: leaveType, error: ltErr } = await supabase
      .from('leave_types')
      .select('requires_approval')
      .eq('id', input.leave_type_id)
      .single()

    if (ltErr) throw ltErr

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        company_id: companyId,
        employee_id: input.employee_id,
        leave_type_id: input.leave_type_id,
        start_date: input.start_date,
        end_date: input.end_date,
        total_days: input.total_days,
        reason: input.reason ?? null,
        status: leaveType.requires_approval ? 'pending' : 'approved',
      })
      .select()
      .single()

    if (error) throw error

    // Update pending_days if requires approval
    if (leaveType.requires_approval && balance) {
      await supabase
        .from('leave_balances')
        .update({ pending_days: balance.pending_days + input.total_days })
        .eq('id', balance.id)
    } else if (!leaveType.requires_approval && balance) {
      // Auto-approved: increment used_days directly
      await supabase
        .from('leave_balances')
        .update({ used_days: balance.used_days + input.total_days })
        .eq('id', balance.id)
    }

    await supabase.from('audit_logs').insert({
      company_id: companyId,
      action: 'leave.request_created',
      resource_type: 'leave_requests',
      resource_id: data.id,
      details: JSON.stringify({
        employee_id: input.employee_id,
        leave_type_id: input.leave_type_id,
        total_days: input.total_days,
      }),
    })

    return data
  },

  /**
   * Approve a leave request. No auto-approve — explicit manager action required.
   */
  async approveLeaveRequest(
    id: string,
    approvedBy: string
  ): Promise<LeaveRequest> {
    const { data: request, error: fetchErr } = await supabase
      .from('leave_requests')
      .select('id, company_id, employee_id, leave_type_id, start_date, total_days, status')
      .eq('id', id)
      .single()

    if (fetchErr) throw fetchErr
    if (request.status !== 'pending') throw new Error('Request is not pending')

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Move from pending_days to used_days
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('id, pending_days, used_days')
      .eq('company_id', request.company_id)
      .eq('employee_id', request.employee_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', new Date(request.start_date).getFullYear())
      .maybeSingle()

    if (balance) {
      await supabase
        .from('leave_balances')
        .update({
          pending_days: Math.max(0, balance.pending_days - request.total_days),
          used_days: balance.used_days + request.total_days,
        })
        .eq('id', balance.id)
    }

    await supabase.from('audit_logs').insert({
      company_id: request.company_id,
      action: 'leave.request_approved',
      resource_type: 'leave_requests',
      resource_id: id,
      details: JSON.stringify({ approved_by: approvedBy }),
    })

    return data
  },

  /**
   * Reject a leave request. Requires a reason.
   */
  async rejectLeaveRequest(
    id: string,
    reason: string
  ): Promise<LeaveRequest> {
    if (!reason || reason.trim().length < 3) {
      throw new Error('Rejection reason is required (min 3 characters)')
    }

    const { data: request, error: fetchErr } = await supabase
      .from('leave_requests')
      .select('id, company_id, employee_id, leave_type_id, start_date, total_days, status')
      .eq('id', id)
      .single()

    if (fetchErr) throw fetchErr
    if (request.status !== 'pending') throw new Error('Request is not pending')

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        approved_at: now,
        rejection_reason: reason,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Return pending_days
    const { data: balance } = await supabase
      .from('leave_balances')
      .select('id, pending_days')
      .eq('company_id', request.company_id)
      .eq('employee_id', request.employee_id)
      .eq('leave_type_id', request.leave_type_id)
      .eq('year', new Date(request.start_date).getFullYear())
      .maybeSingle()

    if (balance) {
      await supabase
        .from('leave_balances')
        .update({ pending_days: Math.max(0, balance.pending_days - request.total_days) })
        .eq('id', balance.id)
    }

    await supabase.from('audit_logs').insert({
      company_id: request.company_id,
      action: 'leave.request_rejected',
      resource_type: 'leave_requests',
      resource_id: id,
      details: JSON.stringify({ rejection_reason: reason }),
    })

    return data
  },

  /**
   * Get leave balances for an employee in a given year.
   */
  async getLeaveBalances(
    employeeId: string,
    year: number
  ): Promise<LeaveBalance[]> {
    const { data, error } = await supabase
      .from('leave_balances')
      .select('*, leave_types(name, code, is_paid)')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .order('created_at')

    if (error) throw error
    return data ?? []
  },

  /**
   * List leave requests with filters.
   */
  async getLeaveRequests(
    companyId: string,
    filters: LeaveRequestFilters = {}
  ): Promise<{ data: LeaveRequest[]; count: number }> {
    const {
      employee_id, leave_type_id, status, date_from, date_to,
      page = 1, limit = PAGE_SIZE,
    } = filters
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('leave_requests')
      .select('*, leave_types(name, code, is_paid)', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (leave_type_id) query = query.eq('leave_type_id', leave_type_id)
    if (status) query = query.eq('status', status)
    if (date_from) query = query.gte('start_date', date_from)
    if (date_to) query = query.lte('end_date', date_to)

    const { data, error, count } = await query
    if (error) throw error

    return { data: data ?? [], count: count ?? 0 }
  },
}
