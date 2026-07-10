import { useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { fetchSessionStatus, refreshAccessToken } from '../lib/sessionApi'

/**
 * Session restore hook.
 *
 * SECURITY: The refresh_token is NEVER transmitted in any JSON response
 * body — it is transported exclusively via an httpOnly, `__Host-` prefixed
 * cookie owned by the /auth-session edge functions. The access_token IS
 * returned in response bodies (a short-lived bearer token) so the client can
 * hydrate the Supabase SDK's in-memory session via supabase.auth.setSession().
 *
 * On page reload the Supabase client may already have a persisted session in
 * localStorage (fast path below — untouched). If not, we hit /status to
 * validate the httpOnly refresh cookie; if valid, we call /refresh (which
 * rotates the cookie and returns a fresh access_token) and feed that
 * access_token into setSession() to hydrate the SDK. The SDK's own
 * autoRefreshToken is disabled (see src/lib/supabase.ts) — proactive
 * refresh-before-expiry is scheduled by this hook instead, always going
 * through our own /refresh endpoint so the real refresh_token (never
 * available to client JS) is never needed directly by the SDK.
 */

// Placeholder passed as the `refresh_token` argument to supabase.auth.setSession().
// setSession() requires a non-empty string for both arguments, but the real
// refresh_token is httpOnly-cookie-only and never available to client JS.
// This is safe: per @supabase/auth-js's GoTrueClient._setSession, the passed
// refresh_token is only ever used to call the SDK's internal token-refresh
// endpoint if the *access_token* it's given has already expired. We only call
// setSession() immediately after a successful /refresh, so the access_token
// is always freshly minted and unexpired — the safe (non-refreshing) code
// path is taken and this placeholder is stored locally but never sent over
// the wire. autoRefreshToken is also disabled, so nothing else in the SDK
// will ever attempt to use it either.
const SETSESSION_REFRESH_TOKEN_PLACEHOLDER = 'httponly-cookie-managed'

// Proactively refresh this many ms before the access_token's JWT `exp`.
const REFRESH_SKEW_MS = 60_000

/** Decode a JWT's `exp` claim (seconds since epoch) to ms, or null if not decodable. */
function decodeJwtExpMs(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const parsed = JSON.parse(json) as { exp?: number }
    if (typeof parsed.exp !== 'number') return null
    return parsed.exp * 1000
  } catch {
    return null
  }
}

export function useSessionRestore() {
  const store = useAuthStore()
  const timerRef = useRef<number | null>(null)

  const clearRefreshTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /** Arm (or re-arm) a timer that refreshes the access token shortly before it expires. */
  const scheduleProactiveRefresh = useCallback((accessToken: string) => {
    clearRefreshTimer()
    const expMs = decodeJwtExpMs(accessToken)
    if (expMs === null) return

    const delay = Math.max(expMs - Date.now() - REFRESH_SKEW_MS, 0)
    timerRef.current = window.setTimeout(async () => {
      const result = await refreshAccessToken()
      if (result.success && result.data?.access_token) {
        await supabase.auth.setSession({
          access_token: result.data.access_token,
          refresh_token: SETSESSION_REFRESH_TOKEN_PLACEHOLDER,
        })
        scheduleProactiveRefresh(result.data.access_token)
      }
      // On failure the httpOnly cookie has expired/been revoked — drop the
      // timer silently; the user is treated as signed out on next check.
    }, delay)
  }, [clearRefreshTimer])

  const restoreSession = useCallback(async (): Promise<void> => {
    store.setLoading(true)
    store.setError(null)
    try {
      const { data: { session: existingSession } } =
        await supabase.auth.getSession()

      if (existingSession?.user) {
        await hydrateProfile(existingSession.user.id)
        if (existingSession.access_token) {
          scheduleProactiveRefresh(existingSession.access_token)
        }
        return
      }

      const status = await fetchSessionStatus()
      if (!status.valid) {
        store.setUser(null)
        store.setProfile(null)
        store.setCompany(null)
        return
      }

      const refreshed = await refreshAccessToken()
      if (refreshed.success && refreshed.data?.access_token) {
        await supabase.auth.setSession({
          access_token: refreshed.data.access_token,
          refresh_token: SETSESSION_REFRESH_TOKEN_PLACEHOLDER,
        })

        const userId = refreshed.data.user?.id ?? status.user?.id
        if (userId) {
          await hydrateProfile(userId)
        }
        scheduleProactiveRefresh(refreshed.data.access_token)
        return
      }

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
  }, [store, scheduleProactiveRefresh])

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

  // Cancel any pending proactive-refresh timer on unmount so we never try to
  // refresh a session after the consuming component (and its store) is gone.
  useEffect(() => clearRefreshTimer, [clearRefreshTimer])

  return { restoreSession }
}
