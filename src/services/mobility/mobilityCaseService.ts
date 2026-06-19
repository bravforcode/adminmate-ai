import { supabase } from '../../lib/supabase'

/* ============================================================
   Mobility Case Service
   Immigration cases, visa, work permit tracking.
   ============================================================ */

export type MobilityCaseStatus = 'draft' | 'pending_documents' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'expired' | 'cancelled'
export type MobilityPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ImmigrationCase {
  id: string
  company_id: string
  employee_id?: string
  candidate_id?: string
  legal_entity_id?: string
  case_type: string
  destination_country_code: string
  home_country_code?: string
  status: MobilityCaseStatus
  priority: MobilityPriority
  assigned_to?: string
  notes?: string
  opened_at: string
  target_start_date?: string
  expiry_date?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export async function createMobilityCase(
  companyId: string,
  input: {
    employeeId?: string
    candidateId?: string
    caseType: string
    destinationCountryCode: string
    homeCountryCode?: string
    priority?: MobilityPriority
    targetStartDate?: string
    expiryDate?: string
    notes?: string
  },
  createdBy: string
): Promise<ImmigrationCase> {
  const { data, error } = await supabase
    .from('immigration_cases')
    .insert({
      company_id: companyId,
      employee_id: input.employeeId || null,
      candidate_id: input.candidateId || null,
      case_type: input.caseType,
      destination_country_code: input.destinationCountryCode,
      home_country_code: input.homeCountryCode || null,
      status: 'draft',
      priority: input.priority || 'medium',
      target_start_date: input.targetStartDate || null,
      expiry_date: input.expiryDate || null,
      notes: input.notes || null,
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: createdBy,
    action: 'mobility.case_created',
    resource_type: 'immigration_case',
    resource_id: data.id,
    details: JSON.stringify({ case_type: input.caseType, destination: input.destinationCountryCode }),
  })

  return data as unknown as ImmigrationCase
}

export async function getMobilityCase(id: string): Promise<ImmigrationCase | null> {
  const { data, error } = await supabase
    .from('immigration_cases')
    .select('*, visa_applications(*), work_permits(*), immigration_documents(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as ImmigrationCase | null
}

export async function listMobilityCases(
  companyId: string,
  filters?: { status?: string; employeeId?: string }
): Promise<ImmigrationCase[]> {
  let query = supabase
    .from('immigration_cases')
    .select('*, employees!immigration_cases_employee_id_fkey(job_title, employee_profiles(display_name))')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ImmigrationCase[]
}

export async function updateCaseStatus(
  id: string,
  status: MobilityCaseStatus,
  updatedBy: string,
  reason?: string
): Promise<void> {
  const { data: ic } = await supabase.from('immigration_cases').select('company_id').eq('id', id).single()
  if (!ic) throw new Error('Case not found')

  await supabase.from('immigration_cases').update({
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  await supabase.from('audit_logs').insert({
    company_id: ic.company_id,
    user_id: updatedBy,
    action: 'mobility.status_changed',
    resource_type: 'immigration_case',
    resource_id: id,
    details: JSON.stringify({ status, reason }),
  })
}

// ── Business Travel ──

export interface BusinessTravelRequest {
  id: string
  company_id: string
  employee_id: string
  destination_country_code: string
  start_date: string
  end_date: string
  purpose: string
  activity_type: string
  risk_level: string
  estimated_working_days: number
  approval_status: string
  approved_by?: string
  approved_at?: string
  compliance_notes?: string
  host_entity?: string
  inviter_contact?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export async function createBusinessTravelRequest(
  companyId: string,
  employeeId: string,
  input: {
    destinationCountryCode: string
    startDate: string
    endDate: string
    purpose: string
    activityType?: string
    estimatedWorkingDays?: number
    hostEntity?: string
    inviterContact?: string
  },
  createdBy: string
): Promise<BusinessTravelRequest> {
  // Calculate risk level based on destination and duration
  const riskLevel = calculateTravelRisk(input.destinationCountryCode, input.startDate, input.endDate)

  const { data, error } = await supabase
    .from('business_travel_requests')
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      destination_country_code: input.destinationCountryCode,
      start_date: input.startDate,
      end_date: input.endDate,
      purpose: input.purpose,
      activity_type: input.activityType || 'business_meeting',
      risk_level: riskLevel,
      estimated_working_days: input.estimatedWorkingDays || 0,
      host_entity: input.hostEntity || null,
      inviter_contact: input.inviterContact || null,
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as BusinessTravelRequest
}

export async function approveBusinessTravelRequest(
  requestId: string,
  approvedBy: string
): Promise<void> {
  const { data: req } = await supabase.from('business_travel_requests').select('company_id').eq('id', requestId).single()
  if (!req) throw new Error('Travel request not found')

  await supabase.from('business_travel_requests').update({
    approval_status: 'approved',
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', requestId)

  await supabase.from('audit_logs').insert({
    company_id: req.company_id,
    user_id: approvedBy,
    action: 'mobility.travel_approved',
    resource_type: 'business_travel_request',
    resource_id: requestId,
  })
}

export async function rejectBusinessTravelRequest(
  requestId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 3) throw new Error('Rejection reason required')
  const { data: req } = await supabase.from('business_travel_requests').select('company_id').eq('id', requestId).single()
  if (!req) throw new Error('Travel request not found')

  await supabase.from('business_travel_requests').update({
    approval_status: 'rejected',
    updated_at: new Date().toISOString(),
  }).eq('id', requestId)

  await supabase.from('audit_logs').insert({
    company_id: req.company_id,
    user_id: rejectedBy,
    action: 'mobility.travel_rejected',
    resource_type: 'business_travel_request',
    resource_id: requestId,
    details: JSON.stringify({ reason: reason.trim() }),
  })
}

// ── Day Count Calculation ──

export async function calculateCountryDayCounts(
  employeeId: string,
  countryCode: string,
  startDate: string,
  endDate: string
): Promise<{ totalDays: number; workDays: number; visitorDays: number }> {
  const { data } = await supabase
    .from('business_travel_day_counts')
    .select('day_type')
    .eq('employee_id', employeeId)
    .eq('country_code', countryCode)
    .gte('travel_date', startDate)
    .lte('travel_date', endDate)

  const days = data ?? []
  return {
    totalDays: days.length,
    workDays: days.filter(d => d.day_type === 'work').length,
    visitorDays: days.filter(d => d.day_type === 'visitor').length,
  }
}

// ── Visa Expiry Alerts ──

export async function generateVisaExpiryAlerts(companyId: string): Promise<number> {
  const today = new Date()
  const alertDays = [180, 90, 60, 30, 14, 7]
  let alertsCreated = 0

  for (const days of alertDays) {
    const targetDate = new Date(today.getTime() + days * 86400000).toISOString().split('T')[0]

    // Find work permits expiring on target date
    const { data: permits } = await supabase
      .from('work_permits')
      .select('id, employee_id, valid_until, country_code')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .eq('valid_until', targetDate)

    for (const permit of (permits ?? [])) {
      // Check if alert already exists
      const { data: existing } = await supabase
        .from('mobility_alerts')
        .select('id')
        .eq('work_permit_id', permit.id)
        .eq('alert_type', 'visa_expiry')
        .eq('alert_date', targetDate)
        .maybeSingle()

      if (!existing) {
        await supabase.from('mobility_alerts').insert({
          company_id: companyId,
          employee_id: permit.employee_id,
          work_permit_id: permit.id,
          alert_type: 'visa_expiry',
          alert_date: targetDate,
          message: `Work permit for ${permit.country_code} expires in ${days} days (${permit.valid_until})`,
        })
        alertsCreated++
      }
    }
  }

  return alertsCreated
}

function calculateTravelRisk(_countryCode: string, startDate: string, endDate: string): string {
  // Simple risk calculation — in production, use mobility_country_rules
  const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
  if (days > 30) return 'high'
  if (days > 7) return 'medium'
  return 'low'
}
