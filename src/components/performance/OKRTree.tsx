import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Target, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { OkrObjective, OkrKeyResult } from '../../services/performance/performanceService'
import { cn } from '../../lib/utils'

type OkrStatus = 'on_track' | 'at_risk' | 'behind' | 'completed'

const STATUS_CONFIG: Record<OkrStatus, { color: string; icon: typeof Target; label: string }> = {
  on_track: { color: 'bg-green-50 dark:bg-success-container/30 text-green-700 dark:text-success', icon: CheckCircle2, label: 'On Track' },
  at_risk: { color: 'bg-yellow-50 dark:bg-warning-container/30 text-yellow-700 dark:text-warning', icon: AlertTriangle, label: 'At Risk' },
  behind: { color: 'bg-red-50 dark:bg-error-container/30 text-red-700 dark:text-error', icon: AlertTriangle, label: 'Behind' },
  completed: { color: 'bg-blue-50 dark:bg-primary-container/30 text-blue-700 dark:text-accent-dim', icon: CheckCircle2, label: 'Completed' },
}

function ProgressRing({ progress, size = 40 }: { progress: number; size?: number }) {
  const radius = (size - 6) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference
  const color = progress >= 70 ? '#16a34a' : progress >= 40 ? '#ca8a04' : '#dc2626'

  return (
    <svg width={size} height={size} className="shrink-0" role="img" aria-label={`${progress}% progress`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-outline-variant/30 dark:text-outline/30" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="text-[10px] font-bold fill-on-surface dark:fill-on-surface">{progress}%</text>
    </svg>
  )
}

interface OKRTreeProps {
  objectives: (OkrObjective & { user_profiles?: { full_name: string } })[]
  keyResults: OkrKeyResult[]
  onObjectiveClick?: (objective: OkrObjective) => void
  onKeyResultClick?: (keyResult: OkrKeyResult) => void
}

export function OKRTree({ objectives, keyResults, onObjectiveClick, onKeyResultClick }: OKRTreeProps) {
  const { t } = useTranslation(['performance', 'common'])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (objectives.length === 0) {
    return (
      <div className="text-center py-8 text-on-surface-variant dark:text-on-surface-variant">
        <Target size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('no_okrs', 'No OKRs Found')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {objectives.map(obj => {
        const objKeyResults = keyResults.filter(kr => kr.objective_id === obj.id)
        const isExpanded = expandedIds.has(obj.id)
        const statusCfg = STATUS_CONFIG[obj.status] || STATUS_CONFIG.on_track
        const StatusIcon = statusCfg.icon

        return (
          <div key={obj.id} className="bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline overflow-hidden">
            <button
              onClick={() => {
                toggleExpand(obj.id)
                onObjectiveClick?.(obj)
              }}
              aria-expanded={isExpanded}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-container-high/50 dark:hover:bg-surface-container/30 transition-colors"
            >
              <ProgressRing progress={obj.progress} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface dark:text-on-surface truncate">{obj.title}</p>
                {obj.user_profiles?.full_name && (
                  <p className="text-xs text-on-surface-variant dark:text-on-surface-variant mt-0.5">{obj.user_profiles.full_name}</p>
                )}
              </div>
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusCfg.color)}>
                <StatusIcon size={12} className="inline mr-1" />
                {t(`okr_status_${obj.status}`, statusCfg.label)}
              </span>
              {isExpanded ? <ChevronDown size={16} className="text-on-surface-variant" /> : <ChevronRight size={16} className="text-on-surface-variant" />}
            </button>

            {isExpanded && (
              <div className="border-t border-outline-variant/50 dark:border-outline/50 px-4 pb-4">
                {objKeyResults.length === 0 ? (
                  <p className="text-sm text-on-surface-variant/60 dark:text-outline-variant py-3 italic">{t('no_key_results', 'No key results defined')}</p>
                ) : (
                  <div className="space-y-3 pt-3">
                    {objKeyResults.map(kr => {
                      const pct = kr.target_value > 0 ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100)) : 0
                      return (
                        <button
                          key={kr.id}
                          onClick={() => onKeyResultClick?.(kr)}
                          className="flex items-center gap-3 w-full text-left hover:bg-surface-container-high/30 dark:hover:bg-surface-container/20 rounded-lg p-2 -mx-2 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-on-surface dark:text-on-surface truncate mb-1">{kr.title}</p>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-on-surface-variant dark:text-on-surface-variant">{t('target', 'Target')}: {kr.target_value}{kr.unit ? ` ${kr.unit}` : ''}</span>
                              <span className="text-[10px] font-medium text-on-surface dark:text-on-surface">{kr.current_value} / {kr.target_value}</span>
                            </div>
                            <div className="w-full bg-surface-container-high dark:bg-surface-container rounded-full h-2">
                              <div
                                className={cn('h-2 rounded-full transition-all duration-500', pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-error')}
                                style={{ width: `${pct}%` }}
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-on-surface-variant dark:text-on-surface-variant w-10 text-right">{pct}%</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
