import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { Menu, Search, HelpCircle, X } from 'lucide-react'
import { useCandidates } from '../../hooks/useCandidates'
import { cn } from '../../utils/cn'

export function Header() {
  const { t } = useTranslation('common')
  const { toggleSidebar } = useUIStore()
  const profile = useAuthStore(s => s.profile)
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const { data: candidates } = useCandidates()
  const [showResults, setShowResults] = useState(false)

  const results = search.length >= 2
    ? candidates?.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.current_position?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5) || []
    : []

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus()
  }, [searchOpen])

  return (
    <header className="h-16 fixed top-0 right-0 left-0 md:left-[260px] z-40 bg-surface border-b border-outline-variant flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={toggleSidebar} className="md:hidden p-2 hover:bg-surface-container rounded-lg">
          <Menu size={20} className="text-on-surface-variant" />
        </button>
        <div className="hidden sm:flex relative flex-1 max-w-md items-center rounded-full border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setShowResults(true) }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            onKeyDown={e => {
              if (e.key === 'Enter' && results.length > 0) {
                navigate(`/recruitment/candidates/${results[0].id}`)
                setSearch(''); setShowResults(false)
              }
            }}
            className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm focus:outline-none"
            placeholder={t('nav.search')}
          />
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-xl border border-outline-variant shadow-lg overflow-hidden z-50">
              {results.map((c: any) => (
                <button
                  key={c.id}
                  onMouseDown={() => { navigate(`/recruitment/candidates/${c.id}`); setSearch(''); setShowResults(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {c.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{c.full_name}</p>
                    <p className="text-xs text-on-surface-variant truncate">{c.current_position || c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} className="sm:hidden p-2 hover:bg-surface-container rounded-lg">
          <Search size={20} className="text-on-surface-variant" />
        </button>
        {searchOpen && (
          <div className="sm:hidden fixed inset-x-0 top-0 z-50 bg-surface p-3 flex items-center gap-2 border-b border-outline-variant">
            <Search size={18} className="text-on-surface-variant shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && results.length > 0) {
                  navigate(`/recruitment/candidates/${results[0].id}`); setSearch(''); setSearchOpen(false)
                }
              }}
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder={t('nav.search')}
            />
            <button onClick={() => { setSearchOpen(false); setSearch('') }} className="p-1">
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <NotificationBell />
        <button className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant">
          <HelpCircle size={20} />
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
