import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

export interface SessionPolicy {
  id: string
  company_id: string
  max_session_hours: number
  idle_timeout_minutes: number
  require_mfa: boolean
  ip_allowlist: string[]
  created_at: string
  updated_at: string
}

export interface UpdateSessionPolicyInput {
  max_session_hours?: number
  idle_timeout_minutes?: number
  require_mfa?: boolean
  ip_allowlist?: string[]
}

export interface SecurityEventInput {
  company_id: string
  user_id?: string
  event_type: string
  ip_address?: string
  user_agent?: string
  details?: Record<string, unknown>
}

export interface SecurityEvent {
  id: string
  company_id: string
  user_id: string | null
  event_type: string
  ip_address: string | null
  user_agent: string | null
  details: Record<string, unknown>
  created_at: string
}

/**
 * Session policy & security event service — company-scoped, owner/admin writes.
 */
export const sessionService = {
  /**
   * Get session policy for a company.
   * Returns null if no policy exists (defaults: 8h session, 30min idle).
   */
  getSessionPolicy: async (companyId: string): Promise<SessionPolicy | null> => {
    const { data, error } = await supabase
      .from('session_policies')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  /**
   * Create or update session policy for a company.
   * Only owner/admin can call this.
   */
  updateSessionPolicy: async (companyId: string, input: UpdateSessionPolicyInput): Promise<SessionPolicy> => {
    const canWrite = await hasPermission('session_policy', 'write')
    if (!canWrite) throw new Error('Insufficient permissions: session_policy_write required')

    // Clamp values to safe ranges
    const maxSessionHours = Math.max(1, Math.min(input.max_session_hours ?? 8, 72))
    const idleTimeoutMinutes = Math.max(5, Math.min(input.idle_timeout_minutes ?? 30, 480))

    const { data: existing } = await supabase
      .from('session_policies')
      .select('id')
      .eq('company_id', companyId)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('session_policies')
        .update({
          max_session_hours: maxSessionHours,
          idle_timeout_minutes: idleTimeoutMinutes,
          require_mfa: input.require_mfa ?? false,
          ip_allowlist: input.ip_allowlist ?? [],
        })
        .eq('id', existing.id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (error) throw error
      return data
    }

    const { data, error } = await supabase
      .from('session_policies')
      .insert({
        company_id: companyId,
        max_session_hours: maxSessionHours,
        idle_timeout_minutes: idleTimeoutMinutes,
        require_mfa: input.require_mfa ?? false,
        ip_allowlist: input.ip_allowlist ?? [],
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Validate a session against the company's policy.
   * Uses the SQL function validate_company_session for server-side enforcement.
   */
  validateSession: async (
    _sessionId: string,
    companyId: string
  ): Promise<{ valid: boolean; reason?: string }> => {
    const { data, error } = await supabase.rpc('validate_company_session', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_company_id: companyId,
      p_session_started_at: new Date().toISOString(),
      p_last_active_at: new Date().toISOString(),
    })

    if (error) throw error

    const result = data as { valid: boolean; reason?: string }
    return result
  },

  /**
   * Log a security event. Company_id is required and enforced by RLS.
   */
  logSecurityEvent: async (input: SecurityEventInput): Promise<SecurityEvent> => {
    const { data, error } = await supabase
      .from('security_events')
      .insert({
        company_id: input.company_id,
        user_id: input.user_id ?? null,
        event_type: input.event_type,
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
        details: input.details ?? {},
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get recent security events for a company.
   */
  getSecurityEvents: async (
    companyId: string,
    filters: { event_type?: string; limit?: number } = {}
  ): Promise<SecurityEvent[]> => {
    const { event_type, limit = 50 } = filters

    let query = supabase
      .from('security_events')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (event_type) {
      query = query.eq('event_type', event_type)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as SecurityEvent[]
  },
}
