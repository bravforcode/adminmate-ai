import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { searchService, type GlobalSearchResults, type SearchResult } from '../../services/searchService'
import { Search, X, Users, Briefcase, FileText, Calendar, Command, Clock } from 'lucide-react'

const RECENT_KEY = 'adminmate-recent-searches'
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentSearch(q: string) {
  const recent = getRecentSearches().filter(r => r !== q)
  recent.unshift(q)
  if (recent.length > MAX_RECENT) recent.pop()
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
}

const TYPE_META: Record<SearchResult['type'], { icon: typeof Users; color: string; labelKey: string }> = {
  candidate: { icon: Users, color: '#2563eb', labelKey: 'search.candidates' },
  job: { icon: Briefcase, color: '#7c3aed', labelKey: 'search.jobs' },
  application: { icon: FileText, color: '#059669', labelKey: 'search.applications' },
  interview: { icon: Calendar, color: '#d97706', labelKey: 'search.interviews' },
}

export function GlobalSearch() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const company = useAuthStore(s => s.company)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches)

  const close = useCallback(() => { setOpen(false); setQuery(''); setResults(null) }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!query.trim() || !company?.id) { setResults(null); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await searchService.globalSearch(company.id, query.trim())
        setResults(r)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, company?.id])

  const totalResults = results
    ? results.candidates.length + results.jobs.length + results.applications.length + results.interviews.length
    : 0

  const handleSelect = (item: SearchResult) => {
    addRecentSearch(query.trim())
    setRecentSearches(getRecentSearches())
    navigate(item.route)
    close()
  }

  const handleRecentClick = (q: string) => {
    setQuery(q)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={t('search.placeholder')}
        className="flex items-center gap-2 px-3 py-[7px] rounded-lg border border-outline-variant bg-surface-container-high/50 text-on-surface-variant text-[13px] cursor-pointer transition-all duration-200 min-w-[200px] max-w-[320px] flex-1 hover:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        <Search size={15} />
        <span className="flex-1 text-left">{t('search.placeholder')}</span>
        <kbd className="flex items-center gap-[2px] px-1.5 py-0.5 rounded text-[11px] font-inherit bg-surface border border-outline-variant text-on-surface-variant">
          <Command size={10} />K
        </kbd>
      </button>
    )
  }

  const categoryOrder: SearchResult['type'][] = ['candidate', 'job', 'application', 'interview']
  const categoryResults: { type: SearchResult['type']; items: SearchResult[] }[] = results
    ? categoryOrder
        .map(type => ({ type, items: results[type + 's' as keyof GlobalSearchResults] }))
        .filter(c => c.items.length > 0)
    : []

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => { if (e.target === e.currentTarget) close() }}
      >
        <motion.div
          role="dialog"
          aria-label={t('search.title')}
          className="w-full max-w-[560px] mx-4 bg-surface rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden max-h-[70vh] flex flex-col"
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/50">
            <div className="flex-shrink-0">
              {loading ? (
                <div className="w-[18px] h-[18px] border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
              ) : (
                <Search size={18} className="text-on-surface-variant" />
              )}
            </div>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="flex-1 border-none outline-none bg-transparent text-[15px] text-on-surface placeholder:text-on-surface-variant/50"
            />
            <button
              onClick={close}
              aria-label={t('common.close')}
              className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1 py-2">
            {/* Empty state / tips */}
            {!query.trim() && (
              <div className="px-5 py-6 text-center">
                <p className="text-[13px] text-on-surface-variant m-0 mb-4">
                  {t('search.tip')}
                </p>
                <div className="flex justify-center gap-4 flex-wrap">
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <Users size={13} /> {t('search.candidates')}
                  </span>
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <Briefcase size={13} /> {t('search.jobs')}
                  </span>
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <FileText size={13} /> {t('search.applications')}
                  </span>
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <Calendar size={13} /> {t('search.interviews')}
                  </span>
                </div>
                {recentSearches.length > 0 && (
                  <div className="mt-5 pt-3 border-t border-outline-variant/50">
                    <p className="text-[11px] text-on-surface-variant m-0 mb-2 uppercase tracking-wider">
                      {t('search.recent')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {recentSearches.map(r => (
                        <button
                          key={r}
                          onClick={() => handleRecentClick(r)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-outline-variant bg-surface-container-high/50 text-on-surface-variant text-xs cursor-pointer hover:bg-surface-container-high transition-colors"
                        >
                          <Clock size={11} /> {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search results */}
            {query.trim() && totalResults === 0 && !loading && (
              <div className="py-8 px-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high mb-3">
                  <Search size={20} className="text-on-surface-variant" />
                </div>
                <p className="text-sm text-on-surface-variant m-0">
                  {t('search.no_results')}
                </p>
                <p className="text-xs text-on-surface-variant/60 mt-1 m-0">
                  Try a different search term
                </p>
              </div>
            )}

            {categoryResults.map(({ type, items }) => {
              const meta = TYPE_META[type]
              const Icon = meta.icon
              return (
                <div key={type}>
                  <p className="px-5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant m-0 transition-colors">
                    {t(meta.labelKey)}
                  </p>
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 bg-transparent border-none cursor-pointer text-left transition-colors duration-150 hover:bg-surface-container-high/50 focus-visible:outline-none focus-visible:bg-surface-container-high/50"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: meta.color + '14', color: meta.color }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-on-surface m-0 truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-on-surface-variant m-0 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-2.5 border-t border-outline-variant/50 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>{totalResults > 0 ? `${totalResults} ${t('search.results_found')}` : t('search.search_hint')}</span>
            <span>
              <kbd className="px-1.5 py-px rounded border border-outline-variant text-[10px]">ESC</kbd>
              {' '}{t('search.to_close')}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
