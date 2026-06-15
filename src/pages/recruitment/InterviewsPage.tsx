import { useState, useCallback } from 'react'
import { useUpcomingInterviews, usePastInterviews } from '../../hooks/useInterviews'
import { ScheduleInterviewForm } from '../../components/interviews/ScheduleInterviewForm'
import { InterviewFeedbackForm } from '../../components/interviews/InterviewFeedbackForm'
import { EmptyState } from '../../components/shared/EmptyState'
import { LoadingState } from '../../components/shared/LoadingState'
import { Interview } from '../../types/models'
import { Calendar, Clock, MapPin, Video, User, CalendarOff, History, AlertCircle, RefreshCw, CalendarPlus, Download, Star } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useTranslation } from 'react-i18next'
import { CalendarDropdown } from '../../components/interviews/CalendarDropdown'
import { Button } from '../../components/ui/Button'
import { calendarService } from '../../services/calendarService'
import { toCSV, downloadCSV } from '../../utils/csvParser'

export function InterviewsPage() {
  const { t } = useTranslation(['recruitment', 'common', 'calendar'])
  const { data: upcoming, isLoading: upLoading, isError: upError, error: upErr, refetch: upRefetch } = useUpcomingInterviews()
  const { data: past, isLoading: pastLoading, isError: pastError, error: pastErr, refetch: pastRefetch } = usePastInterviews()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [selectedAppId, setSelectedAppId] = useState<string>('')
  const [feedbackFor, setFeedbackFor] = useState<Interview | null>(null)

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
        <h1 className="text-headline-md font-bold text-on-surface dark:text-[#f1f5f9]">{t('interviews.title')}</h1>
        <p className="text-body-md text-on-surface-variant dark:text-[#94a3b8] mt-1">{t('interviews.subtitle')}</p>
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

      <div className="flex gap-1 bg-surface-container-low dark:bg-[#1e3a5f] rounded-lg p-1 w-fit">
        <button
          onClick={() => handleTabChange('upcoming')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'upcoming' ? 'bg-surface dark:bg-[#1e293b] shadow-sm text-on-surface dark:text-[#f1f5f9]' : 'text-on-surface-variant dark:text-[#94a3b8] hover:text-on-surface dark:hover:text-[#f1f5f9]'
          )}
        >
          {t('interviews.tab_upcoming')}
        </button>
        <button
          onClick={() => handleTabChange('past')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'past' ? 'bg-surface dark:bg-[#1e293b] shadow-sm text-on-surface dark:text-[#f1f5f9]' : 'text-on-surface-variant dark:text-[#94a3b8] hover:text-on-surface dark:hover:text-[#f1f5f9]'
          )}
        >
          {t('interviews.tab_past')}
        </button>
      </div>

      {selectedAppId && (
        <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-6">
          <ScheduleInterviewForm applicationId={selectedAppId} onClose={() => setSelectedAppId('')} />
        </div>
      )}

      {feedbackFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/40 p-4">
          <div className="bg-surface dark:bg-[#1e293b] rounded-xl p-6 w-full max-w-[95vw] sm:max-w-md">
            <InterviewFeedbackForm interview={feedbackFor} onClose={() => setFeedbackFor(null)} />
          </div>
        </div>
      )}

      {tab === 'upcoming' ? (
        upError ? (
          <ErrorBlock message={(upErr as Error)?.message} onRetry={() => upRefetch()} />
        ) : upLoading ? (
          <LoadingState variant="list" rows={3} message={t('common:loading')} />
        ) : upcoming && upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title={t('interviews.empty_upcoming_title')}
            description={t('interviews.empty_upcoming_description')}
          />
        ) : (
          <div className="space-y-3">
            {upcoming?.map(interview => (
              <div key={interview.id} className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-4 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold dark:text-[#f1f5f9]">{interview.applications?.candidates?.full_name}</h3>
                    <p className="text-sm text-on-surface-variant dark:text-[#94a3b8]">for {interview.applications?.jobs?.title}</p>
                  </div>
                  <span className="px-2 py-1 bg-primary-container/15 dark:bg-[#1e40af]/20 text-primary dark:text-[#93c5fd] rounded text-xs font-medium">
                    {interview.interview_type?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-on-surface-variant dark:text-[#94a3b8]">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(interview.scheduled_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(interview.scheduled_at).toLocaleTimeString()} ({interview.duration_minutes} min)</span>
                  {interview.location && <span className="flex items-center gap-1"><MapPin size={12} /> {interview.location}</span>}
                  {interview.meeting_link && <span className="flex items-center gap-1"><Video size={12} /> <a href={interview.meeting_link} className="text-primary dark:text-[#93c5fd] hover:underline" target="_blank" rel="noreferrer">{t('interviews.join')}</a></span>}
                  <span className="flex items-center gap-1"><User size={12} /> {interview.interviewer_name}</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setFeedbackFor(interview)}
                  >
                    {t('interviews.add_feedback')}
                  </Button>
                  <CalendarDropdown interview={interview} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        pastError ? (
          <ErrorBlock message={(pastErr as Error)?.message} onRetry={() => pastRefetch()} />
        ) : pastLoading ? (
          <LoadingState variant="list" rows={3} message={t('common:loading')} />
        ) : past && past.length === 0 ? (
          <EmptyState
            icon={History}
            title={t('interviews.empty_past_title')}
            description={t('interviews.empty_past_description')}
          />
        ) : (
          <div className="space-y-3">
            {past?.map(interview => (
              <div key={interview.id} className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-4 opacity-70">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold dark:text-[#f1f5f9]">{interview.applications?.candidates?.full_name}</h3>
                    <p className="text-sm text-on-surface-variant dark:text-[#94a3b8]">for {interview.applications?.jobs?.title}</p>
                  </div>
                  <span className="px-2 py-1 bg-surface-container dark:bg-[#1e3a5f] rounded text-xs dark:text-[#f1f5f9]">Completed</span>
                </div>
                {interview.rating ? <div className="mt-2 flex items-center gap-0.5">{Array.from({length: 5}, (_, i) => <Star key={i} size={14} className={i < interview.rating ? 'fill-yellow-500 text-yellow-500' : 'text-yellow-500'} />)}</div> : null}
                {interview.feedback && <p className="mt-2 text-sm text-on-surface-variant dark:text-[#94a3b8]">{interview.feedback}</p>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { t } = useTranslation('common')
  return (
    <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-8 text-center">
      <AlertCircle size={40} className="mx-auto text-error dark:text-[#f87171] mb-3" />
      <h3 className="font-semibold text-on-surface dark:text-[#f1f5f9] mb-1">{t('errors.load_failed')}</h3>
      <p className="text-sm text-on-surface-variant dark:text-[#94a3b8] mb-4">{message}</p>
      <Button
        variant="default"
        size="sm"
        onClick={onRetry}
        icon={<RefreshCw size={14} />}
      >
        {t('errors.retry')}
      </Button>
    </div>
  )
}

export default InterviewsPage
