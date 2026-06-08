import { useState } from 'react'
import { useUpdateInterview } from '../../hooks/useInterviews'
import { Calendar, Clock, MapPin, User, Star, Edit3 } from 'lucide-react'
import { cn } from '../../utils/cn'

const STATUS_STYLES: Record<string, string> = { scheduled: 'bg-blue-50 text-blue-700', completed: 'bg-green-50 text-green-700', cancelled: 'bg-red-50 text-red-700', no_show: 'bg-yellow-50 text-yellow-700' }

import { Interview } from '../../types/models'

interface InterviewCardProps { interview: Interview }

export function InterviewCard({ interview }: InterviewCardProps) {
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
    <div className="bg-surface rounded-xl border border-outline-variant p-4 hover:shadow-sm transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-on-surface">{interview.applications?.candidates?.full_name}</h3>
          <p className="text-sm text-on-surface-variant">{interview.applications?.jobs?.title}</p>
        </div>
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_STYLES[interview.status] || 'bg-surface-container')}>{interview.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant mb-3">
        {interview.scheduled_at && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(interview.scheduled_at).toLocaleDateString()}</span>}
        {interview.scheduled_at && <span className="flex items-center gap-1"><Clock size={12} /> {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        <span className="flex items-center gap-1"><User size={12} /> {interview.interviewer_name}</span>
        <span className="flex items-center gap-1"><User size={12} /> {interview.interview_type?.replace('_', ' ')}</span>
        {interview.location && <span className="flex items-center gap-1"><MapPin size={12} /> {interview.location}</span>}
      </div>

      {interview.status === 'scheduled' && (
        <div className="flex gap-2">
          <button onClick={() => handleSaveFeedback()} className="flex-1 px-3 py-1.5 bg-primary text-on-primary rounded text-xs font-medium hover:opacity-90">Mark Completed</button>
          <button onClick={() => updateInterview.mutate({ id: interview.id, data: { status: 'cancelled' } })} className="px-3 py-1.5 border border-outline-variant rounded text-xs text-on-surface-variant hover:border-error hover:text-error">Cancel</button>
        </div>
      )}

      {showFeedback && (
        <div className="mt-3 p-3 bg-surface-container-low rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Rating (1-5)</label>
            <div className="flex gap-1">{[1,2,3,4,5].map(i => <button key={i} onClick={() => setRating(i)} className={cn('w-8 h-8 rounded text-sm', i <= rating ? 'text-yellow-500' : 'text-outline-variant')}><Star size={16} fill={i <= rating ? 'currentColor' : 'none'} /></button>)}</div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Recommendation</label>
            <select value={recommendation} onChange={e => setRecommendation(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm">
              <option value="">Select...</option>
              <option value="strong_hire">Strong Hire</option>
              <option value="hire">Hire</option>
              <option value="neutral">Neutral</option>
              <option value="no_hire">No Hire</option>
              <option value="strong_no_hire">Strong No Hire</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Feedback</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveFeedback} className="px-3 py-1.5 bg-primary text-on-primary rounded text-xs font-medium">Save Feedback</button>
            <button onClick={() => setShowFeedback(false)} className="px-3 py-1.5 text-xs text-on-surface-variant">Cancel</button>
          </div>
        </div>
      )}

      {!showFeedback && interview.status !== 'cancelled' && (
        <button onClick={() => setShowFeedback(true)} className="flex items-center gap-1 text-xs text-primary hover:underline"><Edit3 size={10} /> Add Feedback</button>
      )}

      {interview.feedback && interview.status === 'completed' && (
        <div className="mt-3 p-2 bg-surface-container-low rounded text-xs text-on-surface-variant">
          <span className="font-medium">Feedback:</span> {interview.feedback}
          {interview.rating > 0 && <span className="ml-2">Rating: {interview.rating}/5</span>}
          {interview.recommendation && <span className="ml-2">• {interview.recommendation}</span>}
        </div>
      )}
    </div>
  )
}
