import { useState, useMemo, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, Briefcase, Trash2, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useJobs } from '../../hooks/useJobs'
import { toCSV, downloadCSV } from '../../utils/csvParser'
import { JobCard } from '../../components/jobs/JobCard'
import { JobForm } from '../../components/jobs/JobForm'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/shared/EmptyState'
import { ErrorState } from '../../components/shared/ErrorState'
import { LoadingState } from '../../components/shared/LoadingState'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function JobsPage() {
  const { t } = useTranslation(['recruitment', 'common'])
  const qc = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: jobs, isLoading, isError, error, refetch } = useJobs()
  const [showForm, setShowForm] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if ((location.state as { openCreateJob?: boolean } | null)?.openCreateJob) {
      setShowForm(true)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const handleDeleteJob = async () => {
    if (!deleteJobId) return
    try {
      const { error: delError } = await supabase.from('jobs').delete().eq('id', deleteJobId)
      if (delError) throw delError
      toast.success(t('jobs.deleted'))
      qc.invalidateQueries({ queryKey: ['jobs'] })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete job')
    }
    setDeleteJobId(null)
  }

  const filtered = useMemo(() => jobs?.filter(j => {
    const matchesSearch = !search ||
      j.title?.toLowerCase().includes(search.toLowerCase()) ||
      j.department?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || j.status === statusFilter
    return matchesSearch && matchesStatus
  }), [jobs, search, statusFilter])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value), [])

  const handleExportCSV = useCallback(() => {
    if (!filtered || filtered.length === 0) return
    const exportData = filtered.map(j => ({
      title: j.title ?? '',
      department: j.department ?? '',
      location: j.location ?? '',
      employment_type: j.employment_type ?? '',
      status: j.status ?? '',
      salary_min: j.salary_min != null ? String(j.salary_min) : '',
      salary_max: j.salary_max != null ? String(j.salary_max) : '',
      headcount: j.headcount != null ? String(j.headcount) : '',
      skills_required: Array.isArray(j.skills_required) ? j.skills_required.join(', ') : '',
    }))
    downloadCSV(toCSV(exportData), 'jobs.csv')
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface dark:text-on-surface">{t('jobs.title')}</h1>
          <p className="text-body-md text-on-surface-variant dark:text-on-surface-variant mt-1">{t('jobs.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleExportCSV}
            disabled={!filtered || filtered.length === 0}
            icon={<Download size={16} />}
          >
            {t('common:export_csv')}
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={() => setShowForm(true)}
            data-testid="create-job-button"
            icon={<Plus size={18} />}
          >
            {t('jobs.create')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-on-surface-variant size-4" />
          <input
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm placeholder:text-on-surface-variant/50"
            placeholder={t('jobs.search_placeholder')}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface text-sm outline-none appearance-none cursor-pointer"
        >
          <option value="">{t('jobs.all_statuses', 'All Statuses')}</option>
          <option value="draft">{t('jobs.status_draft', 'Draft')}</option>
          <option value="published">{t('jobs.status_published', 'Published')}</option>
          <option value="closed">{t('jobs.status_closed', 'Closed')}</option>
          <option value="archived">{t('jobs.status_archived', 'Archived')}</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline p-6">
          <JobForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {isError ? (
        <ErrorState
          title={t('common:errors.load_failed')}
          message={(error as Error)?.message || ''}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <LoadingState variant="cards" rows={4} message={t('common:loading')} />
      ) : filtered && filtered.length === 0 ? (
        search ? (
          <EmptyState
            icon={Search}
            title={t('common:empty.no_results')}
            description={t('common:empty.no_data')}
          />
        ) : (
          <EmptyState
            icon={Briefcase}
            title={t('jobs.empty_title')}
            description={t('jobs.empty_description')}
            action={{ label: t('jobs.empty_cta'), onClick: () => setShowForm(true) }}
          />
        )
      ) : (
        <div className="grid gap-4">
          {filtered?.map(job => (
            <div key={job.id} className="relative group">
              <JobCard job={job} />
              <Button
                variant="ghost"
                size="icon_xs"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteJobId(job.id) }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 z-10"
                title={t('common:delete')}
                icon={<Trash2 size={14} />}
              />
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        title={t('jobs.delete_title')}
        message={t('jobs.delete_message')}
        confirmLabel={t('common:delete')}
        onConfirm={handleDeleteJob}
        onCancel={() => setDeleteJobId(null)}
        variant="danger"
        open={!!deleteJobId}
      />
    </div>
  )
}

export default JobsPage
