import { useState, useCallback } from 'react'
import { useUpcomingInterviews, usePastInterviews } from '../../hooks/useInterviews'
import { ScheduleInterviewForm } from '../../components/interviews/ScheduleInterviewForm'
import { InterviewCard } from '../../components/interviews/InterviewCard'
import { EmptyState } from '../../components/shared/EmptyState'
import { ErrorState } from '../../components/shared/ErrorState'
import { LoadingState } from '../../components/shared/LoadingState'
import { CalendarOff, History, CalendarPlus, Download } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { calendarService } from '../../services/calendarService'
import { toCSV, downloadCSV } from '../../utils/csvParser'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { useAuthStore } from '../../stores/authStore'

export function InterviewsPage() {
  const { t } = useTranslation(['recruitment', 'common', 'calendar'])
  const company = useAuthStore(s => s.company)
  const { data: upcoming, isLoading: upLoading, isError: upError, error: upErr, refetch: upRefetch } = useUpcomingInterviews()
  const { data: past, isLoading: pastLoading, isError: pastError, error: pastErr, refetch: pastRefetch } = usePastInterviews()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [selectedAppId, setSelectedAppId] = useState<string>('')

  // Realtime: refetch interviews when the interviews table changes
  const companyId = company?.id
  useRealtimeSubscription({
    table: 'interviews',
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    onChange: useCallback(() => { upRefetch(); pastRefetch() }, [upRefetch, pastRefetch]),
  })

  const handleTabChange = useCallback((newTab: 'upcoming' | 'past') => setTab(newTab), [])

  const handleExportCSV = useCallback(() => {
    const list = tab === 'upcoming' ? upcoming : past
    if (!list || list.length === 0) return
    const exportData = list.map(interview => ({
      candidate: interview.applications?.candidates?.full_name ?? '',
      job: interview.applications?.jobs?.title ?? '',
      type: interview.interview_type ?? '',
      scheduled_at: interview.scheduled_at ?? '',
      duration_minutes: interview.duration_minutes != null ? String(interview.duration_minutes) : '',
      location: interview.location ?? '',
      interviewer: interview.interviewer_name ?? '',
      rating: interview.rating != null ? String(interview.rating) : '',
      status: interview.status ?? '',
    }))
    downloadCSV(toCSV(exportData), `interviews_${tab}.csv`)
  }, [tab, upcoming, past])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-ink text-ink">{t('interviews.title')}</h1>
        <p className="text-body-md text-ink-variant text-ink-variant mt-1">{t('interviews.subtitle')}</p>
      </div>

      {((tab === 'upcoming' && upcoming && upcoming.length > 0) || (tab === 'past' && past && past.length > 0)) && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download size={16} />}
          >
            {t('common:export_csv')}
          </Button>
          {tab === 'upcoming' && upcoming && upcoming.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const ics = calendarService.generateBulkCalendar(upcoming)
                calendarService.downloadCalendarFile(ics, 'all-upcoming-interviews.ics')
              }}
              icon={<CalendarPlus size={16} />}
            >
              {t('calendar.export_all')}
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-1 bg-surface-sunken rounded-lg p-1 w-fit">
        <button
          onClick={() => handleTabChange('upcoming')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'upcoming' ? 'bg-surface shadow-sm text-ink text-ink' : 'text-ink-variant text-ink-variant hover:text-ink dark:hover:text-ink'
          )}
        >
          {t('interviews.tab_upcoming')}
        </button>
        <button
          onClick={() => handleTabChange('past')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'past' ? 'bg-surface shadow-sm text-ink text-ink' : 'text-ink-variant text-ink-variant hover:text-ink dark:hover:text-ink'
          )}
        >
          {t('interviews.tab_past')}
        </button>
      </div>

      {selectedAppId && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <ScheduleInterviewForm applicationId={selectedAppId} onClose={() => setSelectedAppId('')} />
        </div>
      )}

      {tab === 'upcoming' ? (
        upError ? (
          <ErrorState message={(upErr as Error)?.message} onRetry={() => upRefetch()} />
        ) : upLoading ? (
          <LoadingState variant="list" rows={3} message={t('common:loading')} />
        ) : upcoming && upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title={t('empty.interviews_upcoming_title')}
            description={t('empty.interviews_upcoming_description')}
          />
        ) : (
          <div className="space-y-3">
            {upcoming?.map(interview => (
              <InterviewCard key={interview.id} interview={interview} />
            ))}
          </div>
        )
      ) : (
        pastError ? (
          <ErrorState message={(pastErr as Error)?.message} onRetry={() => pastRefetch()} />
        ) : pastLoading ? (
          <LoadingState variant="list" rows={3} message={t('common:loading')} />
        ) : past && past.length === 0 ? (
          <EmptyState
            icon={History}
            title={t('empty.interviews_past_title')}
            description={t('empty.interviews_past_description')}
          />
        ) : (
          <div className="space-y-3">
            {past?.map(interview => (
              <InterviewCard key={interview.id} interview={interview} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

export default InterviewsPage
