import { useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useUpdateApplicationStatus } from '../../hooks/useApplications'
import { useTriggerAIScreening } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { PIPELINE_STAGES } from '../../utils/constants'
import { Button } from '../ui/Button'
import { X, Sparkles, MapPin, Mail, Phone, Lightbulb, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { Application, CVDocument } from '../../types/models'

interface ApplicationDrawerProps { application: Application; onClose: () => void; open?: boolean }

export function ApplicationDrawer({ application, onClose, open = true }: ApplicationDrawerProps) {
  const { t } = useTranslation('recruitment')
  const updateStatus = useUpdateApplicationStatus()
  const triggerAI = useTriggerAIScreening()
  const company = useAuthStore(s => s.company)
  const candidate = application.candidates
  const latestCV = application.cv_documents?.find((cv: CVDocument) => cv.is_current)
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [open])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [onClose])
  const handleScreen = async () => {
    if (!latestCV) { toast.error(t('pipeline.no_cv_for_screening')); return }
    await triggerAI.mutateAsync({ applicationId: application.id, jobId: application.job_id ?? '', cvDocumentId: latestCV.id, companyId: company?.id ?? '' })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            className="relative w-full max-w-lg bg-surface h-full scroll-premium shadow-xl p-6"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <Button variant="ghost" size="icon_md" onClick={onClose} aria-label={t('pipeline.close_details')} className="absolute top-4 right-4" icon={<X size={20} />} />

            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-primary-container text-white-container flex items-center justify-center font-bold text-2xl mb-3">
                {candidate?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <h2 id="drawer-title" className="text-headline-md font-bold text-ink">{candidate?.full_name}</h2>
              <p className="text-body-md text-ink-muted">{candidate?.current_position || t('pipeline.candidate_default')}</p>
              <div className="flex gap-3 mt-2 text-xs text-ink-muted">
                {candidate?.email && <span className="flex items-center gap-1"><Mail size={12} /> {candidate.email}</span>}
                {candidate?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {candidate.phone}</span>}
                {candidate?.location && <span className="flex items-center gap-1"><MapPin size={12} /> {candidate.location}</span>}
              </div>
            </div>

            {application.ai_match_score != null && (
              <div className="bg-surface-sunken rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={16} className="text-primary" /> {t('pipeline.ai_match_score')}</h3>
                  <span className="text-lg font-bold text-primary">{application.ai_match_score}%</span>
                </div>
                {application.ai_summary && <p className="text-sm text-ink-muted mb-3">{application.ai_summary}</p>}
                {application.ai_missing_skills && application.ai_missing_skills.length > 0 && (
                  <div className="mb-3"><h4 className="text-xs font-semibold text-ink-muted mb-1">{t('pipeline.missing_skills')}</h4>
                    <div className="flex flex-wrap gap-1">{application.ai_missing_skills.map((s: string) => <span key={s} className="px-2 py-0.5 bg-destructive-subtle/30 text-destructive text-xs rounded">{s}</span>)}</div>
                  </div>
                )}
                {application.ai_suggested_questions && application.ai_suggested_questions.length > 0 && (
                  <div><h4 className="text-xs font-semibold text-ink-muted mb-1 flex items-center gap-1"><Lightbulb size={12} /> {t('pipeline.suggested_interview_questions')}</h4>
                    <ul className="text-xs text-ink-muted space-y-1 pl-3">{application.ai_suggested_questions.map((q: string, i: number) => <li key={i} className="italic">"{q}"</li>)}</ul>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <Button variant="default" size="sm" onClick={handleScreen} disabled={triggerAI.isPending || !latestCV} loading={triggerAI.isPending} icon={<RefreshCw size={14} />}>
                {triggerAI.isPending ? t('pipeline.screening') : t('pipeline.screen_with_ai')}
              </Button>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">{t('pipeline.move_to')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PIPELINE_STAGES.filter(s => s.id !== application.status && s.id !== 'rejected').map(stage => (
                  <Button key={stage.id} variant="outline" size="xs" onClick={() => updateStatus.mutate({ id: application.id, status: stage.id })}>
                    {t(stage.labelKey)}
                  </Button>
                ))}
              </div>
            </div>

            {latestCV?.parsed_content && (
              <div className="p-4 bg-surface-sunken rounded-lg">
                <h3 className="text-sm font-semibold mb-3">{t('candidates.parsed_cv_data')}</h3>
                <pre className="text-xs text-ink-muted whitespace-pre-wrap font-mono">{JSON.stringify(latestCV.parsed_content, null, 2)}</pre>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
