import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { LogOut, Settings, User } from 'lucide-react'
import { cn } from '../../utils/cn'

export function UserMenu() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-semibold hover:opacity-80">
        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl border border-outline-variant shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-outline-variant">
            <p className="text-sm font-semibold text-on-surface">{profile?.full_name}</p>
            <p className="text-xs text-on-surface-variant">{profile?.email}</p>
          </div>
          <button onClick={() => { navigate('/settings'); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
            <User size={16} /> {t('nav.profile')}
          </button>
          <button onClick={() => { navigate('/settings'); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
            <Settings size={16} /> {t('nav.settings')}
          </button>
          <hr className="my-1 border-outline-variant" />
          <button onClick={() => { logout(); navigate('/login'); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-error-container/10 transition-colors">
            <LogOut size={16} /> {t('auth.sign_out')}
          </button>
        </div>
      )}
    </div>
  )
}
