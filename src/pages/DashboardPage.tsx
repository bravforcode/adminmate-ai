import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from 'react-i18next'
import { Briefcase, Users, FileText, UserCheck, ArrowRight, Search, CheckCircle, AlertCircle, UserX } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '../components/ui/Card'
import { StatCard } from '../components/shared/StatCard'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { AnimatedCounter } from '../components/shared/AnimatedCounter'
import { StaggeredList, StaggeredItem } from '../components/shared/StaggeredList'
import { ScrollReveal } from '../components/shared/ScrollReveal'
import { cn } from '../lib/utils'
import { useCandidates } from '../hooks/useCandidates'

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    Screening: 'bg-surface-dim dark:bg-surface-container text-on-surface dark:text-on-surface',
    Interviewed: 'bg-primary-fixed dark:bg-primary-container text-on-primary-fixed dark:text-accent-dim',
    Offered: 'bg-secondary-fixed dark:bg-surface-container-low text-on-secondary-fixed dark:text-accent-dim',
  }
  return styles[status] || 'bg-surface-container dark:bg-surface-container-low text-on-surface dark:text-on-surface'
}

export function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const [search, setSearch] = useState('')
  const { data: candidates, isLoading: candidatesLoading, isError: candidatesError, refetch: refetchCandidates } = useCandidates()

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const { data, error } = await supabase.rpc('get_dashboard_stats', { p_company_id: company.id })
      if (error) throw error
      return data as {
        active_jobs: number
        new_applicants_7d: number
        pending_documents: number
        active_onboarding: number
      }
    },
    enabled: !!company?.id,
    refetchInterval: 300_000,
  })

  const { data: pendingDocs } = useQuery({
    queryKey: ['dashboard-pending-docs', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('documents').select('id, document_type, status, candidates(full_name)').eq('company_id', company.id).in('status', ['draft', 'pending_signature']).order('created_at', { ascending: false }).limit(5)
      return (data ?? []) as unknown as Array<{ id: string; document_type: string; status: string; candidates: { full_name: string } }>
    },
    enabled: !!company?.id,
  })

  const { data: overdueChecklists } = useQuery({
    queryKey: ['dashboard-overdue-checklists', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('onboarding_checklists').select('id, progress_percentage, user_profiles(full_name)').eq('company_id', company.id).eq('status', 'in_progress').lt('progress_percentage', 50).limit(5)
      return (data ?? []) as unknown as Array<{ id: string; progress_percentage: number; user_profiles: { full_name: string } }>
    },
    enabled: !!company?.id,
  })

  const filtered = useMemo(() => candidates?.filter(c => !search
    || c.full_name?.toLowerCase().includes(search.toLowerCase())
    || c.current_position?.toLowerCase().includes(search.toLowerCase())), [candidates, search])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), [])

  const statsLoadingCombined = statsLoading || candidatesLoading
  const statsHasError = statsError || candidatesError

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-on-surface dark:text-on-surface">
          {t('dashboard:welcome', { name: profile?.full_name?.split(' ')[0] || 'User' })}
        </h2>
        <p className="text-base text-on-surface-variant dark:text-on-surface-variant mt-2">{t('dashboard:subtitle')}</p>
      </div>

      {statsHasError ? (
        <ErrorState
          title={t('common:errors.load_failed')}
          onRetry={() => { refetchStats(); refetchCandidates() }}
        />
      ) : statsLoadingCombined ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 skeleton-stagger">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-surface dark:bg-surface rounded-xl p-6 border border-surface-container-high dark:border-outline shadow-sm">
                <div className="h-3 w-20 bg-surface-container-high dark:bg-slate-700/40 rounded-lg animate-shimmer mb-3" />
                <div className="h-8 w-16 bg-surface-container-high dark:bg-slate-700/40 rounded-lg animate-shimmer" />
              </div>
            ))}
          </div>
          <LoadingState variant="list" rows={3} />
        </>
      ) : (
        <>
          <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StaggeredItem>
              <StatCard
                title={t('dashboard:active_postings')}
                value={stats?.active_jobs || 0}
                valueNode={<AnimatedCounter value={stats?.active_jobs || 0} />}
                icon={Briefcase}
                color="primary"
                trend=""
                trendUp
              />
            </StaggeredItem>
            <StaggeredItem>
              <StatCard
                title={t('dashboard:new_candidates')}
                value={stats?.new_applicants_7d || 0}
                valueNode={<AnimatedCounter value={stats?.new_applicants_7d || 0} />}
                icon={Users}
                color="tertiary"
                trend={t('dashboard:awaiting_review')}
              />
            </StaggeredItem>
            <StaggeredItem>
              <StatCard
                title={t('dashboard:pending_signatures')}
                value={stats?.pending_documents || 0}
                valueNode={<AnimatedCounter value={stats?.pending_documents || 0} />}
                icon={FileText}
                color="error"
                trend={(stats?.pending_documents ?? 0) > 0 ? t('dashboard:action_required') : ''}
                trendUp={false}
              />
            </StaggeredItem>
            <StaggeredItem>
              <StatCard
                title={t('dashboard:in_onboarding')}
                value={stats?.active_onboarding || 0}
                valueNode={<AnimatedCounter value={stats?.active_onboarding || 0} />}
                icon={UserCheck}
                color="secondary"
                trend={t('dashboard:across_depts')}
              />
            </StaggeredItem>
          </StaggeredList>

          <ScrollReveal direction="up" delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className="flex flex-col h-full">
                <CardHeader className="border-b border-surface-container-high dark:border-outline flex-row items-center justify-between bg-surface-bright dark:bg-surface-container-low rounded-t-xl">
                  <CardTitle className="text-lg">{t('dashboard:action_required')}</CardTitle>
                  <span className="bg-error-container dark:bg-error-container/30 text-on-error-container dark:text-error text-xs font-semibold px-3 py-1 rounded-full">{t('dashboard:high_priority')}</span>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  {pendingDocs?.map((doc) => (
                    <div key={doc.id} role="button" tabIndex={0} onClick={() => navigate('/documents')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/documents') } }} className="flex items-start gap-4 p-4 rounded-lg border border-outline-variant dark:border-outline bg-surface dark:bg-surface hover:border-primary dark:hover:border-primary transition-colors cursor-pointer group card-hover">
                      <div className="p-2 bg-primary-fixed dark:bg-primary-container rounded-full text-on-primary-fixed dark:text-accent-dim mt-1">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-on-surface dark:text-on-surface group-hover:text-primary dark:group-hover:text-accent-dim transition-colors">{doc.document_type?.replace(/_/g, ' ') || 'Document'}</h4>
                        <p className="text-sm text-on-surface-variant dark:text-on-surface-variant mt-1">{doc.candidates?.full_name || 'Unknown'} — {t('dashboard:needs_signature')}</p>
                        <span className="text-xs font-semibold text-error dark:text-error mt-2 inline-block">{t('dashboard:action_required')}</span>
                      </div>
                    </div>
                  ))}
                  {overdueChecklists?.map((cl) => (
                    <div key={cl.id} role="button" tabIndex={0} onClick={() => navigate('/onboarding')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/onboarding') } }} className="flex items-start gap-4 p-4 rounded-lg border border-outline-variant dark:border-outline bg-surface dark:bg-surface hover:border-error dark:hover:border-error transition-colors cursor-pointer group card-hover">
                      <div className="p-2 bg-error-container dark:bg-error-container/30 rounded-full text-on-error-container dark:text-error mt-1">
                        <AlertCircle size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-on-surface dark:text-on-surface group-hover:text-error dark:group-hover:text-error transition-colors">{t('dashboard:slow_onboarding')}</h4>
                        <p className="text-sm text-on-surface-variant dark:text-on-surface-variant mt-1">{cl.user_profiles?.full_name || 'Employee'} — {cl.progress_percentage || 0}% complete</p>
                        <span className="text-xs font-semibold text-error dark:text-error mt-2 inline-block">{t('dashboard:overdue')}</span>
                      </div>
                    </div>
                  ))}
                  {(!pendingDocs?.length && !overdueChecklists?.length) && (
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 dark:border-success-container bg-green-50 dark:bg-success-container/30 text-green-700 dark:text-success">
                      <CheckCircle size={20} />
                      <p className="text-sm font-medium">{t('dashboard:all_clear') || 'All clear — no pending tasks'}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t border-surface-container-high dark:border-outline justify-center">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/onboarding')}>{t('dashboard:view_all_tasks')}</Button>
                </CardFooter>
              </Card>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6">
              <Card className="overflow-hidden flex flex-col h-full">
                <CardHeader className="border-b border-surface-container-high dark:border-outline flex-row items-center justify-between bg-surface-bright dark:bg-surface-container-low">
                  <CardTitle className="text-lg">{t('dashboard:recent_candidates')}</CardTitle>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-on-surface-variant size-4" />
                      <input
                        value={search}
                        onChange={handleSearchChange}
                        aria-label={t('dashboard:search_candidates')}
                        className="pl-10 pr-4 py-3 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm w-full max-w-[200px]"
                        placeholder={t('dashboard:search_candidates')}
                      />
                    </div>
                </CardHeader>
                <div className="table-responsive overflow-x-auto">
                  <table role="table" className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-surface-container dark:bg-surface-container/50 border-b border-outline-variant/50 dark:border-outline/50">
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('dashboard:candidate_name')}</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('dashboard:position')}</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('dashboard:ai_match')}</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant">{t('dashboard:status')}</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant text-right">{t('dashboard:action')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-on-surface dark:text-on-surface">
                      {filtered && filtered.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <EmptyState
                              icon={UserX}
                              title={t('dashboard:empty_candidates_title')}
                              description={t('dashboard:empty_candidates_description')}
                            />
                          </td>
                        </tr>
                      ) : (
                        filtered?.map(c => (
                          <tr key={c.id} className="hover:bg-surface-container-high/50 dark:hover:bg-surface-container/30 transition-colors duration-150 group">
                            <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-container dark:bg-primary-container text-on-primary-container dark:text-accent-dim flex items-center justify-center font-bold text-sm">
                                {c.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                              </div>
                              <span>{c.full_name}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface text-on-surface-variant">{c.current_position || '-'}</td>
                            <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-on-surface-variant">-</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface">
                              <span className={cn('px-2 py-1 rounded text-xs font-semibold', statusBadge(c.applications?.[0]?.status || 'New'))}>
                                {c.applications?.[0]?.status || 'New'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-on-surface dark:text-on-surface text-right">
                              <Button
                                variant="ghost"
                                size="icon_md"
                                onClick={() => navigate(`/recruitment/candidates/${c.id}`)}
                                className="opacity-0 group-hover:opacity-100"
                                icon={<ArrowRight size={16} />}
                                aria-label={`View ${c.full_name || 'candidate'}`}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <CardFooter className="border-t border-surface-container-high dark:border-outline bg-surface-bright dark:bg-surface-container-low mt-auto justify-end">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/recruitment/pipeline')}>{t('dashboard:view_pipeline')}</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          </ScrollReveal>
        </>
      )}
    </div>
  )
}

export default DashboardPage
