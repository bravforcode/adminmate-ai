import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

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
  const [exchanging, setExchanging] = useState(false)

  // When returning from OAuth, manually exchange PKCE code
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const code = params.get('code')
    if (!code) return

    setExchanging(true)
    supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
      // Clean URL regardless
      window.history.replaceState({}, '', location.pathname)

      if (!error && data?.session?.user) {
        // Manually update store since subscribeAuth might not fire in time
        useAuthStore.getState().setUser(data.session.user)
        // Load profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
          .eq('id', data.session.user.id)
          .maybeSingle()
        if (profile) {
          useAuthStore.getState().setProfile(profile)
          if (profile.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('id, name, name_th, tax_id, phone, email, city, website_url, industry, country, currency, locale, subscription_tier')
              .eq('id', profile.company_id)
              .maybeSingle()
            if (company) useAuthStore.getState().setCompany(company)
          }
        }
      }
      setExchanging(false)
    })
  }, []) // Only run once on mount

  useEffect(() => {
    if (hydrated && callInitSession) initSession()
  }, [hydrated, callInitSession])

  if (!hydrated || exchanging || (isLoading && !isAuthenticated())) {
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
