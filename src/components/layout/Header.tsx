import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { Menu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from '../search/GlobalSearch'

export function Header() {
  const { toggleSidebar } = useUIStore()
  const isHR = useAuthStore(s => s.isAdminOrHR())

  return (
    <header
      role="banner"
      aria-label="Header"
      style={{
      height: '60px',
      position: 'fixed',
      top: 0, right: 0, left: 0,
      marginLeft: '260px',
      zIndex: 40,
      backgroundColor: 'var(--color-surface, #ffffff)',
      borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)',
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
          aria-label="Open navigation menu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-navy, #2563eb)', padding: '10px',
            borderRadius: '8px',
            minWidth: '44px', minHeight: '44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Menu size={22} />
        </button>

        {/* Global search trigger */}
        {isHR && (
          <div className="hidden sm:flex" style={{ flex: 1, maxWidth: '380px' }}>
            <GlobalSearch />
          </div>
        )}

        {/* Mobile search toggle */}
        {isHR && (
          <div className="sm:hidden" style={{ flex: 1 }}>
            <GlobalSearch />
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ThemeToggle />
        <LanguageSwitcher />
        <div className="hidden sm:block" style={{ width: '1px', height: '20px', backgroundColor: 'var(--color-border-subtle, #f1f5f9)' }} />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
