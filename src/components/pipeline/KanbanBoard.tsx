import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApplications } from '../../hooks/useApplications'
import { useJobs } from '../../hooks/useJobs'
import { KanbanColumn } from './KanbanColumn'
import { PIPELINE_STAGES } from '../../utils/constants'
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react'

interface KanbanBoardProps {
  onSelectApplication?: (app: any) => void
  selectedId?: string
}

export function KanbanBoard({ onSelectApplication, selectedId }: KanbanBoardProps) {
  const { t } = useTranslation('recruitment')
  const { data: jobs, isLoading: jobsLoading } = useJobs()
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const { data: applications, isLoading, isError, error, refetch } = useApplications(selectedJobId)

  const activeJobs = jobs?.filter(j => j.status === 'active') || []

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <select data-testid="job-filter" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
          className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm min-w-[250px]">
          <option value="">{activeJobs.length ? t('pipeline.select_job') : t('pipeline.no_active_jobs')}</option>
          {activeJobs.map(j => (
            <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
          ))}
        </select>
      </div>

      {jobsLoading ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">{t('common:loading')}</div>
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90"
          >
            <RefreshCw size={14} /> {t('common:errors.retry')}
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">{t('pipeline.loading_pipeline')}</div>
      ) : (
        <div className="flex-1 overflow-x-auto flex gap-6 pb-4 kanban-scroll">
          {PIPELINE_STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              applications={applications?.filter((a: any) => a.status === stage.id) || []}
              onSelectApplication={onSelectApplication}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
