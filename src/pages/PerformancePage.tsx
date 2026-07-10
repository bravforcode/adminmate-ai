import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Target, BarChart3, TrendingUp, Clock, ChevronRight, LayoutGrid } from 'lucide-react'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { Button } from '../components/ui/Button'
import type { PerformanceCycle, PerformanceReview, NineBoxAssessment } from '../services/performance/performanceService'

type CycleStatus = 'draft' | 'active' | 'closed'

const STATUS_COLORS: Record<CycleStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 text-ink-variant',
  active: 'bg-green-50 dark:bg-success-subtle/30 text-green-700 dark:text-success',
  closed: 'bg-blue-50 dark:bg-primary-container/30 text-blue-700 dark:text-primary-muted',
}

const REVIEW_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 dark:bg-warning-subtle/30 text-yellow-700 dark:text-warning',
  in_progress: 'bg-blue-50 dark:bg-primary-container/30 text-blue-700 dark:text-primary-muted',
  submitted: 'bg-green-50 dark:bg-success-subtle/30 text-green-700 dark:text-success',
  approved: 'bg-teal-50 dark:bg-success-subtle/30 text-teal-700 dark:text-success',
}

const NINE_BOX_LABELS: Record<number, string> = {
  1: 'Low Perf / Low Potential',
  2: 'Med Perf / Low Potential',
  3: 'High Perf / Low Potential',
  4: 'Low Perf / Med Potential',
  5: 'Med Perf / Med Potential',
  6: 'High Perf / Med Potential',
  7: 'Low Perf / High Potential',
  8: 'Med Perf / High Potential',
  9: 'High Perf / High Potential',
}

const NINE_BOX_COLORS: Record<number, string> = {
  1: 'bg-red-100 dark:bg-destructive-subtle/30 text-red-800 dark:text-destructive',
  2: 'bg-orange-100 dark:bg-warning-subtle/30 text-orange-800 dark:text-warning',
  3: 'bg-yellow-100 dark:bg-warning-subtle/30 text-yellow-800 dark:text-warning',
  4: 'bg-orange-50 dark:bg-warning-subtle/20 text-orange-700 dark:text-warning',
  5: 'bg-yellow-50 dark:bg-warning-subtle/20 text-yellow-700 dark:text-warning',
  6: 'bg-green-50 dark:bg-success-subtle/30 text-green-700 dark:text-success',
  7: 'bg-blue-50 dark:bg-primary-container/30 text-blue-700 dark:text-primary-muted',
  8: 'bg-teal-50 dark:bg-success-subtle/30 text-teal-700 dark:text-success',
  9: 'bg-green-100 dark:bg-success-subtle/40 text-green-800 dark:text-success',
}

function KPICard({ title, value, icon: Icon, iconBg, iconColor }: { title: string; value: string | number; icon: typeof Target; iconBg: string; iconColor: string }) {
  return (
    <div className="bg-surface rounded-xl p-5 border border-border shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        <span className="text-sm text-ink-variant text-ink-variant">{title}</span>
      </div>
      <p className="text-2xl font-bold text-ink text-ink">{value}</p>
    </div>
  )
}

