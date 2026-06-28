import { supabase } from '../../lib/supabase'

/* ============================================================
   Attendance Service
   Clock-in/out, records, corrections.
   ============================================================ */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'holiday' | 'leave'
export type AttendanceMethod = 'manual' | 'gps' | 'qr' | 'biometric' | 'web'
export type CorrectionStatus = 'pending' | 'approved' | 'rejected'

export interface AttendanceRecord {
  id: string
  company_id: string
  employee_id: string
  check_in: string
  check_out?: string
  work_date: string
  hours_worked?: number
  overtime_hours: number
  status: AttendanceStatus
  location_data?: Record<string, unknown>
  method: AttendanceMethod
  notes?: string
  created_at: string
  updated_at: string
}

export interface AttendanceCorrection {
  id: string
  company_id: string
  attendance_record_id: string
  requested_by: string
  original_check_in: string
  original_check_out?: string
  corrected_check_in: string
  corrected_check_out?: string
  reason: string
  status: CorrectionStatus
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface CheckInInput {
  employee_id: string
  check_in?: string
  method?: AttendanceMethod
  location_data?: Record<string, unknown>
  notes?: string
}

export interface AttendanceFilters {
  employee_id?: string
  date_from?: string
  date_to?: string
  status?: AttendanceStatus
  page?: number
  limit?: number
}

export interface CorrectionInput {
  attendance_record_id: string
  requested_by: string
  corrected_check_in: string
  corrected_check_out?: string
  reason: string
}

const PAGE_SIZE = 25

export const attendanceService = {
  /**
   * Clock in an employee. Creates a new attendance record.
   */
  async checkIn(
    companyId: string,
    employeeId: string,
    input: CheckInInput
  ): Promise<AttendanceRecord> {
    const workDate = new Date(input.check_in ?? new Date().toISOString()).toISOString().slice(0, 10)

    // Prevent duplicate check-in on same work_date
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('company_id', companyId)
      .eq('employee_id', employeeId)
      .eq('work_date', workDate)
      .maybeSingle()

    if (existing) throw new Error('Employee already checked in for this date')

    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        company_id: companyId,
        employee_id: employeeId,
        check_in: input.check_in ?? new Date().toISOString(),
        work_date: workDate,
        status: 'present',
        method: input.method ?? 'manual',
        location_data: input.location_data ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      company_id: companyId,
      action: 'attendance.check_in',
      resource_type: 'attendance_records',
      resource_id: data.id,
      details: JSON.stringify({ employee_id: employeeId, method: input.method ?? 'manual' }),
    })

    return data
  },

  /**
   * Clock out. Updates check_out on existing record.
   */
  async checkOut(recordId: string): Promise<AttendanceRecord> {
    const { data: record, error: fetchError } = await supabase
      .from('attendance_records')
      .select('id, company_id, check_out')
      .eq('id', recordId)
      .single()

    if (fetchError) throw fetchError
    if (record.check_out) throw new Error('Employee already checked out for this record')

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('attendance_records')
      .update({ check_out: now })
      .eq('id', recordId)
      .select()
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      company_id: record.company_id,
      action: 'attendance.check_out',
      resource_type: 'attendance_records',
      resource_id: recordId,
      details: JSON.stringify({ check_out: now }),
    })

    return data
  },

  /**
   * List attendance records with filters.
   */
  async getAttendanceRecords(
    companyId: string,
    filters: AttendanceFilters = {}
  ): Promise<{ data: AttendanceRecord[]; count: number }> {
    const { employee_id, date_from, date_to, status, page = 1, limit = PAGE_SIZE } = filters
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('attendance_records')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('work_date', { ascending: false })
      .range(from, to)

    if (employee_id) query = query.eq('employee_id', employee_id)
    if (date_from) query = query.gte('work_date', date_from)
    if (date_to) query = query.lte('work_date', date_to)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw error

    return { data: data ?? [], count: count ?? 0 }
  },

  /**
   * Request a correction for an attendance record.
   * Requires approval — no auto-apply.
   */
  async requestCorrection(input: CorrectionInput): Promise<AttendanceCorrection> {
    // Fetch original record
    const { data: original, error: origErr } = await supabase
      .from('attendance_records')
      .select('id, company_id, check_in, check_out')
      .eq('id', input.attendance_record_id)
      .single()

    if (origErr) throw origErr

    const { data, error } = await supabase
      .from('attendance_corrections')
      .insert({
        company_id: original.company_id,
        attendance_record_id: input.attendance_record_id,
        requested_by: input.requested_by,
        original_check_in: original.check_in,
        original_check_out: original.check_out,
        corrected_check_in: input.corrected_check_in,
        corrected_check_out: input.corrected_check_out,
        reason: input.reason,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      company_id: original.company_id,
      action: 'attendance.correction_requested',
      resource_type: 'attendance_corrections',
      resource_id: data.id,
      details: JSON.stringify({ requested_by: input.requested_by, reason: input.reason }),
    })

    return data
  },

  /**
   * Approve a correction request. Applies corrected times to the record.
   */
  async approveCorrection(
    id: string,
    approvedBy: string
  ): Promise<AttendanceCorrection> {
    const { data: correction, error: fetchErr } = await supabase
      .from('attendance_corrections')
      .select('id, company_id, attendance_record_id, status, corrected_check_in, corrected_check_out')
      .eq('id', id)
      .single()

    if (fetchErr) throw fetchErr
    if (correction.status !== 'pending') throw new Error('Correction is not pending')

    // Apply correction to the attendance record
    const { error: updateErr } = await supabase
      .from('attendance_records')
      .update({
        check_in: correction.corrected_check_in,
        check_out: correction.corrected_check_out,
      })
      .eq('id', correction.attendance_record_id)

    if (updateErr) throw updateErr

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('attendance_corrections')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      company_id: correction.company_id,
      action: 'attendance.correction_approved',
      resource_type: 'attendance_corrections',
      resource_id: id,
      details: JSON.stringify({ approved_by: approvedBy }),
    })

    return data
  },
}
