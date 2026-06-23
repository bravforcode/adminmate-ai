import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Target, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { Button } from '../components/ui/Button'
import type { OkrObjective, OkrKeyResult } from '../services/performance/performanceService'

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

function OKRCard({ objective, keyResults }: { objective: OkrObjective & { user_profiles?: { full_name: string } }; keyResults: (OkrKeyResult & { objective_id: string })[] }) {
  const { t } = useTranslation(['performance', 'common'])
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS_CONFIG[objective.status] || STATUS_CONFIG.on_track
  const StatusIcon = statusCfg.icon

  return (
    <div className="bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-container-high/50 dark:hover:bg-surface-container/30 transition-colors"
      >
        <ProgressRing progress={objective.progress} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface dark:text-on-surface truncate">{objective.cycle_id ? `Cycle ${objective.cycle_id.slice(0, 8)}` : t('objective', 'Objective')}</p>
          {objective.user_profiles?.full_name && (
            <p className="text-xs text-on-surface-variant dark:text-on-surface-variant mt-0.5">{objective.user_profiles.full_name}</p>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}>
          <StatusIcon size={12} className="inline mr-1" />
          {t(`okr_status_${objective.status}`, statusCfg.label)}
        </span>
        {expanded ? <ChevronDown size={16} className="text-on-surface-variant" /> : <ChevronRight size={16} className="text-on-surface-variant" />}
      </button>

      {expanded && (
        <div className="border-t border-outline-variant/50 dark:border-outline/50 px-4 pb-4">
          {keyResults.length === 0 ? (
            <p className="text-sm text-on-surface-variant/60 dark:text-outline-variant py-3 italic">{t('no_key_results', 'No key results defined')}</p>
          ) : (
            <div className="space-y-3 pt-3">
              {keyResults.map(kr => {
                const pct = kr.target_value > 0 ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100)) : 0
                return (
                  <div key={kr.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-on-surface-variant dark:text-on-surface-variant">{t('target', 'Target')}: {kr.target_value}</span>
                        <span className="text-xs font-medium text-on-surface dark:text-on-surface">{kr.current_value} / {kr.target_value}</span>
                      </div>
                      <div className="w-full bg-surface-container-high dark:bg-surface-container rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-error'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-on-surface-variant dark:text-on-surface-variant w-10 text-right">{pct}%</span>
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
  const [showCreateForm, setShowCreateForm] = useState(false)

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
          <h1 className="text-headline-md font-bold text-on-surface dark:text-on-surface">{t('okr_title', 'OKRs & Goals')}</h1>
          <p className="text-body-md text-on-surface-variant dark:text-on-surface-variant mt-1">{t('okr_subtitle', 'Track objectives, key results, and alignment across the organization')}</p>
        </div>
        <Button
          variant="default"
          size="md"
          icon={<Plus size={16} />}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {t('create_okr', 'Create OKR')}
        </Button>
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
                  ? 'border-primary dark:border-accent-dim bg-primary-container/10 dark:bg-accent-dim/10'
                  : 'border-outline-variant dark:border-outline hover:border-primary/50 dark:hover:border-accent-dim/50'
              }`}
            >
              <p className="text-xs text-on-surface-variant dark:text-on-surface-variant">{status === 'all' ? t('all_okrs', 'All') : t(`okr_status_${status}`, cfg!.label)}</p>
              <p className="text-lg font-bold text-on-surface dark:text-on-surface mt-1">{count}</p>
            </button>
          )
        })}
      </div>

      <div className="bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline p-5">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={18} className="text-primary dark:text-accent-dim" />
          <span className="text-sm font-medium text-on-surface dark:text-on-surface">{t('overall_progress', 'Overall OKR Progress')}</span>
        </div>
        <div className="w-full bg-surface-container-high dark:bg-surface-container rounded-full h-3 mb-1">
          <div
            className="bg-primary dark:bg-accent-dim h-3 rounded-full transition-all duration-500"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
        <p className="text-xs text-on-surface-variant dark:text-on-surface-variant">{avgProgress}% {t('average', 'average')} · {statusCounts.total} {t('objectives', 'objectives')}</p>
      </div>

      {showCreateForm && (
        <div className="bg-surface dark:bg-surface rounded-xl border border-primary dark:border-accent-dim p-5">
          <h3 className="text-title-sm font-semibold text-on-surface dark:text-on-surface mb-4">{t('create_new_okr', 'Create New OKR')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant dark:text-on-surface-variant mb-1">{t('objective_label', 'Objective')}</label>
              <input className="w-full px-3 py-2 rounded-lg border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder={t('objective_placeholder', 'e.g. Improve customer satisfaction')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant dark:text-on-surface-variant mb-1">{t('cycle', 'Cycle')}</label>
              <select className="w-full px-3 py-2 rounded-lg border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="">{t('select_cycle', 'Select cycle')}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant dark:text-on-surface-variant mb-1">{t('key_results', 'Key Results')}</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2 rounded-lg border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder={t('kr_placeholder', 'e.g. Achieve NPS score of 70+')} />
                  <input type="number" className="w-24 px-3 py-2 rounded-lg border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder={t('target', 'Target')} />
                </div>
                <Button variant="ghost" size="sm" icon={<Plus size={14} />}>{t('add_key_result', 'Add Key Result')}</Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>{t('cancel', 'Cancel')}</Button>
            <Button variant="default" size="sm">{t('save_okr', 'Save OKR')}</Button>
          </div>
        </div>
      )}

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
