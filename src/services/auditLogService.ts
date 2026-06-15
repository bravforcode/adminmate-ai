import { supabase } from '../lib/supabase'

export interface AuditLogFilters {
  action?: string
  user_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface AuditLogEntry {
  id: string
  user_id: string
  action: string
  resource_type?: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  created_at: string
  user_profiles?: { full_name?: string; email?: string }
}

export interface AuditLogStats {
  total_logs: number
  today_count: number
  unique_users: number
  top_actions: { action: string; count: number }[]
}

const PAGE_SIZE = 25

export const auditLogService = {
  getAuditLogs: async (companyId: string, filters: AuditLogFilters = {}) => {
    const { action, user_id, date_from, date_to, page = 1, limit = PAGE_SIZE } = filters
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('audit_logs')
      .select('id, user_id, action, resource_type, resource_id, details, ip_address, created_at, user_profiles(full_name, email)', { count: 'exact' })
      .eq('company_id', companyId)

    if (action) query = query.eq('action', action)
    if (user_id) query = query.eq('user_id', user_id)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to + 'T23:59:59')

    query = query.order('created_at', { ascending: false }).range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    return {
      logs: (data ?? []) as AuditLogEntry[],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  },

  getAuditLogStats: async (companyId: string): Promise<AuditLogStats> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    const [totalRes, todayRes, uniqueRes, topActionsRes] = await Promise.all([
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', todayStr),
      supabase.from('audit_logs').select('user_id').eq('company_id', companyId),
      supabase.from('audit_logs').select('action').eq('company_id', companyId).gte('created_at', todayStr),
    ])

    const uniqueUsers = new Set((uniqueRes.data ?? []).map((r: { user_id: string }) => r.user_id)).size

    const actionCounts: Record<string, number> = {}
    for (const row of (topActionsRes.data ?? []) as { action: string }[]) {
      actionCounts[row.action] = (actionCounts[row.action] || 0) + 1
    }
    const top_actions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      total_logs: totalRes.count ?? 0,
      today_count: todayRes.count ?? 0,
      unique_users: uniqueUsers,
      top_actions,
    }
  },

  exportToCSV: (logs: AuditLogEntry[]): string => {
    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Details']
    const rows = logs.map(log => [
      new Date(log.created_at).toISOString(),
      log.user_profiles?.full_name ?? 'Unknown',
      log.user_profiles?.email ?? '',
      log.action,
      log.resource_type ?? '',
      log.resource_id ?? '',
      log.ip_address ?? '',
      log.details ? JSON.stringify(log.details) : '',
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    return csvContent
  },

  downloadCSV: (logs: AuditLogEntry[], filename = 'audit-logs.csv') => {
    const csv = auditLogService.exportToCSV(logs)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  },
}
