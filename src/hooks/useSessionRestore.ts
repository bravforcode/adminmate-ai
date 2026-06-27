import { useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { fetchSessionStatus } from '../lib/sessionApi'

/**
 * Session restore hook.
 *
 * SECURITY: The access_token is never transmitted in JSON response bodies.
 * Token transport is handled exclusively via httpOnly cookies and the
 * Supabase client's built-in session persistence (persistSession: true).
 *
 * On page reload the Supabase client reads the session from localStorage.
 * If no session exists we hit the /status endpoint to validate the httpOnly
 * refresh cookie and, if valid, use supabase.auth.getSession() to pick up
 * the session that was persisted during the last interaction.
 */
export function useSessionRestore() {
  const store = useAuthStore()

  const restoreSession = useCallback(async (): Promise<void> => {
    store.setLoading(true)
    store.setError(null)
    try {
      // 1. Try Supabase client's persisted session first (localStorage)
      const { data: { session: existingSession } } =
        await supabase.auth.getSession()

      if (existingSession?.user) {
        // Session exists in client — hydrate profile + company
        await hydrateProfile(existingSession.user.id)
        return
      }

      // 2. No client session — check with server via httpOnly refresh cookie
      const status = await fetchSessionStatus()
      if (!status.valid) {
        store.setUser(null)
        store.setProfile(null)
        store.setCompany(null)
        return
      }

      // 3. Server confirmed session is valid. The refresh cookie was rotated
      //    by the /status endpoint. Now try getSession again — the Supabase
      //    client should have a session if the cookie-based refresh worked.
      const { data: { session: refreshedSession } } = await supabase.auth.getSession()

      if (refreshedSession?.user) {
        await hydrateProfile(refreshedSession.user.id)
        return
      }

      // 4. If still no session, the client cannot establish one without
      //    the access_token (which is httpOnly). Fall through to logged-out.
      store.setUser(null)
      store.setProfile(null)
      store.setCompany(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'session_restore_failed'
      store.setError(message)
      store.setUser(null)
      store.setProfile(null)
      store.setCompany(null)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  /** Load user profile + company from Supabase after session is established. */
  async function hydrateProfile(userId: string) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
      .eq('id', userId)
      .maybeSingle()

    if (profile) {
      store.setProfile(profile)
      const { id: _pid, ...profileData } = profile as Record<string, unknown>
      store.setUser({ id: userId, ...profileData } as never)
      if (profile.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('id, name, name_th, tax_id, phone, email, city, website_url, industry, country, currency, locale, subscription_tier')
          .eq('id', profile.company_id)
          .maybeSingle()
        if (company) store.setCompany(company)
      }
    }
  }

  return { restoreSession }
}
