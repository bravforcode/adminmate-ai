const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-session`
  : '/api/auth-session'

const SESSION_API_TIMEOUT_MS = 5000

async function fetchJson(path: string, init: RequestInit): Promise<any | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), SESSION_API_TIMEOUT_MS)

  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}${path}`, {
      ...init,
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
  access_token?: string
  user?: { id: string; email?: string }
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
    access_token?: string
    user?: { id: string; email?: string }
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
    access_token?: string
    user?: { id: string; email?: string }
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
