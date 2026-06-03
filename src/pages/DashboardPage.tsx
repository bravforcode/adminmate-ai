import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from 'react-i18next'
import { Briefcase, Users, FileText, UserCheck, Brain, AlertCircle, ArrowRight, Search } from 'lucide-react'
import { StatCard } from '../components/shared/StatCard'
import { cn } from '../utils/cn'
import { useCandidates } from '../hooks/useCandidates'

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    Screening: 'bg-surface-dim text-on-surface',
    Interviewed: 'bg-primary-fixed text-on-primary-fixed',
    Offered: 'bg-secondary-fixed text-on-secondary-fixed',
  }
  return styles[status] || 'bg-surface-container text-on-surface'
}

export function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const [search, setSearch] = useState('')
  const { data: candidates, isLoading: candidatesLoading } = useCandidates()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const [jobsRes, appsRes, docsRes, onboardingRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'active'),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('company_id', company.id).in('status', ['draft', 'pending_signature']),
        supabase.from('onboarding_checklists').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'in_progress'),
      ])
      return {
        activeJobs: jobsRes.count || 0,
        newApplicants: appsRes.count || 0,
        pendingDocs: docsRes.count || 0,
        activeOnboarding: onboardingRes.count || 0,
      }
    },
    enabled: !!company?.id,
    refetchInterval: 300_000,
  })

  const filtered = candidates?.filter(c => !search
    || c.full_name?.toLowerCase().includes(search.toLowerCase())
    || c.current_position?.toLowerCase().includes(search.toLowerCase()))

  const isLoading = statsLoading || candidatesLoading

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-semibold text-on-surface">{t('dashboard:welcome', { name: profile?.full_name?.split(' ')[0] || 'User' })}</h2>
        <p className="text-base text-on-surface-variant mt-2">{t('dashboard:subtitle')}</p>
      </div>

      {/* Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('dashboard:active_postings')} value={stats?.activeJobs || 0} icon={Briefcase} color="primary" trend="+2 this week" trendUp />
        <StatCard title={t('dashboard:new_candidates')} value={stats?.newApplicants || 0} icon={Users} color="tertiary" trend={t('dashboard:awaiting_review')} />
        <StatCard title={t('dashboard:pending_signatures')} value={stats?.pendingDocs || 0} icon={FileText} color="error" trend={(stats?.pendingDocs ?? 0) > 0 ? t('dashboard:action_required') : ''} trendUp={false} />
        <StatCard title={t('dashboard:in_onboarding')} value={stats?.activeOnboarding || 0} icon={UserCheck} color="secondary" trend={t('dashboard:across_depts')} />
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Action Required */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface rounded-xl border border-surface-container-high shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-surface-container-high flex justify-between items-center bg-surface-bright rounded-t-xl">
              <h3 className="text-lg font-semibold text-on-surface">{t('dashboard:action_required')}</h3>
              <span className="bg-error-container text-on-error-container text-xs font-semibold px-3 py-1 rounded-full">{t('dashboard:high_priority')}</span>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border border-outline-variant bg-surface hover:border-primary transition-colors cursor-pointer group">
                <div className="p-2 bg-primary-fixed rounded-full text-on-primary-fixed mt-1">
                  <Brain size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{t('dashboard:review_ai_match')}</h4>
                  <p className="text-sm text-on-surface-variant mt-1">{t('dashboard:review_ai_match_desc')}</p>
                  <span className="text-xs font-semibold text-primary mt-2 inline-block">{t('dashboard:due_today')}</span>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg border border-outline-variant bg-surface hover:border-error transition-colors cursor-pointer group">
                <div className="p-2 bg-error-container rounded-full text-on-error-container mt-1">
                  <AlertCircle size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-on-surface group-hover:text-error transition-colors">{t('dashboard:missing_pnd1')}</h4>
                  <p className="text-sm text-on-surface-variant mt-1">{t('dashboard:missing_pnd1_desc')}</p>
                  <span className="text-xs font-semibold text-error mt-2 inline-block">{t('dashboard:overdue')}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-surface-container-high text-center">
              <button onClick={() => navigate('/onboarding')} className="text-xs font-semibold text-primary hover:underline">{t('dashboard:view_all_tasks')}</button>
            </div>
          </div>
        </div>

        {/* Recent Candidates Table */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-surface rounded-xl border border-surface-container-high shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-surface-container-high flex justify-between items-center bg-surface-bright">
              <h3 className="text-lg font-semibold text-on-surface">{t('dashboard:recent_candidates')}</h3>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-[200px] bg-surface" placeholder={t('dashboard:search_candidates')} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-container-high">
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase">{t('dashboard:candidate_name')}</th>
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase">{t('dashboard:position')}</th>
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase">{t('dashboard:ai_match')}</th>
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase">{t('dashboard:status')}</th>
                    <th className="p-4 text-xs font-semibold text-on-surface-variant uppercase text-right">{t('dashboard:action')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-on-surface divide-y divide-surface-container-high">
                  {filtered?.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">No candidates found</td></tr>
                  ) : filtered?.map(c => (
                    <tr key={c.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
                          {c.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <span>{c.full_name}</span>
                      </td>
                      <td className="p-4 text-on-surface-variant">{c.current_position || '-'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface-variant">-</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn('px-2 py-1 rounded text-xs font-semibold', statusBadge(c.applications?.[0]?.status || 'New'))}>{c.applications?.[0]?.status || 'New'}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => navigate(`/recruitment/candidates/${c.id}`)} className="text-primary hover:text-on-primary-fixed-variant p-2 rounded-full hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100">
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-surface-container-high bg-surface-bright mt-auto text-right">
              <button onClick={() => navigate('/recruitment/pipeline')} className="text-xs font-semibold text-primary hover:underline">{t('dashboard:view_pipeline')}</button>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <div className="text-center py-8 text-on-surface-variant">{t('common:loading')}</div>}
    </div>
  )
}

export default DashboardPage
