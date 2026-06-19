import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { getDefaultRoute } from '../../router/AuthGuard'

/**
 * Handles OAuth PKCE code exchange after Google/GitHub login.
 * This page is ONLY reached when URL has ?code= param.
 * Once session is stored, redirects to the correct dashboard by role.
 */
export default function OAuthCallbackPage() {
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const code = params.get('code')
    if (!code) return

    ;(async () => {
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('[OAuth] Exchange failed:', exchangeError.message)
          setError(exchangeError.message)
          return
        }

        const authUser = data?.session?.user
        if (!authUser) {
          setError('No user in session')
          return
        }

        // Update store
        useAuthStore.getState().setUser(authUser)

        // Load or create profile
        let { data: profile } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
          .eq('id', authUser.id)
          .maybeSingle()

        if (!profile) {
          await supabase.from('user_profiles').insert({
            id: authUser.id,
            email: authUser.email ?? '',
            full_name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? 'User',
            role: 'applicant',
            language_preference: 'en',
            is_active: true,
          })
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
            .eq('id', authUser.id)
            .maybeSingle()
          if (newProfile) profile = newProfile
        }

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

        // Clean URL
        window.history.replaceState({}, '', getDefaultRoute(profile?.role))
      } catch (e) {
        console.error('[OAuth] Unexpected error:', e)
        setError(String(e))
      }
    })()
  }, []) // Run once on mount

  // Redirect once profile is loaded
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-500">Login failed: {error}</p>
        <a href="/login" className="text-primary underline">Try again</a>
      </div>
    )
  }

  if (user && profile) {
    return <Navigate to={getDefaultRoute(profile.role)} replace />
  }

  // Still loading
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
