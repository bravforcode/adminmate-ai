import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { performanceService, type PerformanceTemplate, type ReviewResponseInput, type ConfidenceLevel } from '../../services/performance/performanceService'
import { Star, Send, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'
import { cn } from '../../lib/utils'

interface ReviewFormProps {
  reviewId: string
  companyId: string
  template?: PerformanceTemplate
  onSubmitSuccess?: () => void
}

export function ReviewForm({ reviewId, companyId, template, onSubmitSuccess }: ReviewFormProps) {
  const { t } = useTranslation(['performance', 'common'])
  const queryClient = useQueryClient()

  const [responses, setResponses] = useState<Record<string, ReviewResponseInput>>({})
  const [overallRating, setOverallRating] = useState<number | undefined>()
  const [comments, setComments] = useState('')

  const criteria = template?.criteria ?? [
    { key: 'job_knowledge', label: 'Job Knowledge', description: 'Technical skills and domain expertise' },
    { key: 'quality_of_work', label: 'Quality of Work', description: 'Accuracy and thoroughness' },
    { key: 'productivity', label: 'Productivity', description: 'Volume and efficiency of work' },
    { key: 'communication', label: 'Communication', description: 'Verbal and written skills' },
    { key: 'teamwork', label: 'Teamwork', description: 'Collaboration and interpersonal skills' },
    { key: 'initiative', label: 'Initiative', description: 'Self-direction and proactiveness' },
  ]

  const updateResponse = (key: string, field: keyof ReviewResponseInput, value: unknown) => {
    setResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], criterion_key: key, [field]: value },
    }))
  }

  const submitMutation = useMutation({
    mutationFn: () => {
      const responseList = Object.values(responses).filter(r => r.rating != null)
      for (const r of responseList) {
        if (!r.evidence || !r.confidence) {
          throw new Error(`Criterion ${r.criterion_key} requires evidence and confidence`)
        }
      }
      return performanceService.submitReview(companyId, reviewId, responseList, overallRating, comments || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance'] })
      onSubmitSuccess?.()
    },
  })

  const hasIncomplete = Object.values(responses).some(r => r.rating != null && (!r.evidence || !r.confidence))

  return (
    <Card>
      <CardHeader className="border-b border-surface-container-high dark:border-outline bg-surface-bright dark:bg-surface-container-low">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star size={18} className="text-primary dark:text-accent-dim" />
          {t('review_form.title', 'Performance Review')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {criteria.map(criterion => {
          const resp = responses[criterion.key]
          return (
            <div key={criterion.key} className="border border-outline-variant/50 dark:border-outline/50 rounded-xl p-4 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-on-surface dark:text-on-surface">{criterion.label}</h4>
                {criterion.description && (
                  <p className="text-xs text-on-surface-variant dark:text-on-surface-variant mt-0.5">{criterion.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateResponse(criterion.key, 'rating', star)}
                    className="p-0.5 transition-colors"
                    aria-label={`${star} star`}
                  >
                    <Star
                      size={20}
                      className={cn(
                        'transition-colors',
                        resp?.rating && star <= resp.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-outline-variant dark:text-outline'
                      )}
                    />
                  </button>
                ))}
                {resp?.rating && (
                  <span className="text-sm font-medium text-on-surface dark:text-on-surface ml-2">{resp.rating}/5</span>
                )}
              </div>

              {resp?.rating && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant dark:text-on-surface-variant mb-1">{t('review_form.evidence', 'Evidence')}</label>
                    <textarea
                      value={resp.evidence || ''}
                      onChange={(e) => updateResponse(criterion.key, 'evidence', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder={t('review_form.evidence_placeholder', 'Provide specific examples...')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant dark:text-on-surface-variant mb-1">{t('review_form.confidence', 'Confidence')}</label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as ConfidenceLevel[]).map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => updateResponse(criterion.key, 'confidence', level)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                            resp.confidence === level
                              ? 'bg-primary-container dark:bg-primary-container/30 text-primary dark:text-accent-dim border-primary'
                              : 'border-outline-variant dark:border-outline text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
                          )}
                        >
                          {t(`confidence.${level}`, level)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}

        <div className="border-t border-outline-variant/50 dark:border-outline/50 pt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-on-surface dark:text-on-surface mb-1">{t('review_form.overall_rating', 'Overall Rating')}</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setOverallRating(star)}
                  className="p-0.5"
                  aria-label={`${star} overall`}
                >
                  <Star
                    size={24}
                    className={cn(
                      'transition-colors',
                      overallRating && star <= overallRating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-outline-variant dark:text-outline'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface dark:text-on-surface mb-1">{t('review_form.comments', 'Comments')}</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder={t('review_form.comments_placeholder', 'Additional comments...')}
            />
          </div>
        </div>

        {hasIncomplete && (
          <div className="flex items-center gap-2 text-warning text-sm">
            <AlertCircle size={16} />
            <span>{t('review_form.incomplete', 'Some ratings are missing evidence or confidence level')}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={() => submitMutation.mutate()}
            disabled={hasIncomplete || submitMutation.isPending}
            icon={<Send size={16} />}
          >
            {submitMutation.isPending ? t('review_form.submitting', 'Submitting...') : t('review_form.submit', 'Submit Review')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
