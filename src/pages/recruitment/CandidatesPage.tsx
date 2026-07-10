import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, Search, Users, Download, LayoutGrid, List, CheckSquare, Square, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCandidates } from '../../hooks/useCandidates'
import { CandidateCard } from '../../components/candidates/CandidateCard'
import { CandidateForm } from '../../components/candidates/CandidateForm'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/shared/EmptyState'
import { ErrorState } from '../../components/shared/ErrorState'
import { LoadingState } from '../../components/shared/LoadingState'
import { toCSV, downloadCSV } from '../../utils/csvParser'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 20

export function CandidatesPage() {
  const { t } = useTranslation(['recruitment', 'common'])
  const { data: candidates, isLoading, isError, error, refetch } = useCandidates()
  const [showForm, setShowForm] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Extract unique sources for filter dropdown
  const sources = useMemo(() => {
    if (!candidates) return []
    const unique = new Set(candidates.map(c => c.source).filter(Boolean))
    return Array.from(unique).sort()
  }, [candidates])

  const filtered = useMemo(() => {
    if (!candidates) return []
    return candidates.filter(c => {
      const matchesSearch = !search ||
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.current_position?.toLowerCase().includes(search.toLowerCase())
      const matchesSource = !sourceFilter || c.source === sourceFilter
      return matchesSearch && matchesSource
    })
  }, [candidates, search, sourceFilter])

  // Pagination
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  // Reset page when filter changes
  useEffect(() => { setPage(1) }, [search, sourceFilter])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value), [])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map(c => c.id)))
    }
  }, [selectedIds.size, paginated])

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
          <h1 className="text-headline-md font-bold text-ink text-ink">{t('candidates.title')}</h1>
          <p className="text-body-md text-ink-muted text-ink-muted mt-1">{t('candidates.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={handleExportCSV} disabled={!filtered || filtered.length === 0} icon={<Download size={16} />}>
            {t('common:export_csv')}
          </Button>
          <Button variant="default" size="lg" onClick={() => setShowForm(true)} data-testid="add-candidate" icon={<Plus size={18} />}>
            {t('candidates.add_candidate')}
          </Button>
        </div>
      </div>

      {/* Search + Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm placeholder:text-ink-muted/50"
            placeholder={t('candidates.search_placeholder')}
          />
        </div>

        {sources.length > 0 && (
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="pl-9 pr-8 py-3 rounded-xl border border-border bg-surface-sunken-lowest text-ink text-sm outline-none appearance-none cursor-pointer"
            >
              <option value="">{t('candidates.all_sources', 'All Sources')}</option>
              {sources.map(s => <option key={s} value={s!}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-1 bg-surface-sunken rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted hover:text-ink'}`}
            title={t('common:grid_view', 'Grid')}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted hover:text-ink'}`}
            title={t('common:list_view', 'List')}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium text-primary">{selectedIds.size} {t('common:selected', 'selected')}</span>
          <Button variant="ghost" size="sm" onClick={handleSelectAll} icon={selectedIds.size === paginated.length ? <CheckSquare size={14} /> : <Square size={14} />}>
            {selectedIds.size === paginated.length ? t('common:deselect_all', 'Deselect All') : t('common:select_all', 'Select All')}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            {t('common:clear_selection', 'Clear')}
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <CandidateForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {isError ? (
        <ErrorState title={t('common:errors.load_failed')} message={(error as Error)?.message || ''} onRetry={() => refetch()} />
      ) : isLoading ? (
        <LoadingState variant="cards" rows={4} message={t('common:loading')} />
      ) : filtered && filtered.length === 0 ? (
        search ? (
          <EmptyState icon={Search} title={t('common:empty.no_results')} description={t('common:empty.no_data')} />
        ) : (
          <EmptyState icon={Users} title={t('candidates.empty_title')} description={t('candidates.empty_description')} action={{ label: t('candidates.empty_cta'), onClick: () => setShowForm(true) }} />
        )
      ) : (
        <>
          {/* Grid/List View */}
          {viewMode === 'grid' ? (
            <div className="grid gap-4">
              {paginated.map(c => (
                <div key={c.id} className="relative group">
                  <button
                    onClick={() => handleToggleSelect(c.id)}
                    className={`absolute top-2 left-2 z-10 p-1 rounded ${selectedIds.has(c.id) ? 'text-primary' : 'text-ink-muted opacity-0 group-hover:opacity-100'} transition-opacity`}
                  >
                    {selectedIds.has(c.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <CandidateCard candidate={c as unknown as import('../../types/models').Candidate} />
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken">
                  <tr>
                    <th className="p-3 text-left w-10">
                      <button onClick={handleSelectAll}>
                        {selectedIds.size === paginated.length ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-ink-muted" />}
                      </button>
                    </th>
                    <th className="p-3 text-left font-semibold">{t('candidates.name', 'Name')}</th>
                    <th className="p-3 text-left font-semibold hidden md:table-cell">{t('candidates.email', 'Email')}</th>
                    <th className="p-3 text-left font-semibold hidden lg:table-cell">{t('candidates.position', 'Position')}</th>
                    <th className="p-3 text-left font-semibold hidden sm:table-cell">{t('candidates.source_label', 'Source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(c => (
                    <tr key={c.id} className="border-t border-border hover:bg-surface-sunken transition-colors">
                      <td className="p-3">
                        <button onClick={() => handleToggleSelect(c.id)}>
                          {selectedIds.has(c.id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-ink-muted" />}
                        </button>
                      </td>
                      <td className="p-3">
                        <Link to={`/recruitment/candidates/${c.id}`} className="font-medium text-ink hover:text-primary hover:underline">
                          {c.full_name}
                        </Link>
                      </td>
                      <td className="p-3 text-ink-muted hidden md:table-cell">{c.email ?? '—'}</td>
                      <td className="p-3 text-ink-muted hidden lg:table-cell">{c.current_position ?? '—'}</td>
                      <td className="p-3 text-ink-muted hidden sm:table-cell">{c.source ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-ink-muted">
                {t('common:showing', 'Showing')} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} {t('common:of', 'of')} {filtered.length}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  {t('common:previous', 'Previous')}
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  {t('common:next', 'Next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CandidatesPage
