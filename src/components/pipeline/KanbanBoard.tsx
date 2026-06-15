import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useApplications } from '../../hooks/useApplications'
import { useJobs } from '../../hooks/useJobs'
import { KanbanColumn } from './KanbanColumn'
import { PIPELINE_STAGES } from '../../utils/constants'
import { LoadingState } from '../shared/LoadingState'
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react'

import { Application } from '../../types/models'

interface KanbanBoardProps {
  onSelectApplication?: (app: Application) => void
  selectedId?: string
}

export function KanbanBoard({ onSelectApplication, selectedId }: KanbanBoardProps) {
  const { t } = useTranslation('recruitment')
  const { data: jobs, isLoading: jobsLoading } = useJobs()
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const { data: applications, isLoading, isError, error, refetch } = useApplications(selectedJobId)
  const boardRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  const activeJobs = jobs?.filter(j => j.status === 'active') || []

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const handleScroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth
      setScrollProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <select data-testid="job-filter" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
          className="px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm min-w-[250px]">
          <option value="">{activeJobs.length ? t('pipeline.select_job') : t('pipeline.no_active_jobs')}</option>
          {activeJobs.map(j => (
            <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
          ))}
        </select>
      </div>

      {jobsLoading ? (
        <div className="flex-1">
          <LoadingState variant="kanban" />
        </div>
      ) : !selectedJobId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
          <Inbox size={48} className="mb-3 text-outline-variant" />
          <p className="text-sm font-medium">{t('pipeline.select_job_prompt')}</p>
          <p className="text-xs text-on-surface-variant/70 mt-1">{t('pipeline.select_job_prompt_desc')}</p>
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertCircle size={40} className="text-error mb-3" />
          <h3 className="font-semibold text-on-surface mb-1">{t('common:errors.load_failed')}</h3>
          <p className="text-sm text-on-surface-variant mb-4">{(error as Error)?.message || ''}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium hover:opacity-90 transition-all duration-200"
          >
            <RefreshCw size={14} /> {t('common:errors.retry')}
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">{t('pipeline.loading_pipeline')}</div>
      ) : (
        <>
        <div ref={boardRef} className="kanban-board flex-1 overflow-x-auto flex gap-6 pb-4 kanban-scroll snap-x snap-mandatory scroll-smooth">
          {PIPELINE_STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              applications={applications?.filter((a: Application) => a.status === stage.id) || []}
              onSelectApplication={onSelectApplication}
              selectedId={selectedId}
            />
          ))}
        </div>
        {/* Scroll position indicator */}
        <div className="md:hidden flex justify-center gap-1.5 pt-2">
          {PIPELINE_STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                Math.abs(scrollProgress - i / (PIPELINE_STAGES.length - 1)) < 0.15
                  ? 'bg-primary w-4'
                  : 'bg-outline-variant w-1.5'
              }`}
            />
          ))}
        </div>
        </>
      )}
    </div>
  )
}
