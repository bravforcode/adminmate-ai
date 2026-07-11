import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from 'react-i18next'
import { navItems, type NavItem } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { Plus, X, ChevronDown } from 'lucide-react'
import { Logo } from '../brand/Logo'
import { Button } from '../ui/Button'

function SidebarGroup({ item, onClose }: { item: NavItem; onClose?: () => void }) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const hasChildren = item.children && item.children.length > 0

  const isChildActive = hasChildren && item.children!.some(
    child => child.path && location.pathname.startsWith(child.path)
  )

  const [open, setOpen] = useState(isChildActive ?? false)

  if (!hasChildren && item.path) {
    return (
      <NavLink
        to={item.path}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] no-underline transition-colors duration-100',
            isActive
              ? 'text-white bg-white/12 font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5',
          )
        }
      >
        <item.icon size={16} className="shrink-0" />
        <span className="sidebar-label">{t(item.labelKey)}</span>
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-[13px] border-none cursor-pointer transition-colors duration-100',
          'bg-transparent text-left',
          isChildActive
            ? 'text-white/80'
            : 'text-white/45 hover:text-white/70 hover:bg-white/5',
        )}
      >
        <item.icon size={16} className="shrink-0" />
        <span className="sidebar-label flex-1">{t(item.labelKey)}</span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 transition-transform duration-150 sidebar-label',
            open && 'rotate-180'
          )}
        />
      </button>

        {open && item.children && (
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-white/8 pl-2">
            {item.children.map(child => (
              <NavLink
                key={child.path}
                to={child.path!}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] no-underline transition-colors duration-100',
                    isActive
                      ? 'text-white bg-white/10 font-medium'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5',
                  )
                }
              >
                <child.icon size={14} className="shrink-0" />
                <span className="sidebar-label">{t(child.labelKey)}</span>
              </NavLink>
            ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const { t } = useTranslation('common')

  const userRole = profile?.role ?? 'hr'

  // Filter items by role
  const visibleItems = navItems.filter(item => {
    if (item.roles && !item.roles.includes(userRole)) return false
    if (item.children) {
      const visibleChildren = item.children.filter(
        child => !child.roles || child.roles.includes(userRole)
      )
      return visibleChildren.length > 0
    }
    return true
  })

  const handleClose = () => {
    if (sidebarOpen) toggleSidebar()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/30 animate-backdrop"
          onClick={toggleSidebar}
        />
      )}

      <nav
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col',
          'bg-surface-raised border-r border-border',
          'transition-transform duration-200 ease-out',
          sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
          'md:translate-x-0',
        )}
        style={{ width: 'var(--sidebar-width)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <div className="sidebar-logo-text">
            <Logo size={28} showText={false} />
            <div>
              <p className="text-ink font-semibold text-sm leading-tight m-0">
                AdminMate
              </p>
              <p className="text-[10px] text-ink-muted m-0 max-w-[120px] truncate sidebar-company-name">
                {company?.name || 'AI Platform'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="md:hidden text-ink-muted hover:text-ink p-2 rounded-md transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick action */}
        <div className="px-3 py-2.5 sidebar-cta">
          <Button
            variant="default"
            size="sm"
            className="w-full justify-center gap-1.5 text-[12px] font-medium sidebar-btn-text"
            onClick={() => {
              navigate('/recruitment/jobs', { state: { openCreateJob: true } })
              handleClose()
            }}
          >
            <Plus size={14} />
            <span className="sidebar-btn-text">{t('nav.new_request')}</span>
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-2.5 py-1 flex flex-col gap-0.5 overflow-y-auto sidebar-scroll">
          {visibleItems.map(item => (
            <SidebarGroup
              key={item.path || item.labelKey}
              item={item}
              onClose={handleClose}
            />
          ))}
        </div>

        {/* Bottom */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <p className="text-[10px] text-ink-faint m-0 sidebar-version-text">
            AdminMate AI &nbsp;v2.0
          </p>
        </div>
      </nav>
    </>
  )
}
