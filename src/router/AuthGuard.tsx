import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requireCompany?: boolean
}

export function AuthGuard({ children, requiredRoles, requireCompany = true }: AuthGuardProps) {
  const { isAuthenticated, isAdminOrHR, hasCompany, isLoading, profile, initSession } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    initSession()
  }, [initSession])

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
    return <Navigate to="/dashboard" replace />
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
