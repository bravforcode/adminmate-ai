import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null })
const mockSetSession = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      setSession: (...args: any[]) => mockSetSession(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}))

vi.mock('../lib/sessionApi', () => ({
  fetchSessionStatus: vi.fn(),
  refreshAccessToken: vi.fn(),
}))

const mockSetUser = vi.fn()
const mockSetProfile = vi.fn()
const mockSetCompany = vi.fn()
const mockSetLoading = vi.fn()
const mockSetError = vi.fn()

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    setUser: (...args: any[]) => mockSetUser(...args),
    setProfile: (...args: any[]) => mockSetProfile(...args),
    setCompany: (...args: any[]) => mockSetCompany(...args),
    setLoading: (...args: any[]) => mockSetLoading(...args),
    setError: (...args: any[]) => mockSetError(...args),
  }),
}))

function createChain(overrides: Record<string, any> = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockFrom.mockReturnValue(createChain())
})

describe('useSessionRestore', () => {
  it('should set loading true at start', async () => {
    // getSession returns null → no session
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { fetchSessionStatus } = await import('../lib/sessionApi')
    vi.mocked(fetchSessionStatus).mockResolvedValue({ valid: false })

    const { useSessionRestore } = await import('./useSessionRestore')
    const { result } = renderHook(() => useSessionRestore())
    await result.current.restoreSession()

    expect(mockSetLoading).toHaveBeenCalledWith(true)
  })

  it('should clear user when no valid session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { fetchSessionStatus } = await import('../lib/sessionApi')
    vi.mocked(fetchSessionStatus).mockResolvedValue({ valid: false })

    const { useSessionRestore } = await import('./useSessionRestore')
    const { result } = renderHook(() => useSessionRestore())
    await result.current.restoreSession()

    expect(mockSetUser).toHaveBeenCalledWith(null)
    expect(mockSetProfile).toHaveBeenCalledWith(null)
    expect(mockSetCompany).toHaveBeenCalledWith(null)
  })

  it('should hydrate profile when existing session found via getSession', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'test@test.com' },
        },
      },
      error: null,
    })

    mockFrom.mockReturnValue(
      createChain({
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'user-1',
            email: 'test@test.com',
            full_name: 'Test User',
            role: 'admin',
            company_id: 'company-1',
            language_preference: 'en',
            is_active: true,
          },
          error: null,
        }).mockResolvedValueOnce({
          data: {
            id: 'company-1',
            name: 'Test Company',
            country: 'TH',
            currency: 'THB',
            locale: 'th-TH',
          },
          error: null,
        }),
      })
    )

    const { useSessionRestore } = await import('./useSessionRestore')
    const { result } = renderHook(() => useSessionRestore())
    await result.current.restoreSession()

    expect(mockSetProfile).toHaveBeenCalled()
    expect(mockSetCompany).toHaveBeenCalled()
    expect(mockSetUser).toHaveBeenCalled()
  })

  it('should restore session via refresh + setSession when no local session but cookie is valid', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { fetchSessionStatus, refreshAccessToken } = await import('../lib/sessionApi')
    vi.mocked(fetchSessionStatus).mockResolvedValue({
      valid: true,
      user: { id: 'user-1', email: 'test@test.com' },
    })
    vi.mocked(refreshAccessToken).mockResolvedValue({
      success: true,
      data: {
        access_token: 'refreshed-access-token',
        user: { id: 'user-1', email: 'test@test.com' },
      },
    })

    mockFrom.mockReturnValue(
      createChain({
        maybeSingle: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'user-1',
            email: 'test@test.com',
            full_name: 'Test User',
            role: 'admin',
            company_id: 'company-1',
            language_preference: 'en',
            is_active: true,
          },
          error: null,
        }).mockResolvedValueOnce({
          data: {
            id: 'company-1',
            name: 'Test Company',
            country: 'TH',
            currency: 'THB',
            locale: 'th-TH',
          },
          error: null,
        }),
      })
    )

    const { useSessionRestore } = await import('./useSessionRestore')
    const { result } = renderHook(() => useSessionRestore())
    await result.current.restoreSession()

    expect(refreshAccessToken).toHaveBeenCalled()
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: 'refreshed-access-token',
        refresh_token: expect.any(String),
      })
    )
    expect(mockSetProfile).toHaveBeenCalled()
    expect(mockSetUser).toHaveBeenCalled()
  })

  it('should handle network errors gracefully', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'))

    const { useSessionRestore } = await import('./useSessionRestore')
    const { result } = renderHook(() => useSessionRestore())
    await result.current.restoreSession()

    expect(mockSetError).toHaveBeenCalled()
    expect(mockSetUser).toHaveBeenCalledWith(null)
  })

  it('should set loading false when done', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    const { fetchSessionStatus } = await import('../lib/sessionApi')
    vi.mocked(fetchSessionStatus).mockResolvedValue({ valid: false })

    const { useSessionRestore } = await import('./useSessionRestore')
    const { result } = renderHook(() => useSessionRestore())
    await result.current.restoreSession()

    const calls = mockSetLoading.mock.calls
    expect(calls[calls.length - 1][0]).toBe(false)
  })
})
