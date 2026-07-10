import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { leaveService, type LeaveRequestStatus } from '../services/attendance/leaveService'
import { Calendar, Plus, CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { cn } from '../lib/utils'

const statusConfig: Record<LeaveRequestStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', icon: Clock },
  approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: CheckCircle },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', icon: XCircle },
  cancelled: { bg: 'bg-gray-100 bg-surface/30', text: 'text-gray-800 text-ink-faint', icon: XCircle },
}

export function LeavePage() {
  const { t } = useTranslation(['leave', 'common'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', total_days: 1, reason: '' })
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | ''>('')
  const [rejectionModal, setRejectionModal] = useState<{ id: string; reason: string }>({ id: '', reason: '' })

  const currentYear = new Date().getFullYear()

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types', company?.id],
    queryFn: () => company?.id ? leaveService.getLeaveTypes(company.id) : [],
    enabled: !!company?.id,
  })

  const { data: balances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ['leave-balances', profile?.id, currentYear],
    queryFn: () => profile?.id ? leaveService.getLeaveBalances(profile.id, currentYear) : [],
    enabled: !!profile?.id,
  })

  const { data: requestsResult, isLoading: requestsLoading, isError, refetch } = useQuery({
    queryKey: ['leave-requests', company?.id, statusFilter],
    queryFn: async () => {
      if (!company?.id) return { data: [], count: 0 }
      return leaveService.getLeaveRequests(company.id, {
        status: (statusFilter as LeaveRequestStatus) || undefined,
        limit: 50,
      })
    },
    enabled: !!company?.id,
  })

  const requests = requestsResult?.data ?? []

  const createMutation = useMutation({
    mutationFn: () => {
      if (!company?.id || !profile?.id) throw new Error('Missing auth')
      return leaveService.createLeaveRequest(company.id, {
        employee_id: profile.id,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: form.total_days,
        reason: form.reason || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      setShowForm(false)
      setForm({ leave_type_id: '', start_date: '', end_date: '', total_days: 1, reason: '' })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => {
      if (!profile?.id) throw new Error('Missing auth')
      return leaveService.approveLeaveRequest(id, profile.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveService.rejectLeaveRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      setRejectionModal({ id: '', reason: '' })
    },
  })

  const isManager = profile?.role === 'admin' || profile?.role === 'hr' || profile?.role === 'manager'

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const updated = { ...form, [field]: value }
    if (updated.start_date && updated.end_date && updated.end_date >= updated.start_date) {
      const start = new Date(updated.start_date)
      const end = new Date(updated.end_date)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      updated.total_days = diffDays
    }
    setForm(updated)
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background text-ink">{t('title')}</h1>
        </header>
        <ErrorState title={t('common:errors.load_failed')} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background text-ink">{t('title')}</h1>
          <p className="text-body-md text-ink-muted text-ink-muted mt-1">{t('subtitle')}</p>
        </div>
        <Button variant="default" size="sm" onClick={() => setShowForm(!showForm)} icon={<Plus size={16} />}>
          {t('request_leave')}
        </Button>
      </header>

      {showForm && (
        <Card className="border-primary dark:border-primary">
          <CardHeader className="border-b border-surface-container-high bg-surface-raised bg-surface-sunken">
            <CardTitle className="text-lg">{t('form.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('form.leave_type')}</label>
                <select
                  value={form.leave_type_id}
                  onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                >
                  <option value="">{t('form.select_type')}</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('form.total_days')}</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={form.total_days}
                  onChange={(e) => setForm({ ...form, total_days: parseFloat(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('form.start_date')}</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleDateChange('start_date', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('form.end_date')}</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => handleDateChange('end_date', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">{t('form.reason')}</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                placeholder={t('form.reason_placeholder')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>{t('common:cancel')}</Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={!form.leave_type_id || !form.start_date || !form.end_date || createMutation.isPending}
                icon={<Plus size={16} />}
              >
                {createMutation.isPending ? t('form.submitting') : t('form.submit')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balancesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl p-5 border border-border shadow-sm">
              <div className="h-3 w-20 bg-surface-sunken dark:bg-slate-700/40 rounded-lg animate-shimmer mb-3" />
              <div className="h-8 w-16 bg-surface-sunken dark:bg-slate-700/40 rounded-lg animate-shimmer" />
            </div>
          ))
        ) : (
          balances.map(b => {
            const lt = leaveTypes.find(l => l.id === b.leave_type_id)
            const remaining = b.total_days - b.used_days - b.pending_days
            const pct = b.total_days > 0 ? Math.round((b.used_days / b.total_days) * 100) : 0
            return (
              <div key={b.id} className="bg-surface rounded-xl p-5 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary-fixed dark:bg-primary-container flex items-center justify-center">
                    <Calendar size={18} className="text-primary dark:text-primary-muted" />
                  </div>
                  <span className="text-sm font-medium text-ink-muted text-ink-muted">{lt?.name || t('balance.leave')}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-on-background text-ink">{remaining}</span>
                  <span className="text-sm text-ink-muted text-ink-muted">/ {b.total_days} {t('balance.days')}</span>
                </div>
                <div className="w-full bg-surface-sunken rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-ink-muted text-ink-muted mt-1.5">
                  <span>{t('balance.used', { n: b.used_days })}</span>
                  {b.pending_days > 0 && <span>{t('balance.pending', { n: b.pending_days })}</span>}
                </div>
              </div>
            )
          })
        )}
        {!balancesLoading && balances.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-4">
            <EmptyState icon={Calendar} title={t('empty.balances_title')} description={t('empty.balances_description')} />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="border-b border-surface-container-high bg-surface-raised flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">{t('history.title')}</CardTitle>
          <div className="flex items-center gap-1 bg-surface rounded-full p-1 border border-border shadow-sm overflow-x-auto shrink-0">
            {(['', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
                  statusFilter === s
                    ? 'bg-surface-sunken text-primary dark:text-primary-muted'
                    : 'text-ink-muted text-ink-muted hover:bg-surface-sunken dark:hover:bg-surface-sunken'
                )}
              >
                {s ? t(`status.${s}`) : t('status.all')}
              </button>
            ))}
          </div>
        </CardHeader>
        <div className="table-responsive overflow-x-auto -mx-6 px-6">
          {requestsLoading ? (
            <LoadingState variant="list" rows={3} />
          ) : (
            <table role="table" className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-sunken bg-surface-sunken/50 border-b border-border/50 border-border/50">
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('history.type')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('history.dates')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('history.days')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('history.status')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('history.reason')}</th>
                  {isManager && <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{t('history.actions')}</th>}
                </tr>
              </thead>
              <tbody className="text-sm text-ink text-ink">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={isManager ? 6 : 5} className="p-0">
                      <EmptyState icon={FileText} title={t('empty.history_title')} description={t('empty.history_description')} />
                    </td>
                  </tr>
                ) : (
                  requests.map(req => {
                    const cfg = statusConfig[req.status]
                    const StatusIcon = cfg.icon
                    return (
                      <tr key={req.id} className="border-b border-border/50 border-border/50 hover:bg-surface-sunken/50 dark:hover:bg-surface-sunken/30 transition-colors duration-150">
                        <td className="py-3 px-4 text-sm font-medium">{req.leave_types?.name || '-'}</td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">{req.total_days}</td>
                        <td className="py-3 px-4">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold', cfg.bg, cfg.text)}>
                            <StatusIcon size={12} />
                            {t(`status.${req.status}`)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-ink-muted max-w-[200px] truncate">{req.reason || '-'}</td>
                        {isManager && (
                          <td className="py-3 px-4 text-right">
                            {req.status === 'pending' && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => approveMutation.mutate(req.id)}
                                  disabled={approveMutation.isPending}
                                  icon={<CheckCircle size={14} />}
                                  aria-label={t('history.approve', 'Approve')}
                                  className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRejectionModal({ id: req.id, reason: '' })}
                                  icon={<XCircle size={14} />}
                                  aria-label={t('history.reject', 'Reject')}
                                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                />
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {rejectionModal.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRejectionModal({ id: '', reason: '' })} role="dialog" aria-modal="true" aria-label={t('reject.title')}>
          <div className="bg-surface rounded-xl border border-border shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive-subtle dark:bg-destructive-subtle/30 flex items-center justify-center">
                <AlertCircle size={20} className="text-destructive dark:text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-ink text-ink">{t('reject.title')}</h3>
            </div>
            <label className="block text-sm font-medium text-ink mb-1">{t('reject.reason_placeholder', 'Rejection reason')}</label>
            <textarea
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none mb-4"
              placeholder={t('reject.reason_placeholder')}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRejectionModal({ id: '', reason: '' })}>{t('common:cancel')}</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => rejectMutation.mutate({ id: rejectionModal.id, reason: rejectionModal.reason })}
                disabled={rejectionModal.reason.trim().length < 3 || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? t('reject.submitting') : t('reject.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeavePage
