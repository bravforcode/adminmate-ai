import { memo, useState } from 'react'
import { useUpdateApplicationStatus, useTriggerAIScreening } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { Sparkles, ArrowRight, ArrowLeft, Eye, MessageSquare } from 'lucide-react'
import { PIPELINE_STAGES } from '../../utils/constants'
import { ApplicationDrawer } from './ApplicationDrawer'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { Application, CVDocument } from '../../types/models'

interface ApplicationCardProps {
  application: Application
  isActive?: boolean
  onClick?: () => void
  role?: string
}

export const ApplicationCard = memo(function ApplicationCard({ application, isActive, onClick, role }: ApplicationCardProps) {
  const { t } = useTranslation('recruitment')
  const updateStatus = useUpdateApplicationStatus()
  const triggerAI = useTriggerAIScreening()
  const company = useAuthStore(s => s.company)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === application.status)
  const hasCV = !!application.cv_documents?.some((cv: CVDocument) => cv.is_current)
  const initials = application.candidates?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const matchScore = application.ai_match_score ?? 0

  const handleScreen = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const latestCV = application.cv_documents?.find((cv: CVDocument) => cv.is_current)
    if (!latestCV) { toast.error(t('pipeline.no_cv_for_screening')); return }
    await triggerAI.mutateAsync({ applicationId: application.id, jobId: application.job_id ?? '', cvDocumentId: latestCV.id, companyId: company?.id ?? '' })
  }

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('adminmate:open-chat'))
  }

  return (
    <>
      <div
        role={role}
        aria-grabbed="false"
        aria-dropeffect="move"
        className={cn(
          'bg-surface-container-lowest dark:bg-surface p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden card-hover',
          isActive ? 'border-primary shadow-md' : 'border-outline-variant'
        )}
        data-testid="kanban-card"
        onClick={() => { onClick?.(); setShowDrawer(true) }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {isActive && <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />}

        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-3 items-center">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm',
              isActive ? 'ring-2 ring-primary-fixed' : '',
              'bg-secondary-container text-on-secondary-container'
            )}>
              {initials}
            </div>
            <div>
              <p className={cn('text-base text-on-surface leading-tight', isActive ? 'font-bold' : 'font-semibold')}>{application.candidates?.full_name}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {application.status === 'ai_screening' ? (
                  <span className="flex items-center gap-1 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {t('pipeline.processing')}
                  </span>
                ) : (
                  application.candidates?.current_position || t('pipeline.candidate_default')
                )}
              </p>
            </div>
          </div>

          {matchScore > 0 && (
            <span className={cn(
              'text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1',
              matchScore >= 80 ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant border border-outline-variant/50'
            )}>
              {matchScore >= 80 && <Sparkles size={12} />}
              {t('pipeline.match_percent', { score: matchScore })}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2">
            <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
              {application.candidates?.years_experience ? t('pipeline.years_experience', { count: application.candidates.years_experience }) : t('pipeline.no_experience')}
            </span>
            {application.candidates?.primary_skill && (
              <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                {application.candidates.primary_skill}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon_sm"
              onClick={e => { e.stopPropagation(); setShowDrawer(true) }}
              aria-label={t('pipeline.view_candidate_details', { name: application.candidates?.full_name || t('pipeline.candidate_default') })}
              icon={<Eye size={16} />}
            />
            <Button
              variant="ghost"
              size="icon_sm"
              onClick={handleOpenChat}
              aria-label={t('pipeline.chat_with_candidate', { name: application.candidates?.full_name || t('pipeline.candidate_default') })}
              icon={<MessageSquare size={16} />}
            />
          </div>
        </div>

        {/* Stage Move Buttons — shown on hover or actions toggle */}
        {(showActions || showDrawer) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/50">
            {stageIndex > 0 && (
              <Button
                variant="outline"
                size="xs"
                onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: application.id, status: PIPELINE_STAGES[stageIndex - 1].id }) }}
                icon={<ArrowLeft size={12} />}
              >
                {t('pipeline.back')}
              </Button>
            )}
            {stageIndex < PIPELINE_STAGES.length - 2 && (
              <Button
                variant="outline"
                size="xs"
                onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: application.id, status: PIPELINE_STAGES[stageIndex + 1].id }) }}
                icon={<ArrowRight size={12} />}
                iconPosition="right"
              >
                {t('pipeline.forward')}
              </Button>
            )}
            {hasCV && application.status === 'applied' && (
              <Button
                variant="default"
                size="xs"
                onClick={handleScreen}
                disabled={triggerAI.isPending}
                loading={triggerAI.isPending}
                icon={<Sparkles size={12} />}
              >
                {triggerAI.isPending ? t('pipeline.screening') : t('pipeline.screen')}
              </Button>
            )}
          </div>
        )}
      </div>

      <ApplicationDrawer application={application} onClose={() => setShowDrawer(false)} open={showDrawer} />
    </>
  )
})

export default ApplicationCard
