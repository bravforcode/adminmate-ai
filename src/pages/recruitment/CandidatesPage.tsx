import { useState } from 'react'
import { Plus, Search, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCandidates } from '../../hooks/useCandidates'
import { CandidateCard } from '../../components/candidates/CandidateCard'
import { CandidateForm } from '../../components/candidates/CandidateForm'
import { EmptyState } from '../../components/shared/EmptyState'
import { LoadingState } from '../../components/shared/LoadingState'

export function CandidatesPage() {
  const { t } = useTranslation(['recruitment', 'common'])
  const { data: candidates, isLoading, isError, error, refetch } = useCandidates()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = candidates?.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.current_position?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">{t('candidates.title')}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage your candidate database</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          data-testid="add-candidate"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} /> {t('candidates.add')}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm"
          placeholder={t('candidates.search_placeholder')}
        />
      </div>

      {showForm && (
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <CandidateForm onClose={() => setShowForm(false)} />
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
            icon={Users}
            title={t('candidates.empty_title')}
            description={t('candidates.empty_description')}
            action={{ label: t('candidates.empty_cta'), onClick: () => setShowForm(true) }}
          />
        )
      ) : (
        <div className="grid gap-4">{filtered?.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
      )}
    </div>
  )
}

export default CandidatesPage
