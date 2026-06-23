import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { auditLogService, type AuditLogEntry, type AuditLogFilters } from '../../services/auditLogService'
import { supabase } from '../../lib/supabase'
import {
  ScrollText,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Activity,
  Users,
  TrendingUp,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { LoadingState } from '../../components/shared/LoadingState'
import { EmptyState } from '../../components/shared/EmptyState'

const ACTION_OPTIONS = [
  'user_login',
  'user_logout',
  'candidate_created',
  'candidate_updated',
  'candidate_deleted',
  'job_created',
  'job_updated',
  'job_published',
  'application_submitted',
  'application_status_changed',
  'interview_scheduled',
  'interview_completed',
  'offer_created',
  'offer_sent',
  'document_uploaded',
  'document_signed',
  'mfa_enabled',
  'mfa_disabled',
  'settings_updated',
  'role_changed',
  'company_updated',
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function AuditLogPage() {
  const { t } = useTranslation('common')
  const company = useAuthStore(s => s.company)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [stats, setStats] = useState({ total_logs: 0, today_count: 0, unique_users: 0, top_actions: [] as { action: string; count: number }[] })
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const result = await auditLogService.getAuditLogs(company.id, { ...filters, page })
      setLogs(result.logs)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [company?.id, filters, page])

  const fetchStats = useCallback(async () => {
    if (!company?.id) return
    try {
      const s = await auditLogService.getAuditLogStats(company.id)
      setStats(s)
    } catch (err) {
      console.error('Failed to fetch audit log stats:', err)
    }
  }, [company?.id])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (!company?.id) return
    const channel = supabase
      .channel('audit-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `company_id=eq.${company.id}` }, () => {
        fetchLogs()
        fetchStats()
      })
      .subscribe()
    channelRef.current = channel
    return () => { channel.unsubscribe(); channelRef.current = null }
  }, [company?.id, fetchLogs, fetchStats])

  const handleExport = () => {
    if (logs.length === 0) return
    auditLogService.downloadCSV(logs, `audit-logs-${company?.id}-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const applyFilter = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setPage(1)
  }

  const hasActiveFilters = Object.keys(filters).length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface flex items-center gap-2">
            <ScrollText size={24} className="text-primary" />
            {t('audit_log.title') || 'Audit Log'}
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {t('audit_log.subtitle') || 'Track all system activity and changes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              showFilters || hasActiveFilters
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low'
            )}
          >
            <Filter size={16} />
            {t('common.filters') || 'Filters'}
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-on-primary" />
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-lg font-medium text-sm hover:bg-surface-container-low disabled:opacity-50 transition-colors"
          >
            <Download size={16} />
            {t('common.export_csv') || 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-outline-variant p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">{t('audit_log.total_events') || 'Total Events'}</p>
            <p className="text-xl font-bold text-on-surface">{stats.total_logs.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <TrendingUp size={20} className="text-secondary" />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">{t('audit_log.today') || 'Today'}</p>
            <p className="text-xl font-bold text-on-surface">{stats.today_count.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
            <Users size={20} className="text-tertiary" />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">{t('audit_log.unique_users') || 'Unique Users'}</p>
            <p className="text-xl font-bold text-on-surface">{stats.unique_users}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-on-surface">{t('common.filters') || 'Filters'}</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                <X size={12} /> {t('audit_log.clear_filters') || 'Clear filters'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">{t('audit_log.action') || 'Action'}</label>
              <select
                value={filters.action || ''}
                onChange={e => applyFilter('action', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">{t('common.all') || 'All'}</option>
                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">{t('audit_log.date_from') || 'From'}</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={e => applyFilter('date_from', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">{t('audit_log.date_to') || 'To'}</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={e => applyFilter('date_to', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">{t('audit_log.user') || 'User ID'}</label>
              <input
                type="text"
                value={filters.user_id || ''}
                onChange={e => applyFilter('user_id', e.target.value)}
                placeholder={t('audit_log.filter_by_user') || 'Filter by user ID...'}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><LoadingState variant="cards" rows={5} /></div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={t('empty.audit_log_title')}
            description={t('empty.audit_log_description')}
          />
        ) : (
          <div className="table-responsive overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-surface-container dark:bg-surface-container/50 border-b border-outline-variant/50 dark:border-outline/50">
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('audit_log.timestamp') || 'Timestamp'}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('audit_log.user') || 'User'}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('audit_log.action') || 'Action'}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('audit_log.resource') || 'Resource'}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('audit_log.details') || 'Details'}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('audit_log.ip_address') || 'IP Address'}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-outline-variant/50 dark:border-outline/50 last:border-0 hover:bg-surface-container-high/50 dark:hover:bg-surface-container/30 transition-colors duration-150">
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface">
                      <div>
                        <div className="font-medium text-on-surface dark:text-on-surface">{log.user_profiles?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-on-surface-variant dark:text-on-surface-variant">{log.user_profiles?.email || ''}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface text-on-surface-variant">
                      {log.resource_type && <span className="font-medium">{log.resource_type}</span>}
                      {log.resource_id && <span className="text-on-surface-variant/60 ml-1">#{log.resource_id.slice(0, 8)}</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface text-on-surface-variant max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface text-on-surface-variant font-mono text-xs">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant">
              {t('audit_log.showing', { from: (page - 1) * 25 + 1, to: Math.min(page * 25, total), total }) || `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-surface-container-high disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                const p = start + i
                if (p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                      p === page ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high text-on-surface'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-surface-container-high disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditLogPage
