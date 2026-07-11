import { supabase } from '../../lib/supabase'

/* ============================================================
   Employee Data Graph Service
   Unified cross-module data model connecting employee_id
   across all HR modules for 360° employee view.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

export interface Employee360View {
  // Core profile
  profile: {
    id: string
    email: string
    full_name: string
    role: string
    department?: string
    position?: string
    hire_date?: string
    employment_status: string
  }

  // Attendance summary
  attendance: {
    total_days: number
    present_days: number
    absent_days: number
    late_days: number
    attendance_rate: number
  }

  // Leave summary
  leave: {
    total_entitled: number
    total_used: number
    total_pending: number
    total_remaining: number
    by_type: Array<{ type: string; entitled: number; used: number; remaining: number }>
  }

  // Payroll summary
  payroll: {
    latest_monthly_salary: number
    ytd_gross: number
    ytd_deductions: number
    ytd_net: number
    currency: string
  }

  // Performance
  performance: {
    latest_review_date?: string
    latest_score?: number
    goals_completed: number
    goals_total: number
  }

  // Benefits
  benefits: {
    enrolled_benefits: number
    benefit_types: string[]
  }

  // Learning
  learning: {
    courses_completed: number
    courses_in_progress: number
    total_hours: number
  }

  // Engagement
  engagement: {
    recognition_count: number
    gamification_points: number
    badges_count: number
  }

  // Documents
  documents: {
    total: number
    pending_signatures: number
    expiring_soon: number
  }
}

// ── 360° Query ──────────────────────────────────────────────

/**
 * Get comprehensive 360° view of an employee.
 * Queries across all modules in parallel for performance.
 */
export async function getEmployee360(
  companyId: string,
  employeeId: string
): Promise<Employee360View> {
  // Validate employee belongs to company
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, department, position, hire_date, employment_status')
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .single()

  if (!profile) throw new Error('Employee not found')

  // Query all modules in parallel
  const [
    attendance,
    leave,
    payroll,
    performance,
    benefits,
    learning,
    engagement,
    documents,
  ] = await Promise.all([
    getAttendanceSummary(companyId, employeeId),
    getLeaveSummary(companyId, employeeId),
    getPayrollSummary(companyId, employeeId),
    getPerformanceSummary(companyId, employeeId),
    getBenefitsSummary(companyId, employeeId),
    getLearningSummary(companyId, employeeId),
    getEngagementSummary(companyId, employeeId),
    getDocumentsSummary(companyId, employeeId),
  ])

  return {
    profile: profile as Employee360View['profile'],
    attendance,
    leave,
    payroll,
    performance,
    benefits,
    learning,
    engagement,
    documents,
  }
}

/**
 * Get employee graph relationships (who they report to, who reports to them).
 */
export async function getEmployeeGraph(
  companyId: string,
  employeeId: string
): Promise<{
  reportsTo: Array<{ id: string; name: string; role: string }>
  directReports: Array<{ id: string; name: string; role: string }>
  peers: Array<{ id: string; name: string; department: string }>
}> {
  // Get employee's manager
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, department, manager_id')
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .single()

  // Get manager chain (up to 3 levels)
  const reportsTo: Array<{ id: string; name: string; role: string }> = []
  let currentManagerId = profile?.manager_id

  for (let i = 0; i < 3 && currentManagerId; i++) {
    const { data: manager } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, manager_id')
      .eq('id', currentManagerId)
      .single()

    if (manager) {
      reportsTo.push({
        id: manager.id,
        name: manager.full_name,
        role: manager.role,
      })
      currentManagerId = (manager as { manager_id?: string }).manager_id
    } else {
      break
    }
  }

  // Get direct reports
  const { data: directReportsData } = await supabase
    .from('user_profiles')
    .select('id, full_name, role')
    .eq('manager_id', employeeId)
    .eq('company_id', companyId)

  // Get peers (same department)
  const { data: peersData } = await supabase
    .from('user_profiles')
    .select('id, full_name, department')
    .eq('company_id', companyId)
    .eq('department', profile?.department)
    .neq('id', employeeId)
    .limit(20)

  return {
    reportsTo,
    directReports: (directReportsData ?? []) as unknown as Array<{ id: string; name: string; role: string }>,
    peers: (peersData ?? []) as unknown as Array<{ id: string; name: string; department: string }>,
  }
}

// ── Module Summaries ────────────────────────────────────────

async function getAttendanceSummary(companyId: string, employeeId: string) {
  const currentYear = new Date().getFullYear()
  const { data } = await supabase
    .from('attendance_records')
    .select('status')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .gte('date', `${currentYear}-01-01`)

  const records = (data ?? []) as Array<{ status: string }>
  const total = records.length
  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const late = records.filter(r => r.status === 'late').length

  return {
    total_days: total,
    present_days: present,
    absent_days: absent,
    late_days: late,
    attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0,
  }
}

