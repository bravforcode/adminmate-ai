import { useState } from 'react'
import { useUpcomingInterviews, usePastInterviews } from '../../hooks/useInterviews'
import { ScheduleInterviewForm } from '../../components/interviews/ScheduleInterviewForm'
import { InterviewFeedbackForm } from '../../components/interviews/InterviewFeedbackForm'
import { EmptyState } from '../../components/shared/EmptyState'
import { LoadingState } from '../../components/shared/LoadingState'
import { Calendar, Clock, MapPin, Video, User, CalendarOff, History, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useTranslation } from 'react-i18next'

export function InterviewsPage() {
  const { t } = useTranslation(['recruitment', 'common'])
  const { data: upcoming, isLoading: upLoading, isError: upError, error: upErr, refetch: upRefetch } = useUpcomingInterviews()
  const { data: past, isLoading: pastLoading, isError: pastError, error: pastErr, refetch: pastRefetch } = usePastInterviews()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [selectedAppId, setSelectedAppId] = useState<string>('')
  const [feedbackFor, setFeedbackFor] = useState<any>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">{t('interviews.title')}</h1>
        <p className="text-body-md text-on-surface-variant mt-1">{t('interviews.subtitle')}</p>
      </div>

      <div className="flex gap-1 bg-surface-container-low rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('upcoming')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'upcoming' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          {t('interviews.tab_upcoming')}
        </button>
        <button
          onClick={() => setTab('past')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'past' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
          )}
        >
          {t('interviews.tab_past')}
        </button>
      </div>

      {selectedAppId && (
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <ScheduleInterviewForm applicationId={selectedAppId} onClose={() => setSelectedAppId('')} />
        </div>
      )}

      {feedbackFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-[95vw] sm:max-w-md">
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
              <div key={interview.id} className="bg-surface rounded-xl border border-outline-variant p-4 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{interview.applications?.candidates?.full_name}</h3>
                    <p className="text-sm text-on-surface-variant">for {interview.applications?.jobs?.title}</p>
                  </div>
                  <span className="px-2 py-1 bg-primary-container/15 text-primary rounded text-xs font-medium">
                    {interview.interview_type?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(interview.scheduled_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(interview.scheduled_at).toLocaleTimeString()} ({interview.duration_minutes} min)</span>
                  {interview.location && <span className="flex items-center gap-1"><MapPin size={12} /> {interview.location}</span>}
                  {interview.meeting_link && <span className="flex items-center gap-1"><Video size={12} /> <a href={interview.meeting_link} className="text-primary hover:underline" target="_blank" rel="noreferrer">{t('interviews.join')}</a></span>}
                  <span className="flex items-center gap-1"><User size={12} /> {interview.interviewer_name}</span>
                </div>
                <button
                  onClick={() => setFeedbackFor(interview)}
                  className="mt-3 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-medium hover:opacity-90"
                >
                  {t('interviews.add_feedback')}
                </button>
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
              <div key={interview.id} className="bg-surface rounded-xl border border-outline-variant p-4 opacity-70">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{interview.applications?.candidates?.full_name}</h3>
                    <p className="text-sm text-on-surface-variant">for {interview.applications?.jobs?.title}</p>
                  </div>
                  <span className="px-2 py-1 bg-surface-container rounded text-xs">Completed</span>
                </div>
                {interview.rating ? <div className="mt-2 flex items-center gap-1 text-yellow-500 text-sm">{'★'.repeat(interview.rating)}{'☆'.repeat(5 - interview.rating)}</div> : null}
                {interview.feedback && <p className="mt-2 text-sm text-on-surface-variant">{interview.feedback}</p>}
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
    <div className="bg-surface rounded-xl border border-outline-variant p-8 text-center">
      <AlertCircle size={40} className="mx-auto text-error mb-3" />
      <h3 className="font-semibold text-on-surface mb-1">{t('errors.load_failed')}</h3>
      <p className="text-sm text-on-surface-variant mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90"
      >
        <RefreshCw size={14} /> {t('errors.retry')}
      </button>
    </div>
  )
}

export default InterviewsPage
