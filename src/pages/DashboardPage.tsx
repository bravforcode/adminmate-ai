import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'
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
    Screening: 'bg-surface-sunken text-ink-secondary',
    Interviewed: 'bg-primary-subtle text-primary',
    Offered: 'bg-success-subtle text-success',
  }
  return styles[status] || 'bg-surface-sunken text-ink-secondary'
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

  // Realtime: refetch dashboard data when jobs or candidates change
  const companyId = company?.id
  useRealtimeSubscription({
    table: 'jobs',
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    onChange: useCallback(() => { refetchStats(); refetchCandidates() }, [refetchStats, refetchCandidates]),
  })
  useRealtimeSubscription({
    table: 'candidates',
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    onChange: useCallback(() => { refetchStats(); refetchCandidates() }, [refetchStats, refetchCandidates]),
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
        <h2 className="text-xl font-semibold text-ink">
          {t('dashboard:welcome', { name: profile?.full_name?.split(' ')[0] || 'User' })}
        </h2>
        <p className="text-sm text-ink-muted mt-1">{t('dashboard:subtitle')}</p>
      </div>

      {statsHasError ? (
        <ErrorState
          title={t('common:errors.load_failed')}
          onRetry={() => { refetchStats(); refetchCandidates() }}
        />
      ) : statsLoadingCombined ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-surface rounded-xl p-5 border border-border">
                <div className="h-3 w-20 bg-surface-sunken rounded animate-shimmer mb-3" />
                <div className="h-7 w-16 bg-surface-sunken rounded animate-shimmer" />
              </div>
            ))}
          </div>
          <LoadingState variant="list" rows={3} />
        </>
      ) : (
        <>
          <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StaggeredItem>
              <StatCard
                title={t('dashboard:active_postings')}
                value={stats?.active_jobs || 0}
                valueNode={<AnimatedCounter value={stats?.active_jobs || 0} />}
                icon={Briefcase}
                color="primary"
              />
            </StaggeredItem>
            <StaggeredItem>
              <StatCard
                title={t('dashboard:new_candidates')}
                value={stats?.new_applicants_7d || 0}
                valueNode={<AnimatedCounter value={stats?.new_applicants_7d || 0} />}
                icon={Users}
                color="tertiary"
              />
            </StaggeredItem>
            <StaggeredItem>
              <StatCard
                title={t('dashboard:pending_signatures')}
                value={stats?.pending_documents || 0}
                valueNode={<AnimatedCounter value={stats?.pending_documents || 0} />}
                icon={FileText}
                color="error"
                trend={(stats?.pending_documents ?? 0) > 0 ? t('dashboard:action_required') : undefined}
                trendUp={false}
              />
            </StaggeredItem>
            <StaggeredItem>
              <StatCard
                title={t('dashboard:in_onboarding')}
                value={stats?.active_onboarding || 0}
                valueNode={<AnimatedCounter value={stats?.active_onboarding || 0} />}
                icon={UserCheck}
                color="success"
              />
            </StaggeredItem>
          </StaggeredList>

          <ScrollReveal direction="up" delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Action Required */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <Card className="flex flex-col h-full">
                <CardHeader className="border-b border-border flex-row items-center justify-between">
                  <CardTitle>{t('dashboard:action_required')}</CardTitle>
                  <span className="bg-error-subtle text-destructive text-xs font-medium px-2 py-0.5 rounded-full">{t('dashboard:high_priority')}</span>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-4">
                  {pendingDocs?.map((doc) => (
                    <div key={doc.id} role="button" tabIndex={0} onClick={() => navigate('/documents')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/documents') } }} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary transition-colors cursor-pointer group">
                      <div className="p-1.5 bg-primary-subtle rounded-lg text-primary mt-0.5">
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-ink group-hover:text-primary transition-colors truncate">{doc.document_type?.replace(/_/g, ' ') || 'Document'}</h4>
                        <p className="text-xs text-ink-muted mt-0.5">{doc.candidates?.full_name || 'Unknown'} — {t('dashboard:needs_signature')}</p>
                      </div>
                    </div>
                  ))}
                  {overdueChecklists?.map((cl) => (
                    <div key={cl.id} role="button" tabIndex={0} onClick={() => navigate('/onboarding')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/onboarding') } }} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-error transition-colors cursor-pointer group">
                      <div className="p-1.5 bg-error-subtle rounded-lg text-destructive mt-0.5">
                        <AlertCircle size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-ink group-hover:text-destructive transition-colors">{t('dashboard:slow_onboarding')}</h4>
                        <p className="text-xs text-ink-muted mt-0.5">{cl.user_profiles?.full_name || 'Employee'} — {cl.progress_percentage || 0}%</p>
                      </div>
                    </div>
                  ))}
                  {(!pendingDocs?.length && !overdueChecklists?.length) && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success-subtle text-success">
                      <CheckCircle size={16} />
                      <p className="text-sm font-medium">{t('dashboard:all_clear') || 'All clear'}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t border-border justify-center">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/onboarding')}>{t('dashboard:view_all_tasks')}</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Recent Candidates */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <Card className="overflow-hidden flex flex-col h-full">
                <CardHeader className="border-b border-border flex-row items-center justify-between">
                  <CardTitle>{t('dashboard:recent_candidates')}</CardTitle>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      value={search}
                      onChange={handleSearchChange}
                      aria-label={t('dashboard:search_candidates')}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface text-ink focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none text-sm w-full max-w-[200px] placeholder:text-ink-faint"
                      placeholder={t('dashboard:search_candidates')}
                    />
                  </div>
                </CardHeader>
                <div className="table-responsive overflow-x-auto">
                  <table role="table" className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2.5 px-4 text-xs font-medium text-ink-muted">{t('dashboard:candidate_name')}</th>
                        <th className="py-2.5 px-4 text-xs font-medium text-ink-muted">{t('dashboard:position')}</th>
                        <th className="py-2.5 px-4 text-xs font-medium text-ink-muted">{t('dashboard:status')}</th>
                        <th className="py-2.5 px-4 text-xs font-medium text-ink-muted text-right">{t('dashboard:action')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {filtered && filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-0">
                            <EmptyState
                              icon={UserX}
                              title={t('dashboard:empty_candidates_title')}
                              description={t('dashboard:empty_candidates_description')}
                            />
                          </td>
                        </tr>
                      ) : (
                        filtered?.map(c => (
                          <tr key={c.id} className="hover:bg-surface-sunken transition-colors duration-100 group border-b border-border last:border-0">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-primary-subtle text-primary flex items-center justify-center text-xs font-semibold">
                                  {c.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                </div>
                                <span className="text-ink">{c.full_name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-ink-muted">{c.current_position || '-'}</td>
                            <td className="py-2.5 px-4">
                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusBadge(c.applications?.[0]?.status || 'New'))}>
                                {c.applications?.[0]?.status || 'New'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon_sm"
                                onClick={() => navigate(`/recruitment/candidates/${c.id}`)}
                                className="opacity-0 group-hover:opacity-100"
                                icon={<ArrowRight size={14} />}
                                aria-label={`View ${c.full_name || 'candidate'}`}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <CardFooter className="border-t border-border mt-auto justify-end">
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
