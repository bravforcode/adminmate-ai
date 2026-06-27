import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Compliance Framework Service
   Privacy requests, data retention, legal holds,
   grievance cases, whistleblower reports, health & safety.
   ============================================================ */

export type RequestType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restrict_processing' | 'object'
export type PrivacyRequestStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'
export type LegalHoldStatus = 'active' | 'released'
export type GrievanceStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'escalated'
export type WhistleblowerStatus = 'submitted' | 'under_review' | 'investigating' | 'resolved' | 'dismissed'
export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical'
export type IncidentStatus = 'reported' | 'investigating' | 'resolved' | 'closed'
export type RetentionAction = 'anonymize' | 'delete' | 'archive'

export interface PrivacyRequest {
  id: string
  company_id: string
  employee_id: string
  request_type: RequestType
  status: PrivacyRequestStatus
  requested_at: string
  completed_at: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface DataRetentionPolicy {
  id: string
  company_id: string
  entity_type: string
  retention_days: number
  action: RetentionAction
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LegalHold {
  id: string
  company_id: string
  entity_type: string
  entity_id: string
  reason: string
  placed_by: string
  placed_at: string
  released_by: string | null
  released_at: string | null
  status: LegalHoldStatus
  created_at: string
}

export interface GrievanceCase {
  id: string
  company_id: string
  reporter_id: string
  category: string
  description: string
  status: GrievanceStatus
  assigned_to: string | null
  resolution: string | null
  created_at: string
  updated_at: string
}

export interface WhistleblowerReport {
  id: string
  company_id: string
  anonymous_id: string
  category: string
  description: string
  status: WhistleblowerStatus
  assigned_to: string | null
  resolution: string | null
  created_at: string
  updated_at: string
}

export interface HealthSafetyIncident {
  id: string
  company_id: string
  reporter_id: string
  incident_date: string
  location: string | null
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  investigated_by: string | null
  investigation_notes: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Logging helper — sensitive field access must be logged
// ============================================================
async function logSensitiveAccess(
  action: string,
  entityType: string,
  entityId: string,
  companyId?: string,
  details?: Record<string, unknown>
) {
  await supabase.from('audit_logs').insert({
    company_id: companyId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? {},
  })
}

// ============================================================
// Privacy Requests
// ============================================================
export async function createPrivacyRequest(input: {
  company_id: string
  employee_id: string
  request_type: RequestType
  notes?: string
}): Promise<PrivacyRequest> {
  if (!(await hasPermission('compliance', 'privacy_request'))) {
    throw new Error('Permission denied: compliance.privacy_request')
  }

  const { data, error } = await supabase
    .from('privacy_requests')
    .insert({
      company_id: input.company_id,
      employee_id: input.employee_id,
      request_type: input.request_type,
      notes: input.notes ?? null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single()

  if (error) throw error

  await logSensitiveAccess('privacy_request_created', 'privacy_request', data.id, input.company_id, {
    request_type: input.request_type,
    employee_id: input.employee_id,
  })

  return data as PrivacyRequest
}

// ============================================================
// Grievance Cases
// ============================================================
export async function createGrievanceCase(input: {
  company_id: string
  reporter_id: string
  category: string
  description: string
}): Promise<GrievanceCase> {
  if (!(await hasPermission('compliance', 'write'))) {
    throw new Error('Permission denied: compliance.write')
  }

  const { data, error } = await supabase
    .from('grievance_cases')
    .insert({
      company_id: input.company_id,
      reporter_id: input.reporter_id,
      category: input.category,
      description: input.description,
    })
    .select()
    .single()

  if (error) throw error

  await logSensitiveAccess('grievance_created', 'grievance_case', data.id, input.company_id, {
    category: input.category,
  })

  return data as GrievanceCase
}

// ============================================================
// Whistleblower Reports (anonymous — no employee_id stored)
// ============================================================
export async function createWhistleblowerReport(
  companyId: string,
  anonymousId: string,
  category: string,
  description: string
): Promise<WhistleblowerReport> {
  if (!(await hasPermission('whistleblower', 'write'))) {
    throw new Error('Permission denied: whistleblower.write')
  }

  const { data, error } = await supabase
    .from('whistleblower_reports')
    .insert({
      company_id: companyId,
      anonymous_id: anonymousId,
      category,
      description,
    })
    .select()
    .single()

  if (error) throw error

  await logSensitiveAccess('whistleblower_report_created', 'whistleblower_report', data.id, companyId, {
    category,
  })

  return data as WhistleblowerReport
}

// ============================================================
// Health & Safety Incidents
// ============================================================
export async function createSafetyIncident(input: {
  company_id: string
  reporter_id: string
  incident_date: string
  location?: string
  description: string
  severity: IncidentSeverity
}): Promise<HealthSafetyIncident> {
  if (!(await hasPermission('health_safety', 'write'))) {
    throw new Error('Permission denied: health_safety.write')
  }

  const { data, error } = await supabase
    .from('health_safety_incidents')
    .insert({
      company_id: input.company_id,
      reporter_id: input.reporter_id,
      incident_date: input.incident_date,
      location: input.location ?? null,
      description: input.description,
      severity: input.severity,
    })
    .select()
    .single()

  if (error) throw error

  await logSensitiveAccess('safety_incident_created', 'health_safety_incident', data.id, input.company_id, {
    severity: input.severity,
    location: input.location,
  })

  return data as HealthSafetyIncident
}

// ============================================================
// Legal Holds
// ============================================================
export async function placeLegalHold(input: {
  company_id: string
  entity_type: string
  entity_id: string
  reason: string
}): Promise<LegalHold> {
  if (!(await hasPermission('compliance', 'legal_hold'))) {
    throw new Error('Permission denied: compliance.legal_hold')
  }

  const userId = (await supabase.auth.getUser()).data.user?.id

  const { data, error } = await supabase
    .from('legal_holds')
    .insert({
      company_id: input.company_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      reason: input.reason,
      placed_by: userId,
    })
    .select()
    .single()

  if (error) throw error

  await logSensitiveAccess('legal_hold_placed', 'legal_hold', data.id, input.company_id, {
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    reason: input.reason,
  })

  return data as LegalHold
}

/**
 * Check if an entity is under active legal hold.
 * Returns true if entity is held — deletion/purge MUST be blocked.
 */
export async function checkLegalHold(
  entityType: string,
  entityId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('legal_holds')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'active')
    .limit(1)

  if (error) throw error

  const isHeld = (data ?? []).length > 0

  if (isHeld) {
    await logSensitiveAccess('legal_hold_check_positive', 'legal_hold', entityId, undefined, {
      entity_type: entityType,
    })
  }

  return isHeld
}
