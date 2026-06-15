import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    getSession: vi.fn(),
  },
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase, getSiteUrl: () => 'http://localhost' }))

import { authService } from '../../../src/services/authService'

describe('authService', () => {
  const email = 'test@test.com'
  const password = 'TestPass123!'

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  describe('signIn — rate limiting', () => {
    it('calls signInWithPassword on first attempt', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

      const result = await authService.signIn(email, password)

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({ email, password })
      expect(result.data).toEqual({ user: { id: 'u1' } })
    })

    it('throws rate limit error after 5 failed attempts', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('Invalid credentials') })

      for (let i = 0; i < 5; i++) {
        await expect(authService.signIn(email, password)).rejects.toThrow('Invalid credentials')
      }

      await expect(authService.signIn(email, password)).rejects.toThrow('Too many login attempts')
    })

    it('clears rate limit on successful login', async () => {
      mockSupabase.auth.signInWithPassword
        .mockResolvedValueOnce({ data: null, error: new Error('Invalid') })
        .mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null })

      await expect(authService.signIn(email, password)).rejects.toThrow('Invalid')
      const result = await authService.signIn(email, password)
      expect(result.data).toEqual({ user: { id: 'u1' } })
    })

    it('allows login after lockout window resets (simulated via localStorage clear)', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('Invalid') })

      for (let i = 0; i < 5; i++) {
        await expect(authService.signIn(email, password)).rejects.toThrow('Invalid')
      }

      await expect(authService.signIn(email, password)).rejects.toThrow('Too many login attempts')

      window.localStorage.clear()

      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
      const result = await authService.signIn(email, password)
      expect(result.data).toEqual({ user: { id: 'u1' } })
    })

    it('uses different rate limit key per email', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('Invalid') })

      for (let i = 0; i < 5; i++) {
        await expect(authService.signIn('attacker@test.com', password)).rejects.toThrow('Invalid')
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null })
      const result = await authService.signIn('victim@test.com', password)
      expect(result.data).toEqual({ user: { id: 'u2' } })
    })
  })

  describe('signUp', () => {
    it('calls supabase signUp with redirect', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

      await authService.signUp({ email, password })

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
        options: { data: undefined, emailRedirectTo: 'http://localhost/login' },
      })
    })

    it('throws on signUp error', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({ data: null, error: new Error('Email taken') })

      await expect(authService.signUp({ email, password })).rejects.toThrow('Email taken')
    })
  })

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      await authService.signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('throws on signOut error', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: new Error('Session not found') })

      await expect(authService.signOut()).rejects.toThrow('Session not found')
    })
  })

  describe('signInWithGoogle', () => {
    it('calls supabase OAuth with google provider', async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null })

      await authService.signInWithGoogle()

      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'http://localhost/dashboard' },
      })
    })
  })

  describe('resetPassword', () => {
    it('calls resetPasswordForEmail', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

      await authService.resetPassword(email)

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
        redirectTo: 'http://localhost/reset-password',
      })
    })
  })

  describe('updatePassword', () => {
    it('calls updateUser with new password', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ data: null, error: null })

      await authService.updatePassword('NewPass123!')

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewPass123!' })
    })
  })

  describe('getSession', () => {
    it('returns session data', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })

      const session = await authService.getSession()
      expect(session).toEqual({ user: { id: 'u1' } })
    })

    it('returns null when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

      const session = await authService.getSession()
      expect(session).toBeNull()
    })
  })
})
