import { supabase } from '../../lib/supabase'

export interface PlatformAdminUser {
  id: string
  user_id: string
  role: 'owner' | 'support'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SupportAccessGrant {
  id: string
  admin_user_id: string
  company_id: string
  reason: string
  expires_at: string
  granted_by: string
  granted_at: string
  revoked_by: string | null
  revoked_at: string | null
  is_active: boolean
  created_at: string
  platform_admin_users?: PlatformAdminUser
}

export interface TenantSupportNote {
  id: string
  company_id: string
  admin_user_id: string
  note: string
  created_at: string
}

export interface PlatformAuditLog {
  id: string
  admin_user_id: string
  company_id: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

export interface GrantAccessParams {
  adminUserId: string
  companyId: string
  reason: string
  expiresAt: string
}

export const adminService = {
  /**
   * Grant support access to a company. Only platform_owner can call this.
   * Access is time-limited and expires_at must be in the future.
   * Every grant is logged to platform_audit_logs for customer audit visibility.
   */
  grantSupportAccess: async (
    adminUserId: string,
    companyId: string,
    reason: string,
    expiresAt: string
  ): Promise<SupportAccessGrant> => {
    const expiry = new Date(expiresAt)
    if (expiry <= new Date()) {
      throw new Error('expires_at must be in the future')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: grant, error } = await supabase
      .from('support_access_grants')
      .insert({
        admin_user_id: adminUserId,
        company_id: companyId,
        reason,
        expires_at: expiresAt,
        granted_by: (await supabase
          .from('platform_admin_users')
          .select('id')
          .eq('user_id', user.id)
          .single()
        ).data?.id ?? user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Log to platform_audit_logs — impersonation is NEVER silent
    await adminService.logPlatformAction(
      (await supabase
        .from('platform_admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()
      ).data?.id ?? user.id,
      companyId,
      'support_access_granted',
      {
        target_admin_id: adminUserId,
        reason,
        expires_at: expiresAt,
      }
    )

    return grant as SupportAccessGrant
  },

  /**
   * Revoke an active support grant. Records revoked_by and revoked_at.
   * Logged to platform_audit_logs for audit trail.
   */
  revokeSupportAccess: async (
    grantId: string,
    revokedBy: string
  ): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const adminId = (await supabase
      .from('platform_admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()
    ).data?.id ?? user.id

    const { data: grant, error: fetchError } = await supabase
      .from('support_access_grants')
      .select('id, company_id')
      .eq('id', grantId)
      .single()

    if (fetchError) throw fetchError

    const { error } = await supabase
      .from('support_access_grants')
      .update({
        is_active: false,
        revoked_by: revokedBy,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', grantId)

    if (error) throw error

    await adminService.logPlatformAction(
      adminId,
      grant.company_id,
      'support_access_revoked',
      {
        grant_id: grantId,
        revoked_by: revokedBy,
      }
    )
  },

  /**
   * Log a platform admin action to the platform_audit_logs table.
   * This is the core audit mechanism — all internal ops actions are recorded.
   */
  logPlatformAction: async (
    adminUserId: string,
    companyId: string,
    action: string,
    details: Record<string, unknown> = {}
  ): Promise<void> => {
    const { error } = await supabase
      .from('platform_audit_logs')
      .insert({
        admin_user_id: adminUserId,
        company_id: companyId,
        action,
        details,
      })

    if (error) throw error
  },

  /**
   * Get all active support grants for a company.
   * Filters out expired grants from the result.
   */
  getSupportGrants: async (companyId: string): Promise<SupportAccessGrant[]> => {
    const { data, error } = await supabase
      .from('support_access_grants')
      .select('*, platform_admin_users!admin_user_id(*)')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('granted_at', { ascending: false })

    if (error) throw error

    return (data ?? []) as SupportAccessGrant[]
  },
}
