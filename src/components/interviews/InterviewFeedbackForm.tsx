import { useState } from 'react'
import { useUpdateInterview } from '../../hooks/useInterviews'
import { Star, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import { cn } from '../../utils/cn'

import { Interview } from '../../types/models'

interface Props { interview: Interview; onClose: () => void }

const RECOMMENDATIONS = [
  { value: 'strong_hire', label: 'Strong Hire', icon: ThumbsUp, color: 'text-green-600' },
  { value: 'hire', label: 'Hire', icon: ThumbsUp, color: 'text-teal-600' },
  { value: 'neutral', label: 'Neutral', icon: Minus, color: 'text-gray-500' },
  { value: 'no_hire', label: 'No Hire', icon: ThumbsDown, color: 'text-orange-600' },
  { value: 'strong_no_hire', label: 'Strong No Hire', icon: ThumbsDown, color: 'text-red-600' },
]

export function InterviewFeedbackForm({ interview, onClose }: Props) {
  const updateInterview = useUpdateInterview()
  const [rating, setRating] = useState(interview.rating || 0)
  const [recommendation, setRecommendation] = useState(interview.recommendation || '')
  const [feedback, setFeedback] = useState(interview.feedback || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateInterview.mutateAsync({ id: interview.id, data: { rating, recommendation, feedback, status: 'completed' } })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold">Interview Feedback</h3>
      <div>
        <label className="block text-sm font-medium mb-2">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button type="button" key={n} onClick={() => setRating(n)}
              className={cn('p-1 transition-colors', rating >= n ? 'text-yellow-500' : 'text-outline-variant')}>
              <Star size={24} fill={rating >= n ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Recommendation</label>
        <div className="grid grid-cols-1 gap-2">
          {RECOMMENDATIONS.map(r => (
            <button type="button" key={r.value} onClick={() => setRecommendation(r.value)}
              className={cn('flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors', recommendation === r.value ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:border-primary/50')}>
              <r.icon size={18} className={r.color} /> {r.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Detailed Feedback</label>
        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="Write your interview feedback..." />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-on-surface-variant">Cancel</button>
        <button type="submit" disabled={updateInterview.isPending} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {updateInterview.isPending ? 'Saving...' : 'Save Feedback'}
        </button>
      </div>
    </form>
  )
}
