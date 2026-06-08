import { useState } from 'react'
import { useUpdateApplicationStatus, useTriggerAIScreening } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { Sparkles, ArrowRight, ArrowLeft, Eye, MessageSquare } from 'lucide-react'
import { PIPELINE_STAGES } from '../../utils/constants'
import { ApplicationDrawer } from './ApplicationDrawer'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

interface ApplicationCardProps {
  application: any
  isActive?: boolean
  onClick?: () => void
}

export function ApplicationCard({ application, isActive, onClick }: ApplicationCardProps) {
  const updateStatus = useUpdateApplicationStatus()
  const triggerAI = useTriggerAIScreening()
  const company = useAuthStore(s => s.company)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === application.status)
  const hasCV = !!application.cv_documents?.some((cv: any) => cv.is_current)
  const initials = application.candidates?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const matchScore = application.ai_match_score ?? 0

  const handleScreen = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const latestCV = application.cv_documents?.find((cv: any) => cv.is_current)
    if (!latestCV) { toast.error('No CV available for screening'); return }
    await triggerAI.mutateAsync({ applicationId: application.id, jobId: application.job_id, cvDocumentId: latestCV.id, companyId: company?.id ?? '' })
  }

  return (
    <>
      <div
        className={cn(
          'bg-surface-container-lowest p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden',
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
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Processing...
                  </span>
                ) : (
                  application.candidates?.current_position || 'Candidate'
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
              {matchScore}% Match
            </span>
          )}
        </div>

        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2">
            <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
              {application.candidates?.years_experience ? `${application.candidates.years_experience} yrs exp` : 'N/A exp'}
            </span>
            {application.candidates?.primary_skill && (
              <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                {application.candidates.primary_skill}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); setShowDrawer(true) }}
              className="text-on-surface-variant hover:text-primary hover:bg-primary-fixed/50 p-1.5 rounded-full transition-colors"
              title="View details"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); toast.success('Chat opened') }}
              className="text-on-surface-variant hover:text-primary hover:bg-primary-fixed/50 p-1.5 rounded-full transition-colors"
              title="Chat"
            >
              <MessageSquare size={16} />
            </button>
          </div>
        </div>

        {/* Stage Move Buttons — shown on hover or actions toggle */}
        {(showActions || showDrawer) && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/50">
            {stageIndex > 0 && (
              <button
                onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: application.id, status: PIPELINE_STAGES[stageIndex - 1].id }) }}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
            {stageIndex < PIPELINE_STAGES.length - 2 && (
              <button
                onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: application.id, status: PIPELINE_STAGES[stageIndex + 1].id }) }}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
              >
                Forward <ArrowRight size={12} />
              </button>
            )}
            {hasCV && application.status === 'applied' && (
              <button
                onClick={handleScreen}
                disabled={triggerAI.isPending}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Sparkles size={12} className={triggerAI.isPending ? 'animate-spin' : ''} />
                {triggerAI.isPending ? 'Screening...' : 'Screen'}
              </button>
            )}
          </div>
        )}
      </div>

      {showDrawer && <ApplicationDrawer application={application} onClose={() => setShowDrawer(false)} />}
    </>
  )
}
