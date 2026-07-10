import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { navItems, type NavItem } from '../../lib/navigation'
import { MoreHorizontal, X } from 'lucide-react'

/**
 * ponytail: MobileNav generated from shared navItems.
 * Shows 4 primary items + "More" overflow menu.
 * Role-aware: HR sees HR routes, applicant sees applicant routes.
 */
export function MobileNav() {
  const { t } = useTranslation('common')
  const profile = useAuthStore(s => s.profile)
  const userRole = profile?.role ?? 'hr'
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // Flatten navItems by role (same logic as Sidebar)
  const visibleItems = navItems
    .filter(item => !item.roles || item.roles.includes(userRole))
    .flatMap(item => {
      if (!item.children) return [item]
      const visibleChildren = item.children.filter(
        child => !child.roles || child.roles.includes(userRole)
      )
      return visibleChildren.length ? visibleChildren : []
    })

  // Primary items: first 4 routes with paths
  const primaryPaths = ['/dashboard', '/recruitment/jobs', '/recruitment/candidates', '/onboarding']

  const primaryItems = primaryPaths
    .map(path => visibleItems.find(item => item.path === path))
    .filter((item): item is NavItem => !!item)

  // Overflow: everything else
  const primarySet = new Set(primaryItems.map(i => i.path))
  const overflowItems = visibleItems.filter(item => !primarySet.has(item.path))

  // Close more menu on outside click
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreOpen])

  // Close on escape
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [moreOpen])

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/30" onClick={() => setMoreOpen(false)} />
      )}

      {/* More menu panel */}
      {moreOpen && (
        <div
          ref={moreRef}
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
          className="fixed bottom-16 left-2 right-2 z-50 md:hidden bg-surface border border-border rounded-xl shadow-lg max-h-[60vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border">
            <span className="text-sm font-semibold text-ink dark:text-ink">
              {t('nav.more')}
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-2 rounded-lg hover:bg-surface-sunken dark:hover:bg-surface-sunken transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={t('nav.close_menu')}
            >
              <X size={18} className="text-ink-variant dark:text-ink-variant" />
            </button>
          </div>
          <div className="p-2">
            {overflowItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path!}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'text-primary dark:text-primary-muted bg-surface-sunken dark:bg-surface-sunken'
                      : 'text-ink hover:bg-surface-sunken dark:hover:bg-surface-sunken'
                  }`
                }
              >
                <item.icon size={18} className="shrink-0" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 flex justify-around py-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {primaryItems.map(item => (
          <NavLink key={item.path} to={item.path!} className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ease-out ${isActive ? 'text-primary dark:text-primary-muted bg-surface-sunken scale-105 shadow-sm' : 'text-ink-variant dark:text-ink-variant hover:text-ink dark:hover:text-ink active:scale-95'}`
          }>
            <item.icon size={22} strokeWidth={2.2} />
            <span className="font-medium">{t(item.labelKey)}</span>
          </NavLink>
        ))}

        {/* More button */}
        {overflowItems.length > 0 && (
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-label={t('nav.more')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ease-out ${
              moreOpen
                ? 'text-primary dark:text-primary-muted bg-surface-sunken scale-105 shadow-sm'
                : 'text-ink-variant dark:text-ink-variant hover:text-ink dark:hover:text-ink active:scale-95'
            }`}
          >
            <MoreHorizontal size={22} strokeWidth={2.2} />
            <span className="font-medium">{t('nav.more')}</span>
          </button>
        )}
      </nav>
    </>
  )
}
