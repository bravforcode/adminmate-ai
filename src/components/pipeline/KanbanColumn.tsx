import { ApplicationCard } from './ApplicationCard'
import { cn } from '../../lib/utils'
import { useTranslation } from 'react-i18next'

const COLUMN_COLORS: Record<string, string> = {
  applied: 'border-t-primary',
  ai_screening: 'border-t-secondary',
  shortlisted: 'border-t-tertiary',
  interviewing: 'border-t-primary-fixed-dim',
  offered: 'border-t-secondary-fixed-dim',
  hired: 'border-t-success-track',
  rejected: 'border-t-error',
}

import { Application } from '../../types/models'

interface KanbanColumnProps {
  stage: { id: string; labelKey: string }
  applications: Application[]
  onSelectApplication?: (app: Application) => void
  selectedId?: string
}

export function KanbanColumn({ stage, applications, onSelectApplication, selectedId }: KanbanColumnProps) {
  const { t } = useTranslation('recruitment')
  return (
    <div className={cn('kanban-column flex-shrink-0 w-[340px] sm:w-full flex flex-col gap-4 snap-start', COLUMN_COLORS[stage.id] || 'border-t-outline-variant')} data-testid={`column-${stage.id}`}>
      <div className="flex justify-between items-center px-2">
        <h3 className="text-base font-semibold text-on-surface flex items-center gap-2">
          {t(stage.labelKey)}
          <span className="bg-surface-container-high text-on-surface-variant text-xs px-2 py-0.5 rounded-full ml-auto">{applications.length}</span>
        </h3>
      </div>
      <div role="list" aria-label={`${t(stage.labelKey)} - ${applications.length} candidates`} className="kanban-column-list flex flex-col gap-3 overflow-y-auto pr-2 pb-2 max-h-[calc(100vh-280px)]">
        {applications.length === 0 ? (
          <p className="text-xs text-center text-on-surface-variant py-4" role="listitem">{t('pipeline.no_candidates')}</p>
        ) : (
          applications.map(app => (
            <ApplicationCard
              key={app.id}
              application={app}
              isActive={selectedId === app.id}
              onClick={() => onSelectApplication?.(app)}
              role="listitem"
            />
          ))
        )}
      </div>
    </div>
  )
}
