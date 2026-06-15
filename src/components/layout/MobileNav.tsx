import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Briefcase, FileCheck, UserCheck } from 'lucide-react'

const mobileItems = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'nav.dashboard' },
  { path: '/recruitment/jobs', icon: Briefcase, key: 'nav.recruitment' },
  { path: '/hiring', icon: FileCheck, key: 'nav.hiring' },
  { path: '/onboarding', icon: UserCheck, key: 'nav.onboarding' },
]

export function MobileNav() {
  const { t } = useTranslation('common')

  return (
    <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-surface dark:bg-[#1e293b] border-t border-outline-variant dark:border-[#334155] z-50 flex justify-around py-2 safe-bottom" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {mobileItems.map(item => (
        <NavLink key={item.path} to={item.path} className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ease-out ${isActive ? 'text-primary dark:text-[#93c5fd] bg-surface-container-low dark:bg-[#1e3a5f] scale-105 shadow-sm' : 'text-on-surface-variant dark:text-[#94a3b8] hover:text-on-surface dark:hover:text-[#f1f5f9] active:scale-95'}`
        }>
          <item.icon size={22} strokeWidth={2.2} />
          <span className="font-medium">{t(item.key)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
