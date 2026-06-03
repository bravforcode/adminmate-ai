import { useState } from 'react'
import { useApplications } from '../../hooks/useApplications'
import { useJobs } from '../../hooks/useJobs'
import { KanbanColumn } from './KanbanColumn'
import { PIPELINE_STAGES } from '../../utils/constants'

interface KanbanBoardProps {
  onSelectApplication?: (app: any) => void
  selectedId?: string
}

export function KanbanBoard({ onSelectApplication, selectedId }: KanbanBoardProps) {
  const { data: jobs } = useJobs()
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const { data: applications, isLoading } = useApplications(selectedJobId)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <select data-testid="job-filter" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
          className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm min-w-[250px]">
          <option value="">{jobs?.filter(j => j.status === 'active').length ? 'Select a job...' : 'No active jobs'}</option>
          {jobs?.filter(j => j.status === 'active').map(j => (
            <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
          ))}
        </select>
      </div>

      {!selectedJobId ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">Select an active job to view its pipeline</div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">Loading pipeline...</div>
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
