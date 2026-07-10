import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Trash2, Power, PowerOff, Clock, Users, FileText } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { reportService, type ReportFrequency } from '../../services/reportService'
import type { ReportType } from '../../utils/reportGenerator'
import { cn } from '../../lib/utils'

const REPORT_TYPES: { value: ReportType; labelKey: string }[] = [
  { value: 'hiring_summary', labelKey: 'scheduling.type_hiring_summary' },
  { value: 'pipeline_analysis', labelKey: 'scheduling.type_pipeline_analysis' },
  { value: 'time_to_hire', labelKey: 'scheduling.type_time_to_hire' },
  { value: 'source_effectiveness', labelKey: 'scheduling.type_source_effectiveness' },
  { value: 'onboarding_progress', labelKey: 'scheduling.type_onboarding_progress' },
]

const FREQUENCIES: { value: ReportFrequency; labelKey: string }[] = [
  { value: 'daily', labelKey: 'scheduling.freq_daily' },
  { value: 'weekly', labelKey: 'scheduling.freq_weekly' },
  { value: 'monthly', labelKey: 'scheduling.freq_monthly' },
]

interface SchedulerProps {
  onClose: () => void
}

export function ReportScheduler({ onClose }: SchedulerProps) {
  const { t } = useTranslation(['reports', 'common'])
  const queryClient = useQueryClient()
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)

  const [reportType, setReportType] = useState<ReportType>('hiring_summary')
  const [frequency, setFrequency] = useState<ReportFrequency>('weekly')

  const createMutation = useMutation({
    mutationFn: () => {
      if (!company?.id || !profile?.id) throw new Error('Not authenticated')
      return reportService.createSchedule(company.id, profile.id, reportType, frequency, [profile.id])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportSchedules'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-6 border-b border-border border-border">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
            <Calendar size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-on-background text-ink">{t('scheduling.title')}</h2>
            <p className="text-sm text-ink-variant text-ink-variant">{t('scheduling.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              <FileText size={14} className="inline mr-1" />
              {t('scheduling.report_type')}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setReportType(rt.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    reportType === rt.value
                      ? 'bg-primary-fixed text-primary dark:text-primary-muted font-medium'
                      : 'bg-surface-sunken bg-surface-sunken-lowest text-ink hover:bg-surface-sunken dark:hover:bg-outline'
                  )}
                >
                  <span className={cn(
                    'w-3 h-3 rounded-full border-2 flex-shrink-0',
                    reportType === rt.value ? 'border-primary dark:border-accent-dim bg-primary dark:bg-primary-muted' : 'border-border border-border'
                  )} />
                  {t(rt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              <Clock size={14} className="inline mr-1" />
              {t('scheduling.frequency')}
            </label>
            <div className="flex gap-2">
              {FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    frequency === f.value
                      ? 'bg-primary text-white'
                      : 'bg-surface-sunken bg-surface-sunken-lowest text-ink hover:bg-surface-sunken dark:hover:bg-outline'
                  )}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-sunken bg-surface-sunken-lowest rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-ink-variant text-ink-variant">
              <Users size={14} />
              {t('scheduling.recipients_label')}: <span className="text-ink font-medium">{profile?.full_name || profile?.email}</span>
            </div>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive dark:text-destructive">{t('scheduling.error')}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-surface-sunken dark:hover:bg-surface-sunken transition-colors text-ink"
            >
              {t('cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {createMutation.isPending ? t('scheduling.creating') : t('scheduling.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ScheduleListProps {
  onGenerateNow: (type: ReportType) => void
  generatingType: ReportType | null
}

export function ScheduleList({ onGenerateNow, generatingType }: ScheduleListProps) {
  const { t } = useTranslation(['reports', 'common'])
  const queryClient = useQueryClient()
  const company = useAuthStore(s => s.company)

  const { data: schedules = [] } = useQuery({
    queryKey: ['reportSchedules', company?.id],
    queryFn: () => company?.id ? reportService.getSchedules(company.id) : [],
    enabled: !!company?.id,
  })

  const toggleMutation = useMutation({
    mutationFn: (schedule: { id: string; is_enabled: boolean }) =>
      reportService.updateSchedule(schedule.id, { is_enabled: !schedule.is_enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reportSchedules'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportService.deleteSchedule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reportSchedules'] }),
  })

  if (schedules.length === 0) return null

  return (
    <div className="space-y-3">
      {schedules.map(s => (
        <div key={s.id} className="flex items-center gap-3 bg-surface rounded-xl p-4 border border-border border-border">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
            s.is_enabled ? 'bg-success-subtle' : 'bg-surface-sunken bg-surface-sunken'
          )}>
            {s.is_enabled
              ? <Power size={16} className="text-success" />
              : <PowerOff size={16} className="text-ink-variant text-ink-variant" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-background truncate">
              {t(`scheduling.type_${s.report_type}`)}
            </p>
            <p className="text-xs text-ink-variant text-ink-variant">
              {t(`scheduling.freq_${s.frequency}`)} · {t('scheduling.next_run')}: {new Date(s.next_run_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => onGenerateNow(s.report_type)}
            disabled={generatingType === s.report_type}
            className="px-3 py-1.5 text-xs font-medium bg-primary-fixed text-primary dark:text-primary-muted rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {generatingType === s.report_type ? '...' : t('scheduling.generate_now')}
          </button>
          <button
            onClick={() => toggleMutation.mutate(s)}
            className="p-2 rounded-lg hover:bg-surface-sunken dark:hover:bg-outline transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={s.is_enabled ? 'Disable schedule' : 'Enable schedule'}
          >
            {s.is_enabled
              ? <Power size={14} className="text-success" />
              : <PowerOff size={14} className="text-ink-variant text-ink-variant" />
            }
          </button>
          <button
            onClick={() => deleteMutation.mutate(s.id)}
            className="p-2 rounded-lg hover:bg-destructive-subtle transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Delete schedule"
          >
            <Trash2 size={14} className="text-destructive" />
          </button>
        </div>
      ))}
    </div>
  )
}
