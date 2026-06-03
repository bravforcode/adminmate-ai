import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from 'react-i18next'
import { navItems } from '../../lib/navigation'
import { Plus, X } from 'lucide-react'
import { cn } from '../../utils/cn'

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const company = useAuthStore(s => s.company)
  const { t } = useTranslation('common')

  const flatNavItems = navItems.flatMap(item => item.children ? item.children : [item])

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={toggleSidebar} />
      )}
      <nav className={cn(
        'fixed left-0 top-0 h-full w-[260px] bg-surface border-r border-outline-variant z-50 flex flex-col transition-transform duration-200',
        'max-md:transform max-md:shadow-lg',
        sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
        'md:translate-x-0'
      )}>
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-on-primary font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="font-semibold text-on-surface text-sm">AdminMate AI</h1>
              <p className="text-xs text-on-surface-variant">{company?.name || t('app.tagline')}</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="md:hidden p-1 hover:bg-surface-container rounded">
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>

        <div className="px-3 py-3">
          <button className="w-full bg-primary text-on-primary py-2 px-4 rounded-lg text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2">
            <Plus size={16} /> {t('nav.new_request')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {flatNavItems.map(item => (
            <NavLink key={item.path} to={item.path!} className={({ isActive }) =>
              cn('flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg', isActive ? 'border-l-4 border-primary bg-surface-container-low text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all duration-200')
            }>
              <item.icon size={20} />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
