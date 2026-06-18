import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { Menu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from '../search/GlobalSearch'
import { cn } from '../../lib/utils'

export function Header() {
  const { toggleSidebar, sidebarOpen } = useUIStore()
  const isHR = useAuthStore(s => s.isAdminOrHR())

  return (
    <header
      role="banner"
      aria-label="Header"
      className={cn(
        'h-[60px] fixed top-0 right-0 left-0 z-40',
        'bg-surface border-b border-border-subtle',
        'flex items-center justify-between',
        'px-7 font-sans',
        'max-md:ml-0 md:ml-[260px]',
      )}
    >
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={toggleSidebar}
          className="md:hidden text-navy min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer hover:bg-gray-100 transition-colors"
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <Menu size={22} />
        </button>

        {/* Global search - desktop */}
        {isHR && (
          <div className="hidden sm:flex flex-1 max-w-[380px]">
            <GlobalSearch />
          </div>
        )}

        {/* Global search - mobile */}
        {isHR && (
          <div className="sm:hidden flex-1">
            <GlobalSearch />
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
        <div className="hidden sm:block w-px h-5 bg-border-subtle" />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