export function PerformancePage() {
  const { t } = useTranslation(['performance', 'common'])
  const company = useAuthStore(s => s.company)
  const [activeTab, setActiveTab] = useState<'cycles' | 'reviews' | 'ninebox'>('cycles')
  const [statusFilter, setStatusFilter] = useState<CycleStatus | ''>('')

  const { data: cycles, isLoading: cyclesLoading, isError: cyclesError, refetch: refetchCycles } = useQuery({
    queryKey: ['performance', 'cycles', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_cycles')
        .select('*')
        .eq('company_id', company?.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PerformanceCycle[]
    },
    enabled: !!company?.id,
  })

  const { data: reviews, isLoading: reviewsLoading, isError: reviewsError, refetch: refetchReviews } = useQuery({
    queryKey: ['performance', 'reviews', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select('*, user_profiles:employee_id(full_name)')
        .eq('company_id', company?.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as (PerformanceReview & { user_profiles?: { full_name: string } })[]
    },
    enabled: !!company?.id,
  })

  const { data: assessments, isLoading: assessmentsLoading, isError: assessmentsError, refetch: refetchAssessments } = useQuery({
    queryKey: ['performance', 'ninebox', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nine_box_assessments')
        .select('*, user_profiles:employee_id(full_name)')
        .eq('company_id', company?.id)
      if (error) throw error
      return (data ?? []) as (NineBoxAssessment & { user_profiles?: { full_name: string } })[]
    },
    enabled: !!company?.id,
  })

  const filteredCycles = useMemo(() => {
    if (!cycles) return []
    if (!statusFilter) return cycles
    return cycles.filter(c => c.status === statusFilter)
  }, [cycles, statusFilter])

  const cycleStats = useMemo(() => {
    if (!cycles) return { active: 0, completed: 0, total: 0 }
    return {
      total: cycles.length,
      active: cycles.filter(c => c.status === 'active').length,
      completed: cycles.filter(c => c.status === 'closed').length,
    }
  }, [cycles])

  const reviewStats = useMemo(() => {
    if (!reviews) return { total: 0, submitted: 0, pending: 0, completionPct: 0 }
    const submitted = reviews.filter(r => ['submitted', 'approved'].includes(r.status)).length
    return {
      total: reviews.length,
      submitted,
      pending: reviews.length - submitted,
      completionPct: reviews.length > 0 ? Math.round((submitted / reviews.length) * 100) : 0,
    }
  }, [reviews])

  const nineBoxGrid = useMemo(() => {
    if (!assessments) return Array.from({ length: 9 }, () => [])
    const grid: (typeof assessments)[] = Array.from({ length: 9 }, () => [])
    assessments.forEach(a => {
      const pos = a.box_position
      if (pos && pos >= 1 && pos <= 9) grid[pos - 1].push(a)
    })
    return grid
  }, [assessments])

  const isLoading = cyclesLoading || reviewsLoading || assessmentsLoading
  const isError = cyclesError || reviewsError || assessmentsError
  const refetch = () => { refetchCycles(); refetchReviews(); refetchAssessments() }

  if (isError) {
    return <ErrorState title={t('common:errors.load_failed')} message="" onRetry={refetch} />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-ink text-ink">{t('title', 'Performance Management')}</h1>
        <p className="text-body-md text-ink-variant text-ink-variant mt-1">{t('subtitle', 'Manage review cycles, track performance, and identify talent')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('active_cycles', 'Active Cycles')} value={cycleStats.active} icon={Target} iconBg="bg-primary-container dark:bg-primary-container/30" iconColor="text-primary dark:text-primary-muted" />
        <KPICard title={t('total_reviews', 'Total Reviews')} value={reviewStats.total} icon={BarChart3} iconBg="bg-surface-sunken dark:bg-surface-sunken/30" iconColor="text-ink-faint dark:text-ink-faint" />
        <KPICard title={t('review_completion', 'Review Completion')} value={`${reviewStats.completionPct}%`} icon={TrendingUp} iconBg="bg-success-subtle dark:bg-success-subtle/30" iconColor="text-success dark:text-success" />
        <KPICard title={t('pending_reviews', 'Pending Reviews')} value={reviewStats.pending} icon={Clock} iconBg="bg-warning-subtle dark:bg-warning-subtle/30" iconColor="text-warning dark:text-warning" />
      </div>

      <div className="flex gap-1 border-b border-border border-border" role="tablist" aria-label={t('performance.tabs_label', 'Performance sections')}>
        {(['cycles', 'reviews', 'ninebox'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-performance-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary dark:border-accent-dim text-primary dark:text-primary-muted'
                : 'border-transparent text-ink-variant text-ink-variant hover:text-ink dark:hover:text-ink'
            }`}
          >
            {tab === 'cycles' ? t('tab_cycles', 'Cycles') : tab === 'reviews' ? t('tab_reviews', 'Reviews') : t('tab_ninebox', '9-Box Grid')}
          </button>
        ))}
      </div>

      {activeTab === 'cycles' && (
        <div id="tabpanel-performance-cycles" role="tabpanel" aria-label={t('tab_cycles', 'Cycles')} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as CycleStatus | '')}
              aria-label={t('all_statuses', 'All Statuses')}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm"
            >
              <option value="">{t('all_statuses', 'All Statuses')}</option>
              <option value="draft">{t('status_draft', 'Draft')}</option>
              <option value="active">{t('status_active', 'Active')}</option>
              <option value="closed">{t('status_closed', 'Closed')}</option>
            </select>
          </div>

          {isLoading ? (
            <LoadingState variant="table" rows={5} message={t('common:loading')} />
          ) : filteredCycles.length === 0 ? (
            <EmptyState icon={Target} title={t('no_cycles', 'No Performance Cycles')} description={t('no_cycles_desc', 'Create your first review cycle to get started')} />
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="table-scroll">
                <table role="table" className="table-card-mobile w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-sunken bg-surface-sunken/50 border-b border-border/50 border-border/50">
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('cycle_name', 'Cycle Name')}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('type', 'Type')}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('period', 'Period')}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('status', { ns: 'common' })}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('reviews', 'Reviews')}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCycles.map(cycle => {
                      const cycleReviews = reviews?.filter(r => r.cycle_id === cycle.id) || []
                      const completed = cycleReviews.filter(r => ['submitted', 'approved'].includes(r.status)).length
                      return (
                        <tr key={cycle.id} className="hover:bg-surface-sunken/50 dark:hover:bg-surface-sunken/30 transition-colors duration-150 border-b border-border/50 border-border/50">
                          <td className="py-3 px-4 text-sm text-ink text-ink" data-label={t('cycle_name', 'Cycle Name')}>
                            <span className="font-medium">{cycle.name}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant" data-label={t('type', 'Type')}>{cycle.cycle_type}</td>
                          <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant" data-label={t('period', 'Period')}>
                            {cycle.start_date} — {cycle.end_date}
                          </td>
                          <td className="py-3 px-4 text-sm" data-label={t('status', { ns: 'common' })}>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[cycle.status] || ''}`}>
                              {cycle.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant" data-label={t('reviews', 'Reviews')}>
                            {completed}/{cycleReviews.length}
                          </td>
                          <td className="py-3 px-4 text-sm text-ink text-right" data-label={t('actions')}>
                            <Button variant="ghost" size="icon_sm" icon={<ChevronRight size={14} />} aria-label={t('cycle_details', 'View cycle details')} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div id="tabpanel-performance-reviews" role="tabpanel" aria-label={t('tab_reviews', 'Reviews')} className="space-y-4">
          {isLoading ? (
            <LoadingState variant="table" rows={5} message={t('common:loading')} />
          ) : !reviews || reviews.length === 0 ? (
            <EmptyState icon={BarChart3} title={t('no_reviews', 'No Reviews Yet')} description={t('no_reviews_desc', 'Reviews will appear here once a cycle starts')} />
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="table-scroll">
                <table role="table" className="table-card-mobile w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-sunken bg-surface-sunken/50 border-b border-border/50 border-border/50">
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('employee', 'Employee')}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('review_type', 'Review Type')}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('status', { ns: 'common' })}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('rating', 'Rating')}</th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('submitted', 'Submitted')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map(review => (
                      <tr key={review.id} className="hover:bg-surface-sunken/50 dark:hover:bg-surface-sunken/30 transition-colors duration-150 border-b border-border/50 border-border/50">
                        <td className="py-3 px-4 text-sm font-medium text-ink text-ink" data-label={t('employee', 'Employee')}>
                          {review.user_profiles?.full_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant" data-label={t('review_type', 'Review Type')}>
                          {review.review_type}
                        </td>
                        <td className="py-3 px-4 text-sm" data-label={t('status', { ns: 'common' })}>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${REVIEW_STATUS_COLORS[review.status] || ''}`}>
                            {review.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant" data-label={t('rating', 'Rating')}>
                          {review.overall_rating != null ? `${review.overall_rating}/5` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant" data-label={t('submitted', 'Submitted')}>
                          {review.submitted_at ? new Date(review.submitted_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ninebox' && (
        <div id="tabpanel-performance-ninebox" role="tabpanel" aria-label={t('tab_ninebox', '9-Box Grid')} className="space-y-4">
          {isLoading ? (
            <LoadingState variant="cards" rows={4} message={t('common:loading')} />
          ) : (
            <>
              <div className="bg-surface rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <LayoutGrid size={18} className="text-ink-variant text-ink-variant" />
                  <h3 className="text-title-sm font-semibold text-ink text-ink">{t('nine_box_title', '9-Box Grid: Performance vs Potential')}</h3>
                </div>
                <p className="text-sm text-ink-variant text-ink-variant mb-6">{t('nine_box_desc', 'Employees positioned by performance score (horizontal) and potential score (vertical)')}</p>

                <div className="grid grid-cols-3 gap-2 max-w-2xl">
                  {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(pos => (
                    <div key={pos} className={`rounded-lg p-3 min-h-[100px] ${NINE_BOX_COLORS[pos] || 'bg-gray-50 bg-surface-sunken'}`}>
                      <p className="text-[10px] font-medium mb-2 opacity-70 truncate">{NINE_BOX_LABELS[pos]}</p>
                      <div className="space-y-1">
                        {nineBoxGrid[pos - 1]?.map(a => (
                          <div key={a.id} className="text-xs font-medium truncate">{a.user_profiles?.full_name || 'Employee'}</div>
                        ))}
                        {nineBoxGrid[pos - 1]?.length === 0 && (
                          <p className="text-xs opacity-40 italic">{t('empty_box', 'Empty')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs text-ink-variant text-ink-variant">
                  <span>← {t('performance', 'Performance')} →</span>
                  <span>↕ {t('potential', 'Potential')}</span>
                </div>
              </div>

              {assessments && assessments.length > 0 && (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div className="table-scroll">
                    <table role="table" className="table-card-mobile w-full text-left min-w-[500px]">
                      <thead>
                        <tr className="bg-surface-sunken bg-surface-sunken/50 border-b border-border/50 border-border/50">
                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('employee', 'Employee')}</th>
                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('performance_score', 'Performance')}</th>
                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('potential_score', 'Potential')}</th>
                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('position', 'Position')}</th>
                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant text-ink-variant">{t('notes', 'Notes')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessments.map(a => (
                          <tr key={a.id} className="hover:bg-surface-sunken/50 dark:hover:bg-surface-sunken/30 transition-colors duration-150 border-b border-border/50 border-border/50">
                            <td className="py-3 px-4 text-sm font-medium text-ink text-ink">{a.user_profiles?.full_name || '-'}</td>
                            <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant">{a.performance_score ?? '-'}</td>
                            <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant">{a.potential_score ?? '-'}</td>
                            <td className="py-3 px-4 text-sm">
                              {a.box_position != null && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${NINE_BOX_COLORS[a.box_position] || ''}`}>
                                  {a.box_position}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-ink-variant text-ink-variant max-w-[200px] truncate">{a.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default PerformancePage
