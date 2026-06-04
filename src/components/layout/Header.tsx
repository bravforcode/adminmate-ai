import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { Menu, Search, X } from 'lucide-react'
import { useCandidates } from '../../hooks/useCandidates'

export function Header() {
  const { t } = useTranslation('common')
  const { toggleSidebar } = useUIStore()
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
    <header style={{
      height: '60px',
      position: 'fixed',
      top: 0, right: 0, left: 0,
      marginLeft: '260px',
      zIndex: 40,
      backgroundColor: 'var(--color-surface, #ffffff)',
      borderBottom: '1px solid var(--color-border-subtle, #e8f0f8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}
    className="max-md:ml-0"
    >
      {/* Left: hamburger + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <button
          onClick={toggleSidebar}
          className="md:hidden"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-navy, #1e3a5f)', padding: '6px',
            borderRadius: '8px',
          }}
        >
          <Menu size={20} />
        </button>

        {/* Search bar — desktop */}
        <div
          className="hidden sm:flex"
          style={{
            position: 'relative',
            flex: '1',
            maxWidth: '380px',
            alignItems: 'center',
            borderRadius: '8px',
            border: '1px solid var(--color-border, #d4e3f0)',
            backgroundColor: 'var(--color-surface-alt, #f0f6fc)',
            transition: 'border-color 0.25s ease-out, box-shadow 0.25s ease-out',
          }}
          onFocusCapture={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'var(--color-navy, #1e3a5f)'
            el.style.boxShadow = '0 0 0 3px rgba(30,58,95,0.08)'
          }}
          onBlurCapture={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'var(--color-border, #d4e3f0)'
            el.style.boxShadow = 'none'
          }}
        >
          <Search size={15} style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted, #8aa0bb)',
            pointerEvents: 'none',
          }} />
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
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: '16px',
              paddingTop: '8px',
              paddingBottom: '8px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--color-text-primary, #0f1c2e)',
            }}
            placeholder={t('nav.search')}
          />

          {/* Search results dropdown */}
          {showResults && results.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0, right: 0,
              backgroundColor: 'var(--color-surface, #ffffff)',
              border: '1px solid var(--color-border, #d4e3f0)',
              borderRadius: '10px',
              boxShadow: '0 16px 40px rgba(30, 58, 95, 0.12)',
              overflow: 'hidden',
              zIndex: 60,
            }}>
              {results.map((c: any) => (
                <button
                  key={c.id}
                  onMouseDown={() => {
                    navigate(`/recruitment/candidates/${c.id}`)
                    setSearch(''); setShowResults(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.2s ease-out',
                    borderBottom: '1px solid var(--color-border-subtle, #e8f0f8)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent-light, #e8f4fd)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-navy, #1e3a5f)',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {c.full_name?.charAt(0) || '?'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: '13px', fontWeight: 500,
                      color: 'var(--color-navy-deep, #0f1c2e)',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.full_name}
                    </p>
                    <p style={{
                      fontSize: '11px', color: 'var(--color-text-muted, #8aa0bb)',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.current_position || c.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="sm:hidden"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-secondary, #4a6080)', padding: '6px',
            borderRadius: '8px',
          }}
        >
          <Search size={19} />
        </button>

        {/* Mobile search overlay */}
        {searchOpen && (
          <div
            className="sm:hidden"
            style={{
              position: 'fixed',
              inset: '0 0 auto 0',
              zIndex: 70,
              backgroundColor: 'var(--color-surface, #ffffff)',
              borderBottom: '1px solid var(--color-border-subtle, #e8f0f8)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Search size={16} style={{ color: 'var(--color-text-muted, #8aa0bb)', flexShrink: 0 }} />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && results.length > 0) {
                  navigate(`/recruitment/candidates/${results[0].id}`)
                  setSearch(''); setSearchOpen(false)
                }
              }}
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: '14px',
                color: 'var(--color-text-primary, #0f1c2e)',
              }}
              placeholder={t('nav.search')}
            />
            <button
              onClick={() => { setSearchOpen(false); setSearch('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <X size={16} style={{ color: 'var(--color-text-muted, #8aa0bb)' }} />
            </button>
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <LanguageSwitcher />
        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border-subtle, #e8f0f8)' }} />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
