import { useState } from 'react'
import { Plus, Search, Briefcase, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useJobs } from '../../hooks/useJobs'
import { JobCard } from '../../components/jobs/JobCard'
import { JobForm } from '../../components/jobs/JobForm'
import { EmptyState } from '../../components/shared/EmptyState'
import { LoadingState } from '../../components/shared/LoadingState'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function JobsPage() {
  const { t } = useTranslation(['recruitment', 'common'])
  const qc = useQueryClient()
  const { data: jobs, isLoading, isError, error, refetch } = useJobs()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)

  const handleDeleteJob = async () => {
    if (!deleteJobId) return
    try {
      const { error: delError } = await supabase.from('jobs').delete().eq('id', deleteJobId)
      if (delError) throw delError
      toast.success(t('jobs.deleted'))
      qc.invalidateQueries({ queryKey: ['jobs'] })
    } catch (e: any) {
      toast.error(e.message)
    }
    setDeleteJobId(null)
  }

  const filtered = jobs?.filter(j =>
    !search ||
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.department?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">{t('jobs.title')}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage your job postings</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          data-testid="create-job-button"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} /> {t('jobs.create')}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm"
          placeholder={t('jobs.search_placeholder')}
        />
      </div>

      {showForm && (
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <JobForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {isError ? (
        <div className="bg-surface rounded-xl border border-outline-variant p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-error mb-3" />
          <h3 className="font-semibold text-on-surface mb-1">{t('common:errors.load_failed')}</h3>
          <p className="text-sm text-on-surface-variant mb-4">{(error as Error)?.message || ''}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90"
          >
            <RefreshCw size={14} /> {t('common:errors.retry')}
          </button>
        </div>
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
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteJobId(job.id) }}
                className="absolute top-2 right-2 p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error opacity-0 group-hover:opacity-100 transition-all z-10"
                title={t('common:delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteJobId && (
        <ConfirmDialog
          title={t('jobs.delete_title')}
          message={t('jobs.delete_message')}
          confirmLabel={t('common:delete')}
          onConfirm={handleDeleteJob}
          onCancel={() => setDeleteJobId(null)}
          variant="danger"
        />
      )}
    </div>
  )
}

export default JobsPage