async function getLeaveSummary(companyId: string, employeeId: string) {
  const currentYear = new Date().getFullYear()
  const { data: balances } = await supabase
    .from('leave_balances')
    .select('total_days, used_days, pending_days, leave_types(name)')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .eq('year', currentYear)

  const entries = (balances ?? []) as unknown as Array<{
    total_days: number
    used_days: number
    pending_days: number
    leave_types: { name: string } | null
  }>

  const totalEntitled = entries.reduce((sum, e) => sum + e.total_days, 0)
  const totalUsed = entries.reduce((sum, e) => sum + e.used_days, 0)
  const totalPending = entries.reduce((sum, e) => sum + e.pending_days, 0)

  return {
    total_entitled: totalEntitled,
    total_used: totalUsed,
    total_pending: totalPending,
    total_remaining: totalEntitled - totalUsed - totalPending,
    by_type: entries.map(e => ({
      type: e.leave_types?.name ?? 'Unknown',
      entitled: e.total_days,
      used: e.used_days,
      remaining: e.total_days - e.used_days - e.pending_days,
    })),
  }
}

async function getPayrollSummary(companyId: string, employeeId: string) {
  const currentYear = new Date().getFullYear()
  const { data } = await supabase
    .from('payslips')
    .select('gross_pay, total_deductions, net_pay, payroll_runs(period_end)')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .gte('payroll_runs.period_end', `${currentYear}-01-01`)
    .order('payroll_runs.period_end', { ascending: false })

  const payslips = (data ?? []) as Array<{
    gross_pay: number
    total_deductions: number
    net_pay: number
  }>

  return {
    latest_monthly_salary: payslips[0]?.gross_pay ?? 0,
    ytd_gross: payslips.reduce((sum, p) => sum + p.gross_pay, 0),
    ytd_deductions: payslips.reduce((sum, p) => sum + p.total_deductions, 0),
    ytd_net: payslips.reduce((sum, p) => sum + p.net_pay, 0),
    currency: 'THB',
  }
}

async function getPerformanceSummary(companyId: string, employeeId: string) {
  const { data } = await supabase
    .from('performance_reviews')
    .select('review_date, overall_score')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .order('review_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: goals } = await supabase
    .from('okr_goals')
    .select('status')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)

  const goalsArray = (goals ?? []) as Array<{ status: string }>

  return {
    latest_review_date: data?.review_date,
    latest_score: data?.overall_score,
    goals_completed: goalsArray.filter(g => g.status === 'completed').length,
    goals_total: goalsArray.length,
  }
}

async function getBenefitsSummary(companyId: string, employeeId: string) {
  const { data } = await supabase
    .from('employee_benefits')
    .select('benefit_plans(name)')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)

  const entries = (data ?? []) as unknown as Array<{ benefit_plans: { name: string } | null }>

  return {
    enrolled_benefits: entries.length,
    benefit_types: entries.map(e => e.benefit_plans?.name ?? 'Unknown'),
  }
}

async function getLearningSummary(companyId: string, employeeId: string) {
  const { data } = await supabase
    .from('learning_enrollments')
    .select('status, hours_completed')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)

  const entries = (data ?? []) as Array<{ status: string; hours_completed: number }>

  return {
    courses_completed: entries.filter(e => e.status === 'completed').length,
    courses_in_progress: entries.filter(e => e.status === 'in_progress').length,
    total_hours: entries.reduce((sum, e) => sum + (e.hours_completed || 0), 0),
  }
}

async function getEngagementSummary(companyId: string, employeeId: string) {
  const [recognitions, points, badges] = await Promise.all([
    supabase
      .from('gamification_recognitions')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('to_employee_id', employeeId),
    supabase
      .from('gamification_points')
      .select('points')
      .eq('company_id', companyId)
      .eq('employee_id', employeeId),
    supabase
      .from('gamification_employee_badges')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('employee_id', employeeId),
  ])

  const pointsData = (points.data ?? []) as Array<{ points: number }>

  return {
    recognition_count: recognitions.count ?? 0,
    gamification_points: pointsData.reduce((sum, p) => sum + p.points, 0),
    badges_count: badges.count ?? 0,
  }
}

async function getDocumentsSummary(companyId: string, employeeId: string) {
  const { data } = await supabase
    .from('documents')
    .select('status, expiry_date')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)

  const docs = (data ?? []) as Array<{ status: string; expiry_date?: string }>
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  return {
    total: docs.length,
    pending_signatures: docs.filter(d => d.status === 'pending_signature').length,
    expiring_soon: docs.filter(d => {
      if (!d.expiry_date) return false
      const expiry = new Date(d.expiry_date)
      return expiry <= thirtyDaysFromNow && expiry >= now
    }).length,
  }
}
