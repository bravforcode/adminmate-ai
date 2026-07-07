import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock supabase methods
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

import { useAuthStore, useAuthLoading, useAuthError } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear dedup promise so initSession runs fresh each test
    useAuthStore.getState().resetSessionInit()
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      profile: null,
      company: null,
      isLoading: false,
      error: null,
      _langPref: 'en',
    })
  })

  // ─── Basic setters ──────────────────────────────────────
  describe('setters', () => {
    it('setUser should update user', () => {
      const user = { id: 'u1', email: 'test@example.com' } as any
      useAuthStore.getState().setUser(user)
      expect(useAuthStore.getState().user).toEqual(user)
    })

    it('setProfile should update profile', () => {
      const profile = { id: 'p1', email: 'a@b.com', full_name: 'Test', role: 'admin', language_preference: 'en', is_active: true } as any
      useAuthStore.getState().setProfile(profile)
      expect(useAuthStore.getState().profile).toEqual(profile)
    })

    it('setCompany should update company', () => {
      const company = { id: 'c1', name: 'Acme', country: 'TH', currency: 'THB', locale: 'th-TH' } as any
      useAuthStore.getState().setCompany(company)
      expect(useAuthStore.getState().company).toEqual(company)
    })

    it('setLoading should update isLoading', () => {
      useAuthStore.getState().setLoading(true)
      expect(useAuthStore.getState().isLoading).toBe(true)
    })

    it('setError should update error', () => {
      useAuthStore.getState().setError('Something went wrong')
      expect(useAuthStore.getState().error).toBe('Something went wrong')
    })
  })

  // ─── Computed getters ───────────────────────────────────
  describe('computed getters', () => {
    it('isAuthenticated returns false when no user', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    })

    it('isAuthenticated returns true when user is set', () => {
      useAuthStore.getState().setUser({ id: 'u1' } as any)
      expect(useAuthStore.getState().isAuthenticated()).toBe(true)
    })

    it('isAdminOrHR returns false when no profile', () => {
      expect(useAuthStore.getState().isAdminOrHR()).toBe(false)
    })

    it('isAdminOrHR returns true for admin role', () => {
      useAuthStore.getState().setProfile({ id: 'p1', role: 'admin' } as any)
      expect(useAuthStore.getState().isAdminOrHR()).toBe(true)
    })

    it('isAdminOrHR returns true for hr role', () => {
      useAuthStore.getState().setProfile({ id: 'p1', role: 'hr' } as any)
      expect(useAuthStore.getState().isAdminOrHR()).toBe(true)
    })

    it('isAdminOrHR returns false for other roles', () => {
      useAuthStore.getState().setProfile({ id: 'p1', role: 'viewer' } as any)
      expect(useAuthStore.getState().isAdminOrHR()).toBe(false)
    })

    it('hasCompany returns false when no company', () => {
      expect(useAuthStore.getState().hasCompany()).toBe(false)
    })

    it('hasCompany returns true when company is set', () => {
      useAuthStore.getState().setCompany({ id: 'c1' } as any)
      expect(useAuthStore.getState().hasCompany()).toBe(true)
    })

    it('userLanguage returns _langPref by default', () => {
      expect(useAuthStore.getState().userLanguage()).toBe('en')
    })

    it('userLanguage falls back to profile language_preference', () => {
      useAuthStore.setState({ _langPref: '' })
      useAuthStore.getState().setProfile({ id: 'p1', language_preference: 'fr' } as any)
      expect(useAuthStore.getState().userLanguage()).toBe('fr')
    })

    it('userLanguage falls back to company locale prefix', () => {
      useAuthStore.setState({ _langPref: '' })
      useAuthStore.getState().setProfile(null as any)
      useAuthStore.getState().setCompany({ id: 'c1', locale: 'vi-VN' } as any)
      expect(useAuthStore.getState().userLanguage()).toBe('vi')
    })

    it('userLanguage falls back to en when nothing is set', () => {
      useAuthStore.setState({ _langPref: '' })
      useAuthStore.getState().setProfile(null as any)
      useAuthStore.getState().setCompany(null as any)
      expect(useAuthStore.getState().userLanguage()).toBe('en')
    })
  })

  // ─── initSession ────────────────────────────────────────
  describe('initSession', () => {
    it('should set user when session exists', async () => {
      const fakeUser = { id: 'u1', email: 'a@b.com' }
      mockGetSession.mockResolvedValue({
        data: { session: { user: fakeUser } },
        error: null,
      })
      const profileChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'p1', company_id: null, language_preference: 'th' } }),
      }
      mockSupabaseFrom.mockReturnValue(profileChain)

      await useAuthStore.getState().initSession()

      expect(useAuthStore.getState().user).toEqual(fakeUser)
      expect(useAuthStore.getState().profile?.language_preference).toBe('th')
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should clear state when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

      useAuthStore.setState({ user: { id: 'old' } as any })
      await useAuthStore.getState().initSession()

      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().profile).toBeNull()
      expect(useAuthStore.getState().company).toBeNull()
    })

    it('should handle session error', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: new Error('Session expired') })

      await useAuthStore.getState().initSession()

      expect(useAuthStore.getState().error).toBe('Session expired')
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should load company when profile has company_id', async () => {
      const fakeUser = { id: 'u2' }
      mockGetSession.mockResolvedValue({ data: { session: { user: fakeUser } }, error: null })

      const profileChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: { id: 'p2', company_id: 'c1', language_preference: 'en' } })
          .mockResolvedValueOnce({ data: { id: 'c1', name: 'Acme' } }),
      }
      mockSupabaseFrom.mockReturnValue(profileChain)

      await useAuthStore.getState().initSession()

      expect(useAuthStore.getState().company).toEqual({ id: 'c1', name: 'Acme' })
    })

    it('should deduplicate concurrent initSession calls', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

      // Call twice concurrently — resetSessionInit already called in beforeEach
      await Promise.all([
        useAuthStore.getState().initSession(),
        useAuthStore.getState().initSession(),
      ])

      // getSession should only be called once due to dedup
      expect(mockGetSession).toHaveBeenCalledTimes(1)
    })
  })

  // ─── reset ──────────────────────────────────────────────
  describe('reset', () => {
    it('should clear all state', () => {
      useAuthStore.setState({
        user: { id: 'u1' } as any,
        profile: { id: 'p1', role: 'admin' } as any,
        company: { id: 'c1' } as any,
        error: 'some error',
        isLoading: true,
        _langPref: 'th',
      })

      useAuthStore.getState().reset()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.profile).toBeNull()
      expect(state.company).toBeNull()
      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state._langPref).toBe('en')
    })
  })

  // ─── initDemo ───────────────────────────────────────────
  describe('initDemo', () => {
    it('should set language to th', () => {
      useAuthStore.getState().initDemo()
      expect(useAuthStore.getState()._langPref).toBe('th')
    })
  })

  // ─── subscribeAuth ──────────────────────────────────────
  describe('subscribeAuth', () => {
    it('should call onAuthStateChange and return unsubscribe function', () => {
      mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

      const unsub = useAuthStore.getState().subscribeAuth()
      expect(typeof unsub).toBe('function')
      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })
  })

  // ─── useAuthLoading / useAuthError (React hooks) ────────
  describe('useAuthLoading', () => {
    it('should return isLoading state', () => {
      useAuthStore.setState({ isLoading: true })
      const { result } = renderHook(() => useAuthLoading())
      expect(result.current).toBe(true)
    })

    it('should return false when not loading', () => {
      useAuthStore.setState({ isLoading: false })
      const { result } = renderHook(() => useAuthLoading())
      expect(result.current).toBe(false)
    })
  })

  describe('useAuthError', () => {
    it('should return error state', () => {
      useAuthStore.setState({ error: 'Network error' })
      const { result } = renderHook(() => useAuthError())
      expect(result.current).toBe('Network error')
    })

    it('should return null when no error', () => {
      useAuthStore.setState({ error: null })
      const { result } = renderHook(() => useAuthError())
      expect(result.current).toBeNull()
    })
  })
})
