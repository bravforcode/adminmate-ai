import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'
import { Briefcase, ClipboardList, CheckCircle, AlertCircle, RefreshCw, UserCircle, ArrowRight } from 'lucide-react'
import { StatCard } from '../../components/shared/StatCard'
import { LoadingState } from '../../components/shared/LoadingState'
import { cn } from '../../utils/cn'

const statusColors: Record<string, string> = {
  applied: 'bg-blue-50 text-blue-700 border-blue-200',
  screening: 'bg-amber-50 text-amber-700 border-amber-200',
  interview: 'bg-purple-50 text-purple-700 border-purple-200',
  offer: 'bg-green-50 text-green-700 border-green-200',
  hired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

export function ApplicantDashboardPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)

  const { data: applications, isLoading: appsLoading, isError: appsError, refetch: refetchApps } = useQuery({
    queryKey: ['applicant-applications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('applications')
        .select('id, status, created_at, job_id, jobs(title, company_id, companies(name))')
        .eq('candidate_email', profile.email)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Array<{ id: string; status: string; created_at: string; job_id: string; jobs: { title: string; companies: { name: string } } }>
    },
    enabled: !!profile?.id,
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['applicant-tasks', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select('id, is_completed')
        .eq('completed_by', profile.id)
      if (error) throw error
      return data ?? []
    },
    enabled: !!profile?.id,
  })

  const isLoading = appsLoading || tasksLoading
  const hasError = appsError

  const totalApps = applications?.length ?? 0
  const interviewCount = applications?.filter(a => a.status === 'interview').length ?? 0
  const tasksRemaining = tasks ? tasks.filter(t => !t.is_completed).length : 0

  const recentActivity = applications?.slice(0, 5) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-on-surface">
          {t('applicant.dashboard.welcome', { name: profile?.full_name?.split(' ')[0] || 'User' })}
        </h2>
      </div>

      {hasError ? (
        <div className="bg-surface rounded-xl border border-outline-variant p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-error mb-3" />
          <h3 className="font-semibold text-on-surface mb-1">{t('errors.load_failed')}</h3>
          <button
            onClick={() => refetchApps()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90"
          >
            <RefreshCw size={14} /> {t('errors.retry')}
          </button>
        </div>
      ) : isLoading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-surface rounded-xl p-6 border border-surface-container-high shadow-sm">
                <div className="h-3 w-20 bg-surface-container-high rounded animate-pulse mb-3" />
                <div className="h-8 w-16 bg-surface-container-high rounded animate-pulse" />
              </div>
            ))}
          </div>
          <LoadingState variant="list" rows={3} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard title={t('applicant.dashboard.applications')} value={totalApps} icon={Briefcase} color="primary" />
            <StatCard title={t('applicant.dashboard.interviews')} value={interviewCount} icon={CheckCircle} color="secondary" />
            <StatCard title={t('applicant.dashboard.tasks')} value={tasksRemaining} icon={ClipboardList} color="tertiary" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-4 border-b border-outline-variant">
                  <h3 className="text-lg font-semibold text-on-surface">{t('applicant.dashboard.recentActivity', 'Recent Activity')}</h3>
                </div>
                <div className="divide-y divide-outline-variant">
                  {recentActivity.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-on-surface-variant">{t('applicant.dashboard.noActivity', 'No activity yet. Start by browsing open positions!')}</p>
                    </div>
                  ) : (
                    recentActivity.map((app) => (
                      <div key={app.id} className="p-4 hover:bg-surface-container-low transition-colors cursor-pointer" onClick={() => navigate('/applicant/status')}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-on-surface text-sm">{app.jobs?.title || 'Job'}</p>
                            <p className="text-xs text-on-surface-variant mt-1">
                              {app.jobs?.companies?.name || 'Company'} — {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={cn('px-2 py-1 rounded text-xs font-semibold border capitalize', statusColors[app.status] || 'bg-gray-50 text-gray-700 border-gray-200')}>
                            {String(t(`applicant.status.${app.status}`, app.status))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">{t('applicant.dashboard.quickActions')}</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/applicant/jobs')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Briefcase size={18} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-on-surface">{t('nav.browse_jobs')}</p>
                      <p className="text-xs text-on-surface-variant">{t('applicant.jobs.title')}</p>
                    </div>
                    <ArrowRight size={14} className="text-on-surface-variant" />
                  </button>
                  <button
                    onClick={() => navigate('/my-profile')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <UserCircle size={18} className="text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-on-surface">{t('nav.my_profile')}</p>
                      <p className="text-xs text-on-surface-variant">{t('applicant.dashboard.updateProfile', 'Update your information')}</p>
                    </div>
                    <ArrowRight size={14} className="text-on-surface-variant" />
                  </button>
                  <button
                    onClick={() => navigate('/applicant/status')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="p-2 bg-tertiary/10 rounded-lg">
                      <ClipboardList size={18} className="text-tertiary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-on-surface">{t('nav.my_applications')}</p>
                      <p className="text-xs text-on-surface-variant">{t('applicant.status.title')}</p>
                    </div>
                    <ArrowRight size={14} className="text-on-surface-variant" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ApplicantDashboardPage
