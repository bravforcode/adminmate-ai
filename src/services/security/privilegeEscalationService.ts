import { supabase } from '../../lib/supabase'

export interface PrivilegeChange {
  id: string
  user_id: string
  user_email: string
  previous_role: string
  new_role: string
  changed_by: string
  changed_at: string
  reason?: string
}

export interface ComplianceViolation {
  role: string
  resource: string
  action: string
  is_allowed: boolean
  expected: boolean
}

export interface EscalationDetection {
  escalated: boolean
  changes: PrivilegeChange[]
  detected_at: string
}

export interface ComplianceCheckResult {
  compliant: boolean
  violations: ComplianceViolation[]
  checked_at: string
}

const HIGH_PRIVILEGE_ROLES = ['super_admin', 'owner']
const ESCALATION_WINDOW_MS = 24 * 60 * 60 * 1000

export const privilegeEscalationService = {
  detectEscalation: async (
    companyId: string,
    windowMs: number = ESCALATION_WINDOW_MS
  ): Promise<EscalationDetection> => {
    const since = new Date(Date.now() - windowMs).toISOString()

    const { data: changes, error } = await supabase
      .from('user_role_history')
      .select('*')
      .eq('company_id', companyId)
      .gte('changed_at', since)
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch privilege changes:', error.message)
      return { escalated: false, changes: [], detected_at: new Date().toISOString() }
    }

    const roleChanges = (changes ?? []) as PrivilegeChange[]
    const escalated = roleChanges.some(
      c => HIGH_PRIVILEGE_ROLES.includes(c.new_role)
    )

    return {
      escalated,
      changes: roleChanges,
      detected_at: new Date().toISOString(),
    }
  },

  getAuditTrail: async (
    companyId: string,
    userId?: string,
    limit: number = 50
  ): Promise<PrivilegeChange[]> => {
    let query = supabase
      .from('user_role_history')
      .select('*')
      .eq('company_id', companyId)
      .order('changed_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch audit trail:', error.message)
      return []
    }

    return (data ?? []) as PrivilegeChange[]
  },

  checkCompliance: async (companyId: string): Promise<ComplianceCheckResult> => {
    const { data: snapshot, error: snapError } = await supabase
      .from('rbac_matrix_snapshots')
      .select('*')
      .eq('company_id', companyId)
      .order('snapshot_date', { ascending: false })
      .limit(100)

    if (snapError) {
      console.error('Failed to fetch RBAC snapshot:', snapError.message)
      return { compliant: true, violations: [], checked_at: new Date().toISOString() }
    }

    const entries = (snapshot ?? []) as {
      role: string
      resource: string
      action: string
      is_allowed: boolean
    }[]

    const violations: ComplianceViolation[] = entries
      .filter(e => HIGH_PRIVILEGE_ROLES.includes(e.role) && !e.is_allowed)
      .map(e => ({
        role: e.role,
        resource: e.resource,
        action: e.action,
        is_allowed: e.is_allowed,
        expected: true,
      }))

    return {
      compliant: violations.length === 0,
      violations,
      checked_at: new Date().toISOString(),
    }
  },
}
