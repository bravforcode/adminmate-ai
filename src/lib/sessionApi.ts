const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-session`
  : '/api/auth-session'

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// Placeholder passed as the `refresh_token` argument to supabase.auth.setSession().
// setSession() requires a non-empty string for both arguments, but the real
// refresh_token is httpOnly-cookie-only and never available to client JS.
// This is safe: per @supabase/auth-js's GoTrueClient._setSession, the passed
// refresh_token is only ever used to call the SDK's internal token-refresh
// endpoint if the *access_token* it's given has already expired. Callers only
// use this placeholder immediately after a successful /login or /refresh, so
// the access_token is always freshly minted and unexpired — the safe
// (non-refreshing) code path is taken and this placeholder is stored locally
// but never sent over the wire. autoRefreshToken is also disabled, so
// nothing else in the SDK will ever attempt to use it either.
export const SETSESSION_REFRESH_TOKEN_PLACEHOLDER = 'httponly-cookie-managed'

const SESSION_API_TIMEOUT_MS = 5000

async function fetchJson(path: string, init: RequestInit): Promise<any | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), SESSION_API_TIMEOUT_MS)

  try {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
    }
    if (ANON_KEY) {
      headers['Authorization'] = `Bearer ${ANON_KEY}`
    }

    const res = await fetch(`${EDGE_FUNCTION_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return null
    }

    return await res.json()
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function fetchSessionStatus(): Promise<{
  valid: boolean
  user?: { id: string; email?: string }
  access_token?: string
}> {
  const json = await fetchJson('/status', {
    method: 'GET',
    credentials: 'include',
  })

  if (!json?.success) {
    return { valid: false }
  }

  return json.data
}

export async function refreshAccessToken(): Promise<{
  success: boolean
  data?: {
    user?: { id: string; email?: string }
    access_token?: string
  }
  error?: string
}> {
  const json = await fetchJson('/refresh', {
    method: 'POST',
    credentials: 'include',
  })

  if (!json) {
    return { success: false }
  }

  return json
}

export async function loginViaEdge(email: string, password: string): Promise<{
  success: boolean
  data?: {
    user?: { id: string; email?: string }
    access_token?: string
  }
  error?: string
}> {
  const json = await fetchJson('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  if (!json) {
    return { success: false }
  }

  return json
}

export async function logoutViaEdge(): Promise<void> {
  await fetchJson('/logout', {
    method: 'POST',
    credentials: 'include',
  })
}
