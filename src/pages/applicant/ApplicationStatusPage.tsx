import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, AlertCircle, RefreshCw } from 'lucide-react'
import { EmptyState } from '../../components/shared/EmptyState'
import { LoadingState } from '../../components/shared/LoadingState'
import { cn } from '../../utils/cn'

const PIPELINE_STEPS = ['applied', 'screening', 'interview', 'offer', 'hired']

const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
  applied:      { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  screening:    { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  interview:    { color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  offer:        { color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-200' },
  hired:        { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected:     { color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200' },
}

function PipelineBar({ currentStatus }: { currentStatus: string }) {
  const currentIdx = PIPELINE_STEPS.indexOf(currentStatus)
  const isRejected = currentStatus === 'rejected'

  return (
    <div className="flex items-center gap-1 w-full">
      {PIPELINE_STEPS.map((step, i) => {
        const isActive = i <= currentIdx && !isRejected
        const isCurrent = i === currentIdx && !isRejected
        return (
          <div key={step} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn(
              'w-full h-2 rounded-full transition-all',
              isActive ? 'bg-primary' : 'bg-surface-container-high',
              isCurrent && 'ring-2 ring-primary/30'
            )} />
          </div>
        )
      })}
    </div>
  )
}

export function ApplicationStatusPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)

  const { data: applications, isLoading, isError, refetch } = useQuery({
    queryKey: ['applicant-applications-status', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('applications')
        .select('id, status, created_at, updated_at, job_id, jobs(title, company_id, companies(name))')
        .eq('candidate_email', profile.email)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Array<{ id: string; status: string; created_at: string; updated_at: string; job_id: string; jobs: { title: string; companies: { name: string } } }>
    },
    enabled: !!profile?.id,
  })

  if (isLoading) {
    return <LoadingState variant="cards" rows={4} />
  }

  if (isError) {
    return (
      <div className="bg-surface rounded-xl border border-outline-variant p-8 text-center">
        <AlertCircle size={40} className="mx-auto text-error mb-3" />
        <h3 className="font-semibold text-on-surface mb-1">{t('errors.load_failed')}</h3>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90"
        >
          <RefreshCw size={14} /> {t('errors.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">{t('applicant.status.title')}</h1>
        <p className="text-body-md text-on-surface-variant mt-1">{t('applicant.status.subtitle', 'Track the progress of your job applications')}</p>
      </div>

      {(!applications || applications.length === 0) ? (
        <EmptyState
          icon={ClipboardCheck}
          title={t('applicant.status.noApplications', 'No applications yet')}
          description={t('applicant.status.noApplicationsDesc', 'Start by browsing open positions and applying')}
          action={{ label: t('nav.browse_jobs'), onClick: () => navigate('/applicant/jobs') }}
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const cfg = statusConfig[app.status] || statusConfig.applied
            return (
              <div
                key={app.id}
                className="bg-surface rounded-xl border border-outline-variant shadow-sm p-5 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-on-surface">{app.jobs?.title || 'Job'}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{app.jobs?.companies?.name || 'Company'}</p>
                  </div>
                          <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border capitalize', cfg.bg, cfg.color, cfg.border)}>
                            {String(t(`applicant.status.${app.status}`, app.status))}
                          </span>
                </div>

                <PipelineBar currentStatus={app.status} />

                <div className="flex items-center justify-between mt-3 text-xs text-on-surface-variant">
                  <span>{t('applicant.status.appliedOn', 'Applied')}: {new Date(app.created_at).toLocaleDateString()}</span>
                  {app.updated_at && app.updated_at !== app.created_at && (
                    <span>{t('applicant.status.updated', 'Updated')}: {new Date(app.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ApplicationStatusPage
