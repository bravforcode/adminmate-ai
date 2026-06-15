import { useState } from 'react'
import { useUpdateInterview } from '../../hooks/useInterviews'
import { Button } from '../ui/Button'
import { Star, ThumbsUp, ThumbsDown, Minus, Save } from 'lucide-react'
import { cn } from '../../utils/cn'

import { Interview } from '../../types/models'

interface Props { interview: Interview; onClose: () => void }

const RECOMMENDATIONS = [
  { value: 'strong_hire', label: 'Strong Hire', icon: ThumbsUp, color: 'text-green-600 dark:text-[#4ade80]' },
  { value: 'hire', label: 'Hire', icon: ThumbsUp, color: 'text-teal-600 dark:text-[#4ade80]' },
  { value: 'neutral', label: 'Neutral', icon: Minus, color: 'text-gray-500 dark:text-[#94a3b8]' },
  { value: 'no_hire', label: 'No Hire', icon: ThumbsDown, color: 'text-orange-600 dark:text-[#fbbf24]' },
  { value: 'strong_no_hire', label: 'Strong No Hire', icon: ThumbsDown, color: 'text-red-600 dark:text-[#f87171]' },
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
      <h3 className="font-semibold dark:text-[#f1f5f9]">Interview Feedback</h3>
      <div>
        <label className="block text-sm font-medium mb-2 dark:text-[#f1f5f9]">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button type="button" key={n} onClick={() => setRating(n)}
              className={cn('p-1 transition-colors', rating >= n ? 'text-yellow-500' : 'text-outline-variant dark:text-[#64748b]')}>
              <Star size={24} fill={rating >= n ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 dark:text-[#f1f5f9]">Recommendation</label>
        <div className="grid grid-cols-1 gap-2">
          {RECOMMENDATIONS.map(r => (
            <button type="button" key={r.value} onClick={() => setRecommendation(r.value)}
              className={cn('flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors', recommendation === r.value ? 'border-primary dark:border-[#3b82f6] bg-primary-container/10 dark:bg-[#1e40af]/20' : 'border-outline-variant dark:border-[#334155] hover:border-primary/50 dark:hover:border-[#3b82f6]/50')}>
              <r.icon size={18} className={r.color} /> {r.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="interview-feedback" className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Detailed Feedback</label>
        <textarea id="interview-feedback" value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder="Write your interview feedback..." />
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="default" type="submit" disabled={updateInterview.isPending} loading={updateInterview.isPending} icon={<Save size={16} />}>
          {updateInterview.isPending ? 'Saving...' : 'Save Feedback'}
        </Button>
      </div>
    </form>
  )
}
