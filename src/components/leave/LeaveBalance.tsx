import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import type { LeaveBalance as LeaveBalanceType, LeaveType } from '../../services/attendance/leaveService'
import { EmptyState } from '../shared/EmptyState'

interface LeaveBalanceProps {
  balances: LeaveBalanceType[]
  leaveTypes: LeaveType[]
  loading?: boolean
}

export function LeaveBalance({ balances, leaveTypes, loading }: LeaveBalanceProps) {
  const { t } = useTranslation(['leave', 'common'])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface dark:bg-surface rounded-xl p-5 border border-outline-variant dark:border-outline shadow-sm">
            <div className="h-3 w-20 bg-surface-container-high dark:bg-slate-700/40 rounded-lg animate-shimmer mb-3" />
            <div className="h-8 w-16 bg-surface-container-high dark:bg-slate-700/40 rounded-lg animate-shimmer" />
          </div>
        ))}
      </div>
    )
  }

  if (balances.length === 0) {
    return (
      <div className="sm:col-span-2 lg:col-span-4">
        <EmptyState icon={Calendar} title={t('empty.balances_title')} description={t('empty.balances_description')} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {balances.map(b => {
        const lt = leaveTypes.find(l => l.id === b.leave_type_id)
        const remaining = b.total_days - b.used_days - b.pending_days
        const pct = b.total_days > 0 ? Math.round((b.used_days / b.total_days) * 100) : 0
        return (
          <div key={b.id} className="bg-surface dark:bg-surface rounded-xl p-5 border border-outline-variant dark:border-outline shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-fixed dark:bg-primary-container flex items-center justify-center">
                <Calendar size={18} className="text-primary dark:text-accent-dim" />
              </div>
              <span className="text-sm font-medium text-on-surface-variant dark:text-on-surface-variant">{lt?.name || t('balance.leave')}</span>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-on-background dark:text-on-surface">{remaining}</span>
              <span className="text-sm text-on-surface-variant dark:text-on-surface-variant">/ {b.total_days} {t('balance.days')}</span>
            </div>
            <div className="w-full bg-surface-container-high dark:bg-surface-container rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant dark:text-on-surface-variant mt-1.5">
              <span>{t('balance.used', { n: b.used_days })}</span>
              {b.pending_days > 0 && <span>{t('balance.pending', { n: b.pending_days })}</span>}
              {b.carried_over_days > 0 && <span>{t('balance.carried', { n: b.carried_over_days })}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
