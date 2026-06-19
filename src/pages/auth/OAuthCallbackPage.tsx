import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { getDefaultRoute } from '../../router/AuthGuard'

/**
 * Handles OAuth callback after Google login.
 * Supabase auto-extracts tokens from URL hash/query params.
 * This page waits for session, loads profile, then redirects.
 */
export default function OAuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)

  useEffect(() => {
    let cancelled = false

    async function handleCallback() {
      // Wait a moment for Supabase to process the URL
      await new Promise(r => setTimeout(r, 500))
      if (cancelled) return

      // Check for session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        if (!cancelled) setError(sessionError.message)
        return
      }

      if (!session?.user) {
        // Try one more time after a delay
        await new Promise(r => setTimeout(r, 1500))
        if (cancelled) return

        const { data: { session: retry } } = await supabase.auth.getSession()
        if (!retry?.user) {
          if (!cancelled) setError('No session found. Please try logging in again.')
          return
        }
        await setupUser(retry.user.id)
        return
      }

      await setupUser(session.user.id)
    }

    async function setupUser(userId: string) {
      if (cancelled) return

      // Get fresh user data
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        if (!cancelled) setError('Failed to get user')
        return
      }

      useAuthStore.getState().setUser(authUser)

      // Load profile
      let { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
        .eq('id', userId)
        .maybeSingle()

      // Create profile if missing (new Google user)
      if (!profile) {
        await supabase.from('user_profiles').insert({
          id: authUser.id,
          email: authUser.email ?? '',
          full_name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? authUser.email?.split('@')[0] ?? 'User',
          role: 'hr',
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
      if (!cancelled) setReady(true)
    }

    handleCallback()

    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-500 text-center px-4">Login failed: {error}</p>
        <a href="/login" className="text-primary underline">Try again</a>
      </div>
    )
  }

  if (ready && user && profile) {
    return <Navigate to={getDefaultRoute(profile.role)} replace />
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
