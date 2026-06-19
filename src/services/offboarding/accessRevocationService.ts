import { supabase } from '../../lib/supabase'

/* ============================================================
   Access Revocation Service
   Tracks system access revocation during offboarding.
   ============================================================ */

export type AccessType = 'app' | 'email' | 'payroll' | 'storage' | 'building' | 'device' | 'third_party' | 'other'
export type RevocationStatus = 'pending' | 'scheduled' | 'revoked' | 'failed' | 'skipped'

export interface AccessRevocation {
  id: string
  company_id: string
  offboarding_case_id: string
  employee_user_id: string
  system_name: string
  access_type: AccessType
  revocation_required: boolean
  status: RevocationStatus
  scheduled_at?: string
  revoked_at?: string
  revoked_by?: string
  failure_reason?: string
  skip_reason?: string
  created_at: string
  updated_at: string
}

export async function createAccessRevocation(
  companyId: string,
  caseId: string,
  employeeUserId: string,
  input: { systemName: string; accessType: AccessType; scheduledAt?: string }
): Promise<AccessRevocation> {
  const { data, error } = await supabase
    .from('offboarding_access_revocations')
    .insert({
      company_id: companyId,
      offboarding_case_id: caseId,
      employee_user_id: employeeUserId,
      system_name: input.systemName,
      access_type: input.accessType,
      scheduled_at: input.scheduledAt || null,
      status: input.scheduledAt ? 'scheduled' : 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as AccessRevocation
}

export async function markAccessRevoked(
  revocationId: string,
  revokedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('offboarding_access_revocations')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', revocationId)
  if (error) throw error
}

export async function markAccessFailed(
  revocationId: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 3) throw new Error('Failure reason required')
  const { error } = await supabase
    .from('offboarding_access_revocations')
    .update({ status: 'failed', failure_reason: reason.trim(), updated_at: new Date().toISOString() })
    .eq('id', revocationId)
  if (error) throw error
}

export async function skipAccessRevocation(
  revocationId: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 3) throw new Error('Skip reason required')
  const { error } = await supabase
    .from('offboarding_access_revocations')
    .update({ status: 'skipped', skip_reason: reason.trim(), updated_at: new Date().toISOString() })
    .eq('id', revocationId)
  if (error) throw error
}

export async function getAccessRevocations(caseId: string): Promise<AccessRevocation[]> {
  const { data, error } = await supabase
    .from('offboarding_access_revocations')
    .select('*')
    .eq('offboarding_case_id', caseId)
    .order('system_name')
  if (error) throw error
  return (data ?? []) as unknown as AccessRevocation[]
}
