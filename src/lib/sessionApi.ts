const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-session`
  : '/api/auth-session'

export async function fetchSessionStatus(): Promise<{
  valid: boolean
  access_token?: string
  user?: { id: string; email?: string }
}> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}/status`, {
      method: 'GET',
      credentials: 'include',
    })
    const json = await res.json()
    if (!json.success) return { valid: false }
    return json.data
  } catch {
    return { valid: false }
  }
}

export async function refreshAccessToken(): Promise<{
  success: boolean
  data?: {
    access_token?: string
    user?: { id: string; email?: string }
  }
  error?: string
}> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    return await res.json()
  } catch {
    return { success: false }
  }
}

export async function loginViaEdge(email: string, password: string): Promise<{
  success: boolean
  data?: {
    access_token?: string
    user?: { id: string; email?: string }
  }
  error?: string
}> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    return await res.json()
  } catch {
    return { success: false }
  }
}

export async function logoutViaEdge(): Promise<void> {
  try {
    await fetch(`${EDGE_FUNCTION_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Non-critical
  }
}
