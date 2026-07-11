import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { Menu, HelpCircle } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from '../search/GlobalSearch'
import { cn } from '../../lib/utils'
import { resetAllTours } from '../onboarding/OnboardingTour'

export function Header() {
  const { toggleSidebar, sidebarOpen } = useUIStore()
  const isHR = useAuthStore(s => s.isAdminOrHR())

  return (
    <header
      role="banner"
      aria-label="Header"
      className={cn(
        'h-12 fixed top-0 right-0 left-0 z-40',
        'bg-surface/80 backdrop-blur-lg border-b border-border',
        'flex items-center justify-between',
        'px-4 md:px-6',
        'md:sidebar-offset',
      )}
    >
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={toggleSidebar}
          className="md:hidden text-ink min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer hover:bg-surface-sunken transition-colors"
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <Menu size={20} />
        </button>

        {/* Global search */}
        {isHR && (
          <div data-tour="search" className="flex-1 max-w-[360px]">
            <GlobalSearch />
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <div data-tour="language"><LanguageSwitcher /></div>
        <div className="hidden sm:block w-px h-4 bg-border mx-1" />
        <div data-tour="notifications"><NotificationBell /></div>
        <button
          onClick={resetAllTours}
          className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-surface-sunken transition-colors"
          title="Show onboarding tour again"
          aria-label="Show help tour"
        >
          <HelpCircle size={18} className="text-ink-muted" />
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
