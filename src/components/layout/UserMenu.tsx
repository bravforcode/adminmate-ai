import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { LogOut, Settings, User, ClipboardList, RotateCcw } from 'lucide-react'

export function UserMenu() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isApplicant = profile?.role === 'applicant'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={profile?.full_name ?? 'User menu'}
        data-testid="user-menu-button"
        className="w-8 h-8 rounded-full bg-primary-container dark:bg-primary-container text-on-primary-container dark:text-accent-dim flex items-center justify-center text-sm font-semibold hover:opacity-80"
      >
        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-56 bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline shadow-lg py-2 z-50 origin-top-right"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          >
            <div className="px-4 py-2 border-b border-outline-variant dark:border-outline">
              <p className="text-sm font-semibold text-on-surface dark:text-on-surface">{profile?.full_name}</p>
              <p className="text-xs text-on-surface-variant dark:text-on-surface-variant">{profile?.email}</p>
              <span className="mt-1 inline-block text-xs font-medium capitalize bg-secondary-container dark:bg-surface-container-low text-on-secondary-container dark:text-accent-dim px-2 py-0.5 rounded-full">
                {profile?.role || 'user'}
              </span>
            </div>

            {isApplicant ? (
              <>
                <button
                  onClick={() => { navigate('/my-profile'); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-low transition-colors"
                >
                  <User size={16} /> {t('nav.my_profile')}
                </button>
                <button
                  onClick={() => { navigate('/my-tasks'); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-low transition-colors"
                >
                  <ClipboardList size={16} /> {t('nav.my_tasks')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { navigate('/settings'); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-low transition-colors"
                >
                  <User size={16} /> {t('nav.profile')}
                </button>
                <button
                  onClick={() => { navigate('/settings'); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-low transition-colors"
                >
                  <Settings size={16} /> {t('nav.settings')}
                </button>
              </>
            )}

            <hr className="my-1 border-outline-variant dark:border-outline" />
            <button
              onClick={() => {
                localStorage.removeItem('adminmate_onboarding_tour_completed')
                window.location.reload()
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container dark:hover:bg-surface-container-low transition-colors"
            >
              <RotateCcw size={16} /> {t('tour.restart')}
            </button>
            <hr className="my-1 border-outline-variant dark:border-outline" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error dark:text-error hover:bg-error-container/10 dark:hover:bg-error-container/30 transition-colors"
            >
              <LogOut size={16} /> {t('auth.sign_out')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
