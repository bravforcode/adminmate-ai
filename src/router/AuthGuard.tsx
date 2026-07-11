import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getDefaultRoute } from '../lib/navigation'

export { getDefaultRoute }

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requireCompany?: boolean
  callInitSession?: boolean
}

function useHydrationGuard(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated())
  useEffect(() => {
    if (hydrated) return
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    return () => unsub()
  }, [hydrated])
  return hydrated
}

export function AuthGuard({ children, requiredRoles, requireCompany = true, callInitSession = true }: AuthGuardProps) {
  const hydrated = useHydrationGuard()
  const { isAuthenticated, hasCompany, isLoading, profile, initSession } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (hydrated && callInitSession) initSession()
  }, [hydrated, callInitSession, initSession])

  if (!hydrated || isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="auth-guard-loading"
        className="flex items-center justify-center h-screen"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated()) {
    // Demo mode: auto-init demo user when Supabase is unreachable
    const isDemo = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_SUPABASE_URL
    if (isDemo) {
      useAuthStore.getState().initDemo()
      return <>{children}</>
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireCompany && !hasCompany()) {
    return <Navigate to="/setup-company" replace />
  }

  if (requiredRoles && !requiredRoles.includes(profile?.role ?? '')) {
    const fallback = getDefaultRoute(profile?.role)
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}

interface CompanySetupGuardProps {
  children: React.ReactNode
}

export function CompanySetupGuard({ children }: CompanySetupGuardProps) {
  const hydrated = useHydrationGuard()
  const { isAuthenticated, hasCompany, isLoading, initSession } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (hydrated) initSession()
  }, [hydrated, initSession])

  if (!hydrated || isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center h-screen"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (hasCompany()) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
