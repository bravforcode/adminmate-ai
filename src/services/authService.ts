import { supabase, getSiteUrl } from '../lib/supabase'
import type { AuthResponse, SignUpWithPasswordCredentials } from '@supabase/supabase-js'

const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 30 * 60 * 1000,
}

const STORAGE_PREFIX = 'adminmate-login-rl:'

interface LoginRateLimitState {
  attempts: number
  lockedUntil: number | null
  firstAttemptAt: number
}

function readRateLimit(email: string): LoginRateLimitState {
  if (typeof window === 'undefined') {
    return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + email)
    if (!raw) return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
    const parsed = JSON.parse(raw) as LoginRateLimitState
    if (parsed.lockedUntil && parsed.lockedUntil < Date.now()) {
      return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
    }
    if (parsed.firstAttemptAt && Date.now() - parsed.firstAttemptAt > LOGIN_RATE_LIMIT.windowMs) {
      return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
    }
    return parsed
  } catch {
    return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
  }
}

function writeRateLimit(email: string, state: LoginRateLimitState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + email, JSON.stringify(state))
  } catch { /* localStorage may be full or unavailable */ }
}

function clearRateLimit(email: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + email)
  } catch { /* localStorage may be unavailable */ }
}

function checkLoginRateLimit(email: string): void {
  const state = readRateLimit(email)
  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    const remaining = Math.ceil((state.lockedUntil - Date.now()) / 1000)
    throw new Error(`Too many login attempts. Please try again in ${remaining} seconds.`)
  }
  // Note: Server-side rate limiting is the actual security control.
  // Client-side is only for UX feedback (showing lockout state).
}

function recordLoginAttempt(email: string): void {
  const state = readRateLimit(email)
  const next: LoginRateLimitState = {
    attempts: state.attempts + 1,
    lockedUntil: null,
    firstAttemptAt: state.firstAttemptAt || Date.now(),
  }
  if (next.attempts >= LOGIN_RATE_LIMIT.maxAttempts) {
    next.lockedUntil = Date.now() + LOGIN_RATE_LIMIT.lockoutMs
    next.attempts = 0
    next.firstAttemptAt = 0
  }
  writeRateLimit(email, next)
}

export const authService = {
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    checkLoginRateLimit(email)
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) {
      recordLoginAttempt(email)
      throw result.error
    }
    clearRateLimit(email)
    return result
  },

  signUp: async (credentials: SignUpWithPasswordCredentials): Promise<AuthResponse> => {
    const creds = credentials as { email: string; password: string; options?: { data?: Record<string, unknown> } }
    const result = await supabase.auth.signUp({
      email: creds.email,
      password: creds.password,
      options: {
        data: creds.options?.data,
        emailRedirectTo: `${getSiteUrl()}/login`,
      },
    })
    if (result.error) throw result.error
    return result
  },

  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  signInWithGoogle: async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${getSiteUrl()}/auth/callback` },
    })
    if (error) throw error
  },

  resetPassword: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    })
    if (error) throw error
  },

  updatePassword: async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },
}
