import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Trash2, Power, PowerOff, Clock, Users, FileText } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { reportService, type ReportFrequency } from '../../services/reportService'
import type { ReportType } from '../../utils/reportGenerator'
import { cn } from '../../utils/cn'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-surface dark:bg-[#1e293b] rounded-2xl border border-outline-variant dark:border-[#334155] shadow-xl w-full max-w-lg mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-6 border-b border-outline-variant dark:border-[#334155]">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
            <Calendar size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-on-background dark:text-[#f1f5f9]">{t('scheduling.title')}</h2>
            <p className="text-sm text-on-surface-variant dark:text-[#94a3b8]">{t('scheduling.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface dark:text-[#f1f5f9] mb-2">
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
                      ? 'bg-primary-fixed text-primary dark:text-[#93c5fd] font-medium'
                      : 'bg-surface-container dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] hover:bg-surface-container-high dark:hover:bg-[#334155]'
                  )}
                >
                  <span className={cn(
                    'w-3 h-3 rounded-full border-2 flex-shrink-0',
                    reportType === rt.value ? 'border-primary dark:border-[#93c5fd] bg-primary dark:bg-[#93c5fd]' : 'border-outline dark:border-[#64748b]'
                  )} />
                  {t(rt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface dark:text-[#f1f5f9] mb-2">
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
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] hover:bg-surface-container-high dark:hover:bg-[#334155]'
                  )}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container dark:bg-[#0f172a] rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant dark:text-[#94a3b8]">
              <Users size={14} />
              {t('scheduling.recipients_label')}: <span className="text-on-surface dark:text-[#f1f5f9] font-medium">{profile?.full_name || profile?.email}</span>
            </div>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-error dark:text-[#f87171]">{t('scheduling.error')}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-outline-variant dark:border-[#334155] rounded-lg text-sm font-medium hover:bg-surface-container-low dark:hover:bg-[#1e3a5f] transition-colors dark:text-[#f1f5f9]"
            >
              {t('cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
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
        <div key={s.id} className="flex items-center gap-3 bg-surface dark:bg-[#1e293b] rounded-xl p-4 border border-outline-variant dark:border-[#334155]">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
            s.is_enabled ? 'bg-success-container' : 'bg-surface-container-high dark:bg-[#334155]'
          )}>
            {s.is_enabled
              ? <Power size={16} className="text-success" />
              : <PowerOff size={16} className="text-on-surface-variant dark:text-[#94a3b8]" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-background dark:text-[#f1f5f9] truncate">
              {t(`scheduling.type_${s.report_type}`)}
            </p>
            <p className="text-xs text-on-surface-variant dark:text-[#94a3b8]">
              {t(`scheduling.freq_${s.frequency}`)} · {t('scheduling.next_run')}: {new Date(s.next_run_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => onGenerateNow(s.report_type)}
            disabled={generatingType === s.report_type}
            className="px-3 py-1.5 text-xs font-medium bg-primary-fixed text-primary dark:text-[#93c5fd] rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {generatingType === s.report_type ? '...' : t('scheduling.generate_now')}
          </button>
          <button
            onClick={() => toggleMutation.mutate(s)}
            className="p-1.5 rounded-lg hover:bg-surface-container-high dark:hover:bg-[#334155] transition-colors"
          >
            {s.is_enabled
              ? <Power size={14} className="text-success" />
              : <PowerOff size={14} className="text-on-surface-variant dark:text-[#94a3b8]" />
            }
          </button>
          <button
            onClick={() => deleteMutation.mutate(s.id)}
            className="p-1.5 rounded-lg hover:bg-error-container transition-colors"
          >
            <Trash2 size={14} className="text-error" />
          </button>
        </div>
      ))}
    </div>
  )
}
