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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant z-50 flex justify-around py-2 safe-bottom">
      {mobileItems.map(item => (
        <NavLink key={item.path} to={item.path} className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors ${isActive ? 'text-primary bg-surface-container-low' : 'text-on-surface-variant'}`
        }>
          <item.icon size={20} />
          <span>{t(item.key)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
