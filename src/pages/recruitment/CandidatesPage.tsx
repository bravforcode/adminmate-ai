import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, Search, Users, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCandidates } from '../../hooks/useCandidates'
import { CandidateCard } from '../../components/candidates/CandidateCard'
import { CandidateForm } from '../../components/candidates/CandidateForm'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/shared/EmptyState'
import { ErrorState } from '../../components/shared/ErrorState'
import { LoadingState } from '../../components/shared/LoadingState'
import { toCSV, downloadCSV } from '../../utils/csvParser'

export function CandidatesPage() {
  const { t } = useTranslation(['recruitment', 'common'])
  const { data: candidates, isLoading, isError, error, refetch } = useCandidates()
  const [showForm, setShowForm] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const filtered = useMemo(() => candidates?.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.current_position?.toLowerCase().includes(search.toLowerCase())
  ), [candidates, search])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value), [])

  const handleExportCSV = useCallback(() => {
    if (!filtered || filtered.length === 0) return
    const exportData = filtered.map(c => ({
      full_name: c.full_name ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      location: c.location ?? '',
      current_position: c.current_position ?? '',
      source: c.source ?? '',
    }))
    downloadCSV(toCSV(exportData), 'candidates.csv')
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface dark:text-on-surface">{t('candidates.title')}</h1>
          <p className="text-body-md text-on-surface-variant dark:text-on-surface-variant mt-1">{t('candidates.subtitle')}</p>
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
            data-testid="add-candidate"
            icon={<Plus size={18} />}
          >
            {t('candidates.add_candidate')}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-on-surface-variant size-4" />
        <input
          value={searchInput}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm placeholder:text-on-surface-variant/50"
          placeholder={t('candidates.search_placeholder')}
        />
      </div>

      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline p-6">
          <CandidateForm onClose={() => setShowForm(false)} />
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
