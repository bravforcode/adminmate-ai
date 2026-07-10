import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   SCIM 2.0 Provisioning Service
   User lifecycle management via System for Cross-domain Identity
   Management protocol. Integrates with Okta, Azure AD, etc.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

export interface SCIMUser {
  id: string
  external_id: string
  user_name: string
  display_name: string
  emails: Array<{ value: string; primary: boolean }>
  active: boolean
  groups: Array<{ value: string; display: string }>
  meta: {
    resource_type: string
    created: string
    last_modified: string
  }
}

export interface SCIMGroup {
  id: string
  display_name: string
  members: Array<{ value: string }>
}

export interface SCIMProvisioningLog {
  id: string
  company_id: string
  action: 'create' | 'update' | 'deprovision'
  external_id: string
  user_name: string
  status: 'success' | 'failed'
  details?: string
  created_at: string
}

export interface RoleMapping {
  external_group: string
  internal_role: string
}

// ── Constants ───────────────────────────────────────────────

const DEFAULT_ROLE_MAP: RoleMapping[] = [
  { external_group: 'HR Admin', internal_role: 'admin' },
  { external_group: 'HR Manager', internal_role: 'hr' },
  { external_group: 'People Manager', internal_role: 'manager' },
  { external_group: 'Employee', internal_role: 'employee' },
]

// ── SCIM User Provisioning ─────────────────────────────────

/**
 * Provision a new user from SCIM push.
 * Called by IdP when a user is assigned to the app.
 */
export async function provisionUser(
  companyId: string,
  scimUser: SCIMUser,
  roleMappings?: RoleMapping[]
): Promise<{ userId: string; action: 'created' | 'updated' }> {
  const canWrite = await hasPermission('sso', 'write')
  if (!canWrite) throw new Error('Requires sso_write permission')

  const mappings = roleMappings || DEFAULT_ROLE_MAP

  // Map SCIM groups to internal role
  const internalRole = mapGroupsToRole(scimUser.groups, mappings)

  // Check if user already exists by external_id
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id, email')
    .eq('scim_external_id', scimUser.external_id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (existing) {
    // Update existing user
    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: scimUser.display_name,
        role: internalRole,
        is_active: scimUser.active,
        scim_last_sync: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) throw error

    await logProvisioning(companyId, 'update', scimUser, 'success')
    return { userId: existing.id, action: 'updated' }
  }

  // Create new user
  const primaryEmail = scimUser.emails.find(e => e.primary)?.value || scimUser.emails[0]?.value
  if (!primaryEmail) {
    await logProvisioning(companyId, 'create', scimUser, 'failed', 'No primary email')
    throw new Error('SCIM user has no email')
  }

  const { data: newUser, error } = await supabase
    .from('user_profiles')
    .insert({
      company_id: companyId,
      email: primaryEmail,
      full_name: scimUser.display_name,
      role: internalRole,
      is_active: scimUser.active,
      scim_external_id: scimUser.external_id,
      scim_last_sync: new Date().toISOString(),
      auth_provider: 'sso',
    })
    .select('id')
    .single()

  if (error) {
    await logProvisioning(companyId, 'create', scimUser, 'failed', error.message)
    throw error
  }

  await logProvisioning(companyId, 'create', scimUser, 'success')
  return { userId: newUser.id, action: 'created' }
}

/**
 * Deprovision a user from SCIM push.
 * Called by IdP when a user is unassigned from the app.
 */
export async function deprovisionUser(
  companyId: string,
  externalId: string
): Promise<void> {
  const canWrite = await hasPermission('sso', 'write')
  if (!canWrite) throw new Error('Requires sso_write permission')

  const { data: user } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('scim_external_id', externalId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!user) {
    // User not found — idempotent success
    return
  }

  // Soft delete: deactivate instead of hard delete
  const { error } = await supabase
    .from('user_profiles')
    .update({
      is_active: false,
      scim_last_sync: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw error

  await logProvisioning(companyId, 'deprovision', {
    id: user.id,
    external_id: externalId,
    user_name: user.email,
    display_name: user.full_name,
    emails: [{ value: user.email, primary: true }],
    active: false,
    groups: [],
    meta: { resource_type: 'User', created: '', last_modified: '' },
  }, 'success')
}

// ── Role Mapping ────────────────────────────────────────────

function mapGroupsToRole(
  groups: Array<{ value: string; display: string }>,
  mappings: RoleMapping[]
): string {
  // Check mappings from most privileged to least
  for (const mapping of mappings) {
    if (groups.some(g => g.display === mapping.external_group || g.value === mapping.external_group)) {
      return mapping.internal_role
    }
  }
  return 'employee' // Default
}

// ── Provisioning Log ────────────────────────────────────────

async function logProvisioning(
  companyId: string,
  action: 'create' | 'update' | 'deprovision',
  scimUser: SCIMUser,
  status: 'success' | 'failed',
  details?: string
): Promise<void> {
  await supabase.from('scim_provisioning_logs').insert({
    company_id: companyId,
    action,
    external_id: scimUser.external_id,
    user_name: scimUser.user_name,
    status,
    details,
  })
}

export async function getProvisioningLogs(
  companyId: string,
  limit = 50
): Promise<SCIMProvisioningLog[]> {
  const { data, error } = await supabase
    .from('scim_provisioning_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as SCIMProvisioningLog[]
}
