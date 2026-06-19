import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { getDefaultRoute } from '../../router/AuthGuard'

/**
 * Handles OAuth callback after Google login.
 * With implicit flow, Supabase extracts tokens from URL hash fragment.
 * This page loads profile and redirects to the correct dashboard.
 */
export default function OAuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)

  useEffect(() => {
    ;(async () => {
      try {
        // With implicit flow + detectSessionInUrl, Supabase auto-extracts
        // the token from URL hash fragment. Get the session.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('[OAuth] Session error:', sessionError.message)
          setError(sessionError.message)
          return
        }

        if (!session?.user) {
          // Try waiting a bit for the session to be set
          await new Promise(r => setTimeout(r, 1000))
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (!retrySession?.user) {
            setError('No session found after OAuth')
            return
          }
          await loadProfile(retrySession.user.id)
          return
        }

        await loadProfile(session.user.id)
      } catch (e) {
        console.error('[OAuth] Unexpected error:', e)
        setError(String(e))
      }
    })()
  }, [])

  async function loadProfile(userId: string) {
    useAuthStore.getState().setUser((await supabase.auth.getUser()).data.user!)

    let { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
      .eq('id', userId)
      .maybeSingle()

    if (!profile) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
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
          .eq('id', userId)
          .maybeSingle()
        if (newProfile) profile = newProfile
      }
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

    // Clean hash from URL
    window.history.replaceState({}, '', '/auth/callback')
  }

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

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
