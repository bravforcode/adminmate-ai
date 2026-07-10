import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Target, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Construction } from 'lucide-react'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import type { OkrObjective, OkrKeyResult } from '../services/performance/performanceService'

type OkrStatus = 'on_track' | 'at_risk' | 'behind' | 'completed'

const STATUS_CONFIG: Record<OkrStatus, { color: string; icon: typeof Target; label: string }> = {
  on_track: { color: 'bg-green-50 dark:bg-success-subtle/30 text-green-700 dark:text-success', icon: CheckCircle2, label: 'On Track' },
  at_risk: { color: 'bg-yellow-50 dark:bg-warning-subtle/30 text-yellow-700 dark:text-warning', icon: AlertTriangle, label: 'At Risk' },
  behind: { color: 'bg-red-50 dark:bg-destructive-subtle/30 text-red-700 dark:text-destructive', icon: AlertTriangle, label: 'Behind' },
  completed: { color: 'bg-blue-50 dark:bg-primary-container/30 text-blue-700 dark:text-primary-muted', icon: CheckCircle2, label: 'Completed' },
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

function OKRCard({ objective, keyResults }: { objective: OkrObjective & { user_profiles?: { full_name: string } }; keyResults: (OkrKeyResult & { objective_id: string })[] }) {
  const { t } = useTranslation(['performance', 'common'])
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS_CONFIG[objective.status] || STATUS_CONFIG.on_track
  const StatusIcon = statusCfg.icon

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-sunken/50 dark:hover:bg-surface-sunken/30 transition-colors"
      >
        <ProgressRing progress={objective.progress} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{objective.cycle_id ? `Cycle ${objective.cycle_id.slice(0, 8)}` : t('objective', 'Objective')}</p>
          {objective.user_profiles?.full_name && (
            <p className="text-xs text-ink-muted text-ink-muted mt-0.5">{objective.user_profiles.full_name}</p>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}>
          <StatusIcon size={12} className="inline mr-1" />
          {t(`okr_status_${objective.status}`, statusCfg.label)}
        </span>
        {expanded ? <ChevronDown size={16} className="text-ink-muted" /> : <ChevronRight size={16} className="text-ink-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-border/50 border-border/50 px-4 pb-4">
          {keyResults.length === 0 ? (
            <p className="text-sm text-ink-muted/60 dark:text-outline-variant py-3 italic">{t('no_key_results', 'No key results defined')}</p>
          ) : (
            <div className="space-y-3 pt-3">
              {keyResults.map(kr => {
                const pct = kr.target_value > 0 ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100)) : 0
                return (
                  <div key={kr.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-ink-muted text-ink-muted">{t('target', 'Target')}: {kr.target_value}</span>
                        <span className="text-xs font-medium text-ink text-ink">{kr.current_value} / {kr.target_value}</span>
                      </div>
                      <div className="w-full bg-surface-sunken rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-error'}`}
                          style={{ width: `${pct}%` }}
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${pct}% completion`}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-ink-muted text-ink-muted w-10 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function OKRPage() {
  const { t } = useTranslation(['performance', 'common'])
  const company = useAuthStore(s => s.company)
  const [viewMode, setViewMode] = useState<'all' | 'on_track' | 'at_risk' | 'behind' | 'completed'>('all')

  const { data: objectives, isLoading: objLoading, isError: objError, refetch: refetchObj } = useQuery({
    queryKey: ['okr', 'objectives', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_objectives')
        .select('*, user_profiles:employee_id(full_name)')
        .eq('company_id', company?.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as (OkrObjective & { user_profiles?: { full_name: string } })[]
    },
    enabled: !!company?.id,
  })

  const { data: keyResults, isLoading: krLoading, isError: krError, refetch: refetchKr } = useQuery({
    queryKey: ['okr', 'key_results', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_key_results')
        .select('*')
        .eq('company_id', company?.id)
      if (error) throw error
      return (data ?? []) as OkrKeyResult[]
    },
    enabled: !!company?.id,
  })

  const filteredObjectives = useMemo(() => {
    if (!objectives) return []
    if (viewMode === 'all') return objectives
    return objectives.filter(o => o.status === viewMode)
  }, [objectives, viewMode])

  const statusCounts = useMemo(() => {
    if (!objectives) return { on_track: 0, at_risk: 0, behind: 0, completed: 0, total: 0 }
    return {
      total: objectives.length,
      on_track: objectives.filter(o => o.status === 'on_track').length,
      at_risk: objectives.filter(o => o.status === 'at_risk').length,
      behind: objectives.filter(o => o.status === 'behind').length,
      completed: objectives.filter(o => o.status === 'completed').length,
    }
  }, [objectives])

  const avgProgress = useMemo(() => {
    if (!objectives || objectives.length === 0) return 0
    return Math.round(objectives.reduce((sum, o) => sum + o.progress, 0) / objectives.length)
  }, [objectives])

  const isLoading = objLoading || krLoading
  const isError = objError || krError
  const refetch = () => { refetchObj(); refetchKr() }

  if (isError) {
    return <ErrorState title={t('common:errors.load_failed')} message="" onRetry={refetch} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-ink text-ink">{t('okr_title', 'OKRs & Goals')}</h1>
          <p className="text-body-md text-ink-muted text-ink-muted mt-1">{t('okr_subtitle', 'Track objectives, key results, and alignment across the organization')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-sunken text-ink-muted text-ink-muted text-sm">
          <Construction size={16} />
          <span>{t('coming_soon', 'Coming Soon')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['all', 'on_track', 'at_risk', 'behind', 'completed'] as const).map(status => {
          const cfg = status === 'all' ? null : STATUS_CONFIG[status]
          const count = status === 'all' ? statusCounts.total : statusCounts[status]
          return (
            <button
              key={status}
              onClick={() => setViewMode(status)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                viewMode === status
                  ? 'border-primary dark:border-accent-dim bg-primary-container/10 dark:bg-primary-muted/10'
                  : 'border-border hover:border-primary/50 dark:hover:border-accent-dim/50'
              }`}
            >
              <p className="text-xs text-ink-muted text-ink-muted">{status === 'all' ? t('all_okrs', 'All') : t(`okr_status_${status}`, cfg!.label)}</p>
              <p className="text-lg font-bold text-ink mt-1">{count}</p>
            </button>
          )
        })}
      </div>

      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={18} className="text-primary dark:text-primary-muted" />
          <span className="text-sm font-medium text-ink text-ink">{t('overall_progress', 'Overall OKR Progress')}</span>
        </div>
        <div className="w-full bg-surface-sunken rounded-full h-3 mb-1">
          <div
            className="bg-primary dark:bg-primary-muted h-3 rounded-full transition-all duration-500"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
        <p className="text-xs text-ink-muted text-ink-muted">{avgProgress}% {t('average', 'average')} · {statusCounts.total} {t('objectives', 'objectives')}</p>
      </div>

      {isLoading ? (
            <LoadingState variant="cards" rows={4} message={t('common:loading')} />
      ) : filteredObjectives.length === 0 ? (
        <EmptyState
          icon={Target}
          title={viewMode === 'all' ? t('no_okrs', 'No OKRs Found') : t('no_okrs_filter', 'No OKRs with this status')}
          description={t('no_okrs_desc', 'Create your first OKR to start tracking goals')}
        />
      ) : (
        <div className="space-y-3">
          {filteredObjectives.map(obj => (
            <OKRCard
              key={obj.id}
              objective={obj}
              keyResults={(keyResults || []).filter(kr => kr.objective_id === obj.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default OKRPage
