import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ─── Mocks ──────────────────────────────────────────────────
const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSignOut = vi.fn()
const mockSignInWithGoogle = vi.fn()

vi.mock('../services/authService', () => ({
  authService: {
    signIn: (...args: unknown[]) => mockSignIn(...args),
    signUp: (...args: unknown[]) => mockSignUp(...args),
    signOut: (...args: unknown[]) => mockSignOut(...args),
    signInWithGoogle: (...args: unknown[]) => mockSignInWithGoogle(...args),
  },
}))

const mockCompanyCreate = vi.fn()
vi.mock('../services/companyService', () => ({
  companyService: {
    create: (...args: unknown[]) => mockCompanyCreate(...args),
  },
}))

const mockSupabaseFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

import { getDefaultRoute, useAuth } from './useAuth'

describe('getDefaultRoute', () => {
  it('should always return /dashboard', () => {
    expect(getDefaultRoute()).toBe('/dashboard')
    expect(getDefaultRoute('admin')).toBe('/dashboard')
    expect(getDefaultRoute('hr')).toBe('/dashboard')
    expect(getDefaultRoute(null)).toBe('/dashboard')
  })
})

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── login ──────────────────────────────────────────────
  describe('login', () => {
    it('should call authService.signIn and set user on success', async () => {
      const fakeUser = { id: 'u1', email: 'test@example.com' }
      mockSignIn.mockResolvedValue({ data: { user: fakeUser, session: {} } })
      // Mock profile chain
      const profileChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }
      mockSupabaseFrom.mockReturnValue(profileChain)

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.login('test@example.com', 'pass123')
      })

      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'pass123')
    })

    it('should propagate signIn errors', async () => {
      mockSignIn.mockRejectedValue(new Error('Invalid credentials'))

      const { result } = renderHook(() => useAuth())

      await expect(
        act(async () => {
          await result.current.login('bad@example.com', 'wrong')
        })
      ).rejects.toThrow('Invalid credentials')
    })
  })

  // ─── register ───────────────────────────────────────────
  describe('register', () => {
    it('should return needsEmailVerification when no session', async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: 'u2' }, session: null } })

      const { result } = renderHook(() => useAuth())

      let res: any
      await act(async () => {
        res = await result.current.register({
          email: 'new@example.com',
          password: 'pass',
          fullName: 'New User',
          companyName: 'New Co',
        })
      })

      expect(res.needsEmailVerification).toBe(true)
      expect(res.hasCompany).toBe(false)
    })

    it('should create company when session exists', async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: 'u3' }, session: { access_token: 'tok' } } })
      mockCompanyCreate.mockResolvedValue({ id: 'c1', name: 'Test Co' })

      // Mock supabase.from calls in order:
      // 1st: user_profiles update (link company to user)
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      // 2nd: user_profiles select (loadProfile)
      const profileChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'u3', company_id: 'c1' } }),
      }
      // 3rd: companies select (loadProfile company)
      const companyChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'Test Co' } }),
      }
      mockSupabaseFrom
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(companyChain)

      const { result } = renderHook(() => useAuth())

      let res: any
      await act(async () => {
        res = await result.current.register({
          email: 'new@example.com',
          password: 'pass',
          fullName: 'New User',
          companyName: 'Test Co',
          country: 'TH',
          industry: 'Tech',
        })
      })

      expect(res.needsEmailVerification).toBe(false)
      expect(res.hasCompany).toBe(true)
      expect(mockCompanyCreate).toHaveBeenCalledWith({
        name: 'Test Co',
        industry: 'Tech',
        country: 'TH',
      })
    })

    it('should set hasCompany to false if company creation fails', async () => {
      mockSignUp.mockResolvedValue({ data: { user: { id: 'u4' }, session: { access_token: 'tok' } } })
      mockCompanyCreate.mockRejectedValue(new Error('Company exists'))

      // Mock loadProfile chain
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })

      const { result } = renderHook(() => useAuth())

      let res: any
      await act(async () => {
        res = await result.current.register({
          email: 'fail@example.com',
          password: 'pass',
          fullName: 'Fail User',
          companyName: 'Fail Co',
        })
      })

      expect(res.hasCompany).toBe(false)
    })
  })

  // ─── logout ─────────────────────────────────────────────
  describe('logout', () => {
    it('should call signOut and reset store', async () => {
      mockSignOut.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.logout()
      })

      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  // ─── loginWithGoogle ────────────────────────────────────
  describe('loginWithGoogle', () => {
    it('should call signInWithGoogle on success', async () => {
      mockSignInWithGoogle.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.loginWithGoogle()
      })

      expect(mockSignInWithGoogle).toHaveBeenCalled()
    })

    it('should throw a friendly error for unsupported provider', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('provider is not enabled'))

      const { result } = renderHook(() => useAuth())

      await expect(
        act(async () => {
          await result.current.loginWithGoogle()
        })
      ).rejects.toThrow('Google Sign-In is not enabled')
    })

    it('should throw a friendly error for unsupported provider message', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('unsupported provider'))

      const { result } = renderHook(() => useAuth())

      await expect(
        act(async () => {
          await result.current.loginWithGoogle()
        })
      ).rejects.toThrow('Google Sign-In is not enabled')
    })

    it('should rethrow non-provider errors', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      await expect(
        act(async () => {
          await result.current.loginWithGoogle()
        })
      ).rejects.toThrow('Network error')
    })
  })
})
