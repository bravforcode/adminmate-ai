import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUpdateInterview } from '../../hooks/useInterviews'
import { Button } from '../ui/Button'
import { Calendar, Clock, MapPin, User, Star, Edit3 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { CalendarDropdown } from './CalendarDropdown'

const STATUS_STYLES: Record<string, string> = { scheduled: 'bg-blue-50 text-blue-700', completed: 'bg-green-50 text-green-700', cancelled: 'bg-red-50 text-red-700', no_show: 'bg-yellow-50 text-yellow-700' }

import { Interview } from '../../types/models'

interface InterviewCardProps { interview: Interview }

export const InterviewCard = memo(function InterviewCard({ interview }: InterviewCardProps) {
  const { t } = useTranslation()
  const updateInterview = useUpdateInterview()
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState(interview.rating || 0)
  const [recommendation, setRecommendation] = useState(interview.recommendation || '')
  const [feedback, setFeedback] = useState(interview.feedback || '')

  const handleSaveFeedback = async () => {
    await updateInterview.mutateAsync({ id: interview.id, data: { rating, recommendation, feedback, status: 'completed' } })
    setShowFeedback(false)
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4 hover:shadow-sm transition-all card-hover">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-ink">{interview.applications?.candidates?.full_name}</h3>
          <p className="text-sm text-ink-muted">{interview.applications?.jobs?.title}</p>
        </div>
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', (interview.status ? STATUS_STYLES[interview.status] : '') || 'bg-surface-sunken')}>{interview.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted mb-3">
        {interview.scheduled_at && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(interview.scheduled_at).toLocaleDateString()}</span>}
        {interview.scheduled_at && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        <span className="flex items-center gap-1"><User size={12} /> {interview.interviewer_name}</span>
        <span className="flex items-center gap-1"><User size={12} /> {interview.interview_type?.replace('_', ' ')}</span>
        {interview.location && <span className="flex items-center gap-1"><MapPin size={12} /> {interview.location}</span>}
      </div>

      {interview.status === 'scheduled' && (
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={() => handleSaveFeedback()}>{t('interviews.feedback.submit', 'Save Feedback')}</Button>
          <Button variant="outline" size="sm" onClick={() => updateInterview.mutate({ id: interview.id, data: { status: 'cancelled' } })}>{t('common.cancel', 'Cancel')}</Button>
        </div>
      )}

      {showFeedback && (
        <div className="mt-3 p-3 bg-surface-sunken rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">{t('interviews.feedback.rating', 'Rating')} (1-5)</label>
            <div className="flex gap-1">{[1,2,3,4,5].map(i => <button key={i} onClick={() => setRating(i)} className={cn('w-8 h-8 rounded text-sm', i <= rating ? 'text-yellow-500' : 'text-outline-variant')}><Star size={16} fill={i <= rating ? 'currentColor' : 'none'} /></button>)}</div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('interviews.feedback.recommendation', 'Recommendation')}</label>
            <select value={recommendation} onChange={e => setRecommendation(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary outline-none text-sm">
              <option value="">{t('common.select', 'Select')}...</option>
              <option value="strong_hire">{t('interviews.feedback.strong_hire', 'Strong Hire')}</option>
              <option value="hire">{t('interviews.feedback.hire', 'Hire')}</option>
              <option value="neutral">{t('interviews.feedback.neutral', 'Neutral')}</option>
              <option value="no_hire">{t('interviews.feedback.no_hire', 'No Hire')}</option>
              <option value="strong_no_hire">{t('interviews.feedback.strong_no_hire', 'Strong No Hire')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t('interviews.feedback.detailed_feedback', 'Feedback')}</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary outline-none text-sm" />
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleSaveFeedback}>{t('interviews.feedback.submit', 'Save Feedback')}</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowFeedback(false)}>{t('common.cancel', 'Cancel')}</Button>
          </div>
        </div>
      )}

      {!showFeedback && interview.status !== 'cancelled' && (
        <div className="flex items-center gap-2">
          <Button variant="link" size="xs" onClick={() => setShowFeedback(true)} icon={<Edit3 size={10} />}>{t('interviews.add_feedback', 'Add Feedback')}</Button>
          <CalendarDropdown interview={interview} compact />
        </div>
      )}

      {interview.feedback && interview.status === 'completed' && (
        <div className="mt-3 p-2 bg-surface-sunken rounded text-xs text-ink-muted">
          <span className="font-medium">{t('interviews.feedback.detailed_feedback', 'Feedback')}:</span> {interview.feedback}
          {interview.rating != null && interview.rating > 0 && <span className="ml-2">{t('interviews.feedback.rating', 'Rating')}: {interview.rating}/5</span>}
          {interview.recommendation && <span className="ml-2">• {interview.recommendation}</span>}
        </div>
      )}
    </div>
  )
})

export default InterviewCard
