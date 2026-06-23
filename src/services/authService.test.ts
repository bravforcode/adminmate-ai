import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockSignInWithOAuth = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockUpdateUser = vi.fn()
const mockGetSession = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
  getSiteUrl: () => 'https://example.com',
}))

import { authService } from './authService'

const RATE_LIMIT_KEY = 'adminmate-login-rl:'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Clear all localStorage rate-limit entries
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k?.startsWith(RATE_LIMIT_KEY)) keys.push(k)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── signIn ─────────────────────────────────────────────
  describe('signIn', () => {
    it('should call supabase.auth.signInWithPassword with credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: { user: { id: '1' }, session: {} }, error: null })

      const result = await authService.signIn('test@example.com', 'password123')

      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' })
      expect(result.data.user).toEqual({ id: '1' })
    })

    it('should throw on auth error and record login attempt', async () => {
      const authError = new Error('Invalid login credentials')
      mockSignInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: authError })

      await expect(authService.signIn('test@example.com', 'wrong')).rejects.toThrow('Invalid login credentials')
      // Rate limit state should have been recorded
      const stored = window.localStorage.getItem(RATE_LIMIT_KEY + 'test@example.com')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.attempts).toBe(1)
    })

    it('should clear rate limit on successful sign-in', async () => {
      // Pre-populate a rate limit
      window.localStorage.setItem(
        RATE_LIMIT_KEY + 'test@example.com',
        JSON.stringify({ attempts: 3, lockedUntil: null, firstAttemptAt: Date.now() })
      )

      mockSignInWithPassword.mockResolvedValue({ data: { user: { id: '1' }, session: {} }, error: null })

      await authService.signIn('test@example.com', 'password123')

      expect(window.localStorage.getItem(RATE_LIMIT_KEY + 'test@example.com')).toBeNull()
    })

    it('should throw if rate limit is active', async () => {
      // Set a lockout that's still active
      window.localStorage.setItem(
        RATE_LIMIT_KEY + 'test@example.com',
        JSON.stringify({ attempts: 0, lockedUntil: Date.now() + 60000, firstAttemptAt: 0 })
      )

      await expect(authService.signIn('test@example.com', 'password123')).rejects.toThrow(/Too many login attempts/)
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it('should allow sign-in if lockout has expired', async () => {
      // Set a lockout in the past
      window.localStorage.setItem(
        RATE_LIMIT_KEY + 'test@example.com',
        JSON.stringify({ attempts: 0, lockedUntil: Date.now() - 1000, firstAttemptAt: 0 })
      )

      mockSignInWithPassword.mockResolvedValue({ data: { user: { id: '1' }, session: {} }, error: null })

      await authService.signIn('test@example.com', 'password123')
      expect(mockSignInWithPassword).toHaveBeenCalled()
    })

    it('should lockout after max attempts (5)', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error('Bad credentials') })

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await authService.signIn('test@example.com', 'wrong').catch(() => {})
      }

      // 6th attempt should be blocked
      await expect(authService.signIn('test@example.com', 'wrong')).rejects.toThrow(/Too many login attempts/)
    })
  })

  // ─── signUp ─────────────────────────────────────────────
  describe('signUp', () => {
    it('should call supabase.auth.signUp with correct params', async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: 'new' }, session: null }, error: null })

      const result = await authService.signUp({
        email: 'new@example.com',
        password: 'securePass1',
        options: { data: { full_name: 'Test' } },
      })

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'securePass1',
        options: {
          data: { full_name: 'Test' },
          emailRedirectTo: 'https://example.com/login',
        },
      })
      expect(result.data.user).toEqual({ id: 'new' })
    })

    it('should throw on sign-up error', async () => {
      const err = new Error('User already registered')
      mockSignUp.mockResolvedValue({ data: { user: null }, error: err })

      await expect(
        authService.signUp({ email: 'dup@example.com', password: 'pass' })
      ).rejects.toThrow('User already registered')
    })
  })

  // ─── signOut ────────────────────────────────────────────
  describe('signOut', () => {
    it('should call supabase.auth.signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null })
      await authService.signOut()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should throw on signOut error', async () => {
      mockSignOut.mockResolvedValue({ error: new Error('Sign out failed') })
      await expect(authService.signOut()).rejects.toThrow('Sign out failed')
    })
  })

  // ─── signInWithGoogle ───────────────────────────────────
  describe('signInWithGoogle', () => {
    it('should call signInWithOAuth with google provider', async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null })
      await authService.signInWithGoogle()
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'https://example.com/auth/callback' },
      })
    })

    it('should throw on google sign-in error', async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: new Error('Provider not enabled') })
      await expect(authService.signInWithGoogle()).rejects.toThrow('Provider not enabled')
    })
  })

  // ─── resetPassword ──────────────────────────────────────
  describe('resetPassword', () => {
    it('should call resetPasswordForEmail with redirect', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null })
      await authService.resetPassword('user@example.com')
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
        redirectTo: 'https://example.com/reset-password',
      })
    })

    it('should throw on reset error', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: new Error('Email not found') })
      await expect(authService.resetPassword('bad@example.com')).rejects.toThrow('Email not found')
    })
  })

  // ─── updatePassword ─────────────────────────────────────
  describe('updatePassword', () => {
    it('should call updateUser with new password', async () => {
      mockUpdateUser.mockResolvedValue({ error: null })
      await authService.updatePassword('newPass123')
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPass123' })
    })

    it('should throw on update error', async () => {
      mockUpdateUser.mockResolvedValue({ error: new Error('Update failed') })
      await expect(authService.updatePassword('bad')).rejects.toThrow('Update failed')
    })
  })

  // ─── getSession ─────────────────────────────────────────
  describe('getSession', () => {
    it('should return the session', async () => {
      const fakeSession = { user: { id: '1' }, access_token: 'tok' }
      mockGetSession.mockResolvedValue({ data: { session: fakeSession }, error: null })
      const session = await authService.getSession()
      expect(session).toEqual(fakeSession)
    })

    it('should throw on session error', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: new Error('No session') })
      await expect(authService.getSession()).rejects.toThrow('No session')
    })
  })
})
