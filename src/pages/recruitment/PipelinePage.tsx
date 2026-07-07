import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { KanbanBoard } from '../../components/pipeline/KanbanBoard'
import { useUpdateApplicationStatus } from '../../hooks/useApplications'
import { useJobs } from '../../hooks/useJobs'
import { useAuthStore } from '../../stores/authStore'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { Application } from '../../types/models'
import { Button } from '../../components/ui/Button'
import { Sparkles, ArrowRight, Brain, Check, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function PipelinePage() {
  const { t } = useTranslation('recruitment')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateStatus = useUpdateApplicationStatus()
  const company = useAuthStore(s => s.company)
  const { data: jobs } = useJobs()
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  // Realtime: refresh pipeline when candidates or applications change
  const companyId = company?.id
  useRealtimeSubscription({
    table: 'candidates',
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    onChange: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    }, [queryClient]),
  })

  const currentJob = jobs?.[0]

  const handleMoveToInterview = async () => {
    if (!selectedApplication) return
    try {
      await updateStatus.mutateAsync({ id: selectedApplication.id, status: 'interviewing' })
      toast.success(t('pipeline.moved_to_interviewing'))
      setSelectedApplication(null)
    } catch (err) {
      if (import.meta.env.DEV) console.error('[PipelinePage] Status update failed:', err)
      toast.error(t('pipeline.failed_to_update'))
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-96px)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-on-surface tracking-tight">
            {t('pipeline.title')} <span className="text-lg font-normal text-on-surface-variant ml-2">/ {t('pipeline.title_th')}</span>
          </h2>
          <p className="text-sm text-on-surface-variant mt-1 truncate">{currentJob?.title || t('pipeline.all_jobs')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/recruitment/jobs')} icon={<Sparkles size={16} />}>
          {t('pipeline.jd_generation')} / {t('pipeline.jd_generation_th')}
        </Button>
      </div>

      {/* Kanban + AI Sidebar */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="flex-1 min-w-0">
          <KanbanBoard onSelectApplication={setSelectedApplication} selectedId={selectedApplication?.id} />
        </div>

        {/* AI Insights Sidebar */}
        {selectedApplication && (
          <aside className="hidden lg:flex w-[360px] bg-surface-container-lowest border-l border-outline-variant shadow-[-8px_0_32px_rgba(0,33,82,0.06)] flex-col z-30 shrink-0">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Sparkles size={20} className="bg-primary/10 p-1.5 rounded-lg" />
                <h3 className="text-lg font-semibold tracking-tight">{t('pipeline.ai_insights')} <span className="font-normal text-on-surface-variant text-sm ml-1">/ {t('pipeline.ai_insights_th')}</span></h3>
              </div>
              <Button variant="ghost" size="icon_md" onClick={() => setSelectedApplication(null)}>×</Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-3xl shadow-md ring-4 ring-surface-container-lowest">
                    {selectedApplication.candidates?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </div>
                  <span className="absolute bottom-0 right-0 bg-primary w-6 h-6 rounded-full border-2 border-surface-container-lowest flex items-center justify-center text-white"><Check size={14} strokeWidth={3} /></span>
                </div>
                <h4 className="text-xl font-bold text-on-surface break-words">{selectedApplication.candidates?.full_name}</h4>
                <p className="text-sm text-on-surface-variant mt-1">{selectedApplication.candidates?.current_position || t('pipeline.candidate')}</p>
                <div className="mt-4 bg-primary text-on-primary text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                  <Sparkles size={14} /> {selectedApplication.ai_match_score || 0}% {t('pipeline.overall_match')}
                </div>
              </div>

              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/50">
                <h5 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary" /> {t('pipeline.why_match')} / {t('pipeline.why_match_th')}
                </h5>
                {selectedApplication.ai_analysis ? (
                  <ul className="flex flex-col gap-4">
                    {selectedApplication.ai_analysis.matched_skills && selectedApplication.ai_analysis.matched_skills.length > 0 && (
                      <li className="flex gap-3 items-start">
                        <Check size={18} className="text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{t('pipeline.skills_match')}</p>
                          <p className="text-xs text-on-surface-variant mt-1 leading-snug">
                            {t('pipeline.matched')}: {selectedApplication.ai_analysis.matched_skills.join(', ')}
                          </p>
                        </div>
                      </li>
                    )}
                    {selectedApplication.ai_analysis.experience_match && (
                      <li className="flex gap-3 items-start">
                        <Check size={18} className="text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{t('pipeline.experience_match')}</p>
                          <p className="text-xs text-on-surface-variant mt-1 leading-snug">{selectedApplication.ai_analysis.experience_match}</p>
                        </div>
                      </li>
                    )}
                    {selectedApplication.ai_analysis.education_match && (
                      <li className="flex gap-3 items-start">
                        <Check size={18} className="text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{t('pipeline.education_match')}</p>
                          <p className="text-xs text-on-surface-variant mt-1 leading-snug">{selectedApplication.ai_analysis.education_match}</p>
                        </div>
                      </li>
                    )}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <Brain size={24} className="text-outline-variant" />
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {t('pipeline.ai_screening_pending')}<br />
                      {t('pipeline.ai_screening_pending_desc')}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 pb-2">
                <Button
                  variant="default"
                  fullWidth
                  onClick={handleMoveToInterview}
                  disabled={updateStatus.isPending}
                  icon={<ArrowRight size={16} />}
                  iconPosition="right"
                >
                  {updateStatus.isPending ? t('pipeline.updating') : t('pipeline.move_to_interview')}
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default PipelinePage
