import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'

export interface SecurityAuditEvent {
  company_id: string
  event_type: string
  severity?: 'info' | 'warning' | 'critical'
  resource_type?: string
  resource_id?: string
  details?: Record<string, unknown>
}

export interface SecurityAuditLogFilters {
  event_type?: string
  severity?: string
  resource_type?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface SecurityAuditLogEntry {
  id: string
  company_id: string
  event_type: string
  severity: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown> | null
  detected_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export interface RLSVerificationResult {
  table_name: string
  policy_name: string
  verification_status: string
  notes?: string
}

export interface RBACMatrixEntry {
  role: string
  resource: string
  action: string
  is_allowed: boolean
}

const PAGE_SIZE = 50

export const securityAuditService = {
  logSecurityAudit: async (event: SecurityAuditEvent): Promise<SecurityAuditLogEntry | null> => {
    const { data, error } = await supabase
      .from('security_audit_log')
      .insert({
        company_id: event.company_id,
        event_type: event.event_type,
        severity: event.severity ?? 'info',
        resource_type: event.resource_type ?? null,
        resource_id: event.resource_id ?? null,
        details: event.details ?? {},
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to log security audit event', { error: error.message })
      return null
    }
    return data as SecurityAuditLogEntry
  },

  verifyRLS: async (tableNames: string[]): Promise<RLSVerificationResult[]> => {
    const results: RLSVerificationResult[] = []

    for (const tableName of tableNames) {
      const { data: policies, error } = await supabase
        .rpc('verify_table_rls', { p_table_name: tableName })

      if (error) {
        results.push({
          table_name: tableName,
          policy_name: 'unknown',
          verification_status: 'error',
          notes: error.message,
        })
        continue
      }

      const policyList = (policies ?? []) as { policy_name: string; is_active: boolean }[]

      if (policyList.length === 0) {
        results.push({
          table_name: tableName,
          policy_name: 'none',
          verification_status: 'missing',
          notes: 'No RLS policies found',
        })
      } else {
        for (const policy of policyList) {
          results.push({
            table_name: tableName,
            policy_name: policy.policy_name,
            verification_status: policy.is_active ? 'pass' : 'inactive',
          })
        }
      }
    }

    const { error: insertError } = await supabase
      .from('rls_verification_results')
      .insert(results.map(r => ({
        table_name: r.table_name,
        policy_name: r.policy_name,
        verification_status: r.verification_status,
        notes: r.notes ?? null,
      })))

    if (insertError) {
      logger.error('Failed to persist RLS verification results', { error: insertError.message })
    }

    return results
  },

  snapshotRBACMatrix: async (companyId: string): Promise<RBACMatrixEntry[]> => {
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')

    if (rolesError) {
      logger.error('Failed to fetch roles', { error: rolesError.message })
      return []
    }

    const { data: permissions, error: permsError } = await supabase
      .from('permissions')
      .select('id, resource, action')

    if (permsError) {
      logger.error('Failed to fetch permissions', { error: permsError.message })
      return []
    }

    const { data: rolePerms, error: rpError } = await supabase
      .from('role_permissions')
      .select('role_id, permission_id')

    if (rpError) {
      logger.error('Failed to fetch role_permissions', { error: rpError.message })
      return []
    }

    const allowedSet = new Set<string>()
    for (const rp of rolePerms ?? []) {
      allowedSet.add(`${rp.role_id}:${rp.permission_id}`)
    }

    const entries: RBACMatrixEntry[] = []
    const today = new Date().toISOString().split('T')[0]

    for (const role of roles ?? []) {
      for (const perm of permissions ?? []) {
        const isAllowed = allowedSet.has(`${role.id}:${perm.id}`)
        entries.push({
          role: role.name,
          resource: perm.resource,
          action: perm.action,
          is_allowed: isAllowed,
        })
      }
    }

    const snapshotRows = entries.map(e => ({
      company_id: companyId,
      role: e.role,
      resource: e.resource,
      action: e.action,
      is_allowed: e.is_allowed,
      snapshot_date: today,
    }))

    const { error: insertError } = await supabase
      .from('rbac_matrix_snapshots')
      .upsert(snapshotRows, {
        onConflict: 'company_id,role,resource,action,snapshot_date',
      })

    if (insertError) {
      logger.error('Failed to persist RBAC matrix snapshot', { error: insertError.message })
    }

    return entries
  },

  getSecurityAuditLog: async (
    companyId: string,
    filters: SecurityAuditLogFilters = {}
  ): Promise<{
    logs: SecurityAuditLogEntry[]
    total: number
    page: number
    totalPages: number
  }> => {
    const { event_type, severity, resource_type, date_from, date_to, page = 1, limit = PAGE_SIZE } = filters
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('security_audit_log')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)

    if (event_type) query = query.eq('event_type', event_type)
    if (severity) query = query.eq('severity', severity)
    if (resource_type) query = query.eq('resource_type', resource_type)
    if (date_from) query = query.gte('detected_at', date_from)
    if (date_to) query = query.lte('detected_at', date_to + 'T23:59:59')

    query = query.order('detected_at', { ascending: false }).range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    return {
      logs: (data ?? []) as SecurityAuditLogEntry[],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  },
}
