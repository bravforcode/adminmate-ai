import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { Menu, Search, HelpCircle } from 'lucide-react'

export function Header() {
  const { t } = useTranslation('common')
  const { toggleSidebar } = useUIStore()
  const profile = useAuthStore(s => s.profile)

  return (
    <header className="h-16 fixed top-0 right-0 left-0 md:left-[260px] z-40 bg-surface border-b border-outline-variant flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={toggleSidebar} className="md:hidden p-2 hover:bg-surface-container rounded-lg">
          <Menu size={20} className="text-on-surface-variant" />
        </button>
        <div className="hidden sm:flex relative flex-1 max-w-md items-center rounded-full border border-outline-variant bg-surface-container-lowest focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm focus:outline-none"
            placeholder={t('nav.search')} />
        </div>
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
