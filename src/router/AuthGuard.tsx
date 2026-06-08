import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requireCompany?: boolean
  /** Set false on nested guards that don't need to re-trigger session init */
  callInitSession?: boolean
}

/** Returns the default landing route for the given role. */
export function getDefaultRoute(role?: string | null): string {
  if (role === 'applicant') return '/applicant/dashboard'
  return '/dashboard'
}

export function AuthGuard({ children, requiredRoles, requireCompany = true, callInitSession = true }: AuthGuardProps) {
  const { isAuthenticated, hasCompany, isLoading, profile, initSession } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (callInitSession) initSession()
  }, []) // run once on mount

  if (isLoading) {
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
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireCompany && !hasCompany()) {
    return <Navigate to="/setup-company" replace />
  }

  if (requiredRoles && !requiredRoles.includes(profile?.role ?? '')) {
    // Redirect to the correct home for their actual role
    const fallback = getDefaultRoute(profile?.role)
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}

interface CompanySetupGuardProps {
  children: React.ReactNode
}

export function CompanySetupGuard({ children }: CompanySetupGuardProps) {
  const { isAuthenticated, hasCompany, isLoading, initSession } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    initSession()
  }, [initSession])

  if (isLoading) {
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
