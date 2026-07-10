import { useState } from 'react'
import { useUpdateInterview } from '../../hooks/useInterviews'
import { Button } from '../ui/Button'
import { Star, ThumbsUp, ThumbsDown, Minus, Save } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

import { Interview } from '../../types/models'

interface Props { interview: Interview; onClose: () => void }

export function InterviewFeedbackForm({ interview, onClose }: Props) {
  const { t } = useTranslation('recruitment')
  const updateInterview = useUpdateInterview()
  const [rating, setRating] = useState(interview.rating || 0)
  const [recommendation, setRecommendation] = useState(interview.recommendation || '')
  const [feedback, setFeedback] = useState(interview.feedback || '')
  const recommendations = [
    { value: 'strong_hire', label: t('interviews.feedback.strong_hire'), icon: ThumbsUp, color: 'text-green-600 dark:text-success' },
    { value: 'hire', label: t('interviews.feedback.hire'), icon: ThumbsUp, color: 'text-teal-600 dark:text-success' },
    { value: 'neutral', label: t('interviews.feedback.neutral'), icon: Minus, color: 'text-gray-500 text-ink-muted' },
    { value: 'no_hire', label: t('interviews.feedback.no_hire'), icon: ThumbsDown, color: 'text-orange-600 dark:text-warning' },
    { value: 'strong_no_hire', label: t('interviews.feedback.strong_no_hire'), icon: ThumbsDown, color: 'text-red-600 dark:text-destructive' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateInterview.mutateAsync({ id: interview.id, data: { rating, recommendation, feedback, status: 'completed' } })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-ink">{t('interviews.feedback.title')}</h3>
      <div>
        <label className="block text-sm font-medium mb-2 text-ink">{t('interviews.feedback.rating')}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button type="button" key={n} onClick={() => setRating(n)}
              className={cn('p-1 transition-colors', rating >= n ? 'text-yellow-500' : 'text-outline-variant dark:text-outline-variant')}>
              <Star size={24} fill={rating >= n ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-ink">{t('interviews.feedback.recommendation')}</label>
        <div className="grid grid-cols-1 gap-2">
          {recommendations.map(r => (
            <button type="button" key={r.value} onClick={() => setRecommendation(r.value)}
              className={cn('flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors', recommendation === r.value ? 'border-primary dark:border-primary bg-primary-container/10 dark:bg-primary-container/20' : 'border-border hover:border-primary/50 dark:hover:border-primary/50')}>
              <r.icon size={18} className={r.color} /> {r.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="interview-feedback" className="block text-sm font-medium mb-1 text-ink">{t('interviews.feedback.detailed_feedback')}</label>
        <textarea id="interview-feedback" value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('interviews.feedback.placeholder')} />
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onClose}>{t('interviews.feedback.cancel')}</Button>
        <Button variant="default" type="submit" disabled={updateInterview.isPending} loading={updateInterview.isPending} icon={<Save size={16} />}>
          {updateInterview.isPending ? t('interviews.feedback.submitting') : t('interviews.feedback.submit')}
        </Button>
      </div>
    </form>
  )
}
