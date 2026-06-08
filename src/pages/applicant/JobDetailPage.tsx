import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, Building2, Clock, DollarSign, CheckCircle, AlertCircle, RefreshCw, Send } from 'lucide-react'
import { LoadingState } from '../../components/shared/LoadingState'
import toast from 'react-hot-toast'

export function ApplicantJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const qc = useQueryClient()

  const { data: job, isLoading, isError, refetch } = useQuery({
    queryKey: ['applicant-job-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { data: existingApplication } = useQuery({
    queryKey: ['applicant-job-applied', id, profile?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('id, status')
        .eq('job_id', id!)
        .eq('candidate_email', profile?.email ?? '')
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!id && !!profile?.email,
  })

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !profile?.email) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: id,
          candidate_email: profile.email,
          candidate_name: profile.full_name,
          status: 'applied',
          company_id: job?.company_id,
        })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-job-applied', id] })
      toast.success(t('applicant.jobs.applied'))
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Failed to apply')
    },
  })

  const hasApplied = !!existingApplication

  if (isLoading) {
    return <LoadingState variant="list" rows={3} />
  }

  if (isError || !job) {
    return (
      <div className="bg-surface rounded-xl border border-outline-variant p-8 text-center">
        <AlertCircle size={40} className="mx-auto text-error mb-3" />
        <h3 className="font-semibold text-on-surface mb-1">{t('errors.not_found')}</h3>
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
    <div className="space-y-6 max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        {t('common.back')}
      </button>

      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">{job.title}</h1>
            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm text-on-surface-variant">
              {job.department && (
                <span className="flex items-center gap-1">
                  <Building2 size={14} />
                  {job.department}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {job.location}
                </span>
              )}
              {(job.salary_min || job.salary_max) && (
                <span className="flex items-center gap-1">
                  <DollarSign size={14} />
                  {job.salary_min && job.salary_max
                    ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                    : job.salary_min
                      ? `From ${job.salary_min.toLocaleString()}`
                      : `Up to ${job.salary_max.toLocaleString()}`
                  }
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            {hasApplied ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">
                <CheckCircle size={16} />
                {t('applicant.jobs.applied')}
              </span>
            ) : (
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 disabled:opacity-50 shadow-sm transition-opacity"
              >
                <Send size={16} />
                {applyMutation.isPending ? t('common.loading') : t('applicant.jobs.apply')}
              </button>
            )}
          </div>
        </div>
      </div>

      {job.description && (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
          <h2 className="text-title-lg font-semibold text-on-surface mb-3">{t('applicant.jobDetail.description', 'Job Description')}</h2>
          <p className="text-on-surface-variant whitespace-pre-line leading-relaxed">{job.description}</p>
        </div>
      )}

      {job.requirements && (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
          <h2 className="text-title-lg font-semibold text-on-surface mb-3">{t('applicant.jobDetail.requirements', 'Requirements')}</h2>
          <p className="text-on-surface-variant whitespace-pre-line leading-relaxed">{job.requirements}</p>
        </div>
      )}

      {job.responsibilities && (
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
          <h2 className="text-title-lg font-semibold text-on-surface mb-3">{t('applicant.jobDetail.responsibilities', 'Responsibilities')}</h2>
          <p className="text-on-surface-variant whitespace-pre-line leading-relaxed">{job.responsibilities}</p>
        </div>
      )}

      {!hasApplied && (
        <div className="flex justify-center">
          <button
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending}
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 disabled:opacity-50 shadow-sm transition-opacity text-lg"
          >
            <Send size={20} />
            {applyMutation.isPending ? t('common.loading') : t('applicant.jobs.apply')}
          </button>
        </div>
      )}
    </div>
  )
}

export default ApplicantJobDetailPage
