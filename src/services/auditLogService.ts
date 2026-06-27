import { supabase } from '../lib/supabase'

export interface AuditLogFilters {
  action?: string
  user_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
  cursor?: string
}

export interface PaginatedResult<T> {
  data: T[]
  cursor: string | null
  hasMore: boolean
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
  getAuditLogs: async (companyId: string, filters: AuditLogFilters = {}): Promise<PaginatedResult<AuditLogEntry>> => {
    const { action, user_id, date_from, date_to, limit = PAGE_SIZE, cursor } = filters

    const fetchLimit = limit + 1
    let query = supabase
      .from('audit_logs')
      .select('id, user_id, action, resource_type, resource_id, details, ip_address, created_at, user_profiles(full_name, email)')
      .eq('company_id', companyId)

    if (action) query = query.eq('action', action)
    if (user_id) query = query.eq('user_id', user_id)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to + 'T23:59:59')
    if (cursor) query = query.lt('created_at', cursor)

    query = query.order('created_at', { ascending: false }).limit(fetchLimit)

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as AuditLogEntry[]
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? items[items.length - 1].created_at : null

    return { data: items, cursor: nextCursor, hasMore }
  },

  getAuditLogStats: async (companyId: string): Promise<AuditLogStats> => {
    const { data, error } = await supabase.rpc('get_audit_log_stats', { p_company_id: companyId })
    if (error) throw error
    const row = data as Record<string, unknown>
    return {
      total_logs: (row.total_logs as number) ?? 0,
      today_count: (row.today_count as number) ?? 0,
      unique_users: (row.unique_users as number) ?? 0,
      top_actions: (row.top_actions as { action: string; count: number }[]) ?? [],
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
