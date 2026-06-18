import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useTranslation } from 'react-i18next'
import { navItems } from '../../lib/navigation'
import { cn } from '../../lib/utils'
import { Plus, X } from 'lucide-react'
import { Button } from '../ui/Button'

export function Sidebar() {
  const navigate = useNavigate()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const { t } = useTranslation('common')

  const userRole = profile?.role ?? 'hr'
  const isApplicant = userRole === 'applicant'

  // Filter items by role — items with no `roles` array are shown to all
  const visibleItems = navItems
    .filter(item => !item.roles || item.roles.includes(userRole))
    .flatMap(item => {
      if (!item.children) return [item]
      const visibleChildren = item.children.filter(
        child => !child.roles || child.roles.includes(userRole)
      )
      return visibleChildren.length ? visibleChildren : []
    })

  const handlePrimaryAction = () => {
    if (isApplicant) {
      navigate('/applicant/jobs')
    } else {
      navigate('/recruitment/jobs', { state: { openCreateJob: true } })
    }

    if (sidebarOpen) toggleSidebar()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-navy-deep/15 animate-backdrop"
          onClick={toggleSidebar}
        />
      )}

      <nav
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'fixed left-0 top-0 h-full w-[260px] z-50 flex flex-col',
          'bg-navy-deep text-white border-r-0',
          'transition-transform duration-200 ease-out',
          sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
          'md:translate-x-0',
        )}
      >
        {/* Logo strip */}
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <span className="text-white font-serif text-[15px]">A</span>
            </div>
            <div>
              <p className="text-white font-serif text-[15px] leading-tight m-0">
                AdminMate
              </p>
              <p className="text-[10px] text-white/45 m-0 max-w-[140px] truncate">
                {company?.name || 'AI Platform'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="md:hidden text-white/50 hover:text-white/80 p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* New Request CTA */}
        <div className="px-3.5 py-2.5">
          <Button
            variant="glow"
            className="w-full justify-center gap-1.5 text-[13px] font-medium rounded-lg"
            onClick={handlePrimaryAction}
          >
            <Plus size={15} />
            {isApplicant ? t('nav.browse_jobs') : t('nav.new_request')}
          </Button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 px-2.5 py-2 flex flex-col gap-0.5 overflow-y-auto">
          {visibleItems.map(item => (
            <motion.div
              key={item.path}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            >
              <NavLink
                to={item.path!}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2 rounded-lg text-[13px] no-underline transition-all duration-200',
                    isActive
                      ? 'text-white bg-accent/25 border-l-[3px] border-accent font-semibold'
                      : 'text-white/55 hover:text-white/85 hover:bg-white/6 border-l-[3px] border-transparent font-normal',
                  )
                }
              >
                <item.icon size={17} className="shrink-0" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </motion.div>
          ))}
        </div>

        {/* Bottom — version */}
        <div className="px-5 py-4 border-t border-white/6">
          <p className="text-[10px] text-white/25 m-0 tracking-wider">
            AdminMate AI &nbsp;&mdash;&nbsp; v2.0
          </p>
        </div>
      </nav>
    </>
  )
}
