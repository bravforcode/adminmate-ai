import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import { Search, Briefcase, MapPin, Building2, DollarSign } from 'lucide-react'
import { EmptyState } from '../../components/shared/EmptyState'
import { ErrorState } from '../../components/shared/ErrorState'
import { LoadingState } from '../../components/shared/LoadingState'

export function BrowseJobsPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const company = useAuthStore(s => s.company)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: jobs, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['applicant-jobs', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: true,
  })

  const filtered = useMemo(() => jobs?.filter(j =>
    !search ||
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.department?.toLowerCase().includes(search.toLowerCase()) ||
    j.location?.toLowerCase().includes(search.toLowerCase())
  ), [jobs, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">{t('applicant.jobs.title')}</h1>
        <p className="text-body-md text-on-surface-variant mt-1">{t('applicant.jobs.subtitle', 'Find and apply to open positions')}</p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-on-surface-variant size-4" />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm placeholder:text-on-surface-variant/50"
          placeholder={t('applicant.jobs.search')}
        />
      </div>

      {isError ? (
        <ErrorState
          title={t('errors.load_failed')}
          message={(error as Error)?.message || ''}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <LoadingState variant="cards" rows={4} message={t('common.loading')} />
      ) : filtered && filtered.length === 0 ? (
        search ? (
          <EmptyState
            icon={Search}
            title={t('common.empty.no_results')}
            description={t('common.empty.no_data')}
          />
        ) : (
          <EmptyState
            icon={Briefcase}
            title={t('applicant.jobs.noJobs')}
            description={t('applicant.jobs.noJobsDesc', 'Check back later for new opportunities')}
          />
        )
      ) : (
        <div className="grid gap-4">
          {filtered?.map(job => (
            <div
              key={job.id}
              onClick={() => navigate(`/applicant/jobs/${job.id}`)}
              className="bg-surface rounded-xl border border-outline-variant shadow-sm p-5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors">{job.title}</h3>
                  <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-on-surface-variant">
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
                  </div>
                  {job.description && (
                    <p className="text-sm text-on-surface-variant mt-3 line-clamp-2">{job.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BrowseJobsPage
