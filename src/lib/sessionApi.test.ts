import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

const EDGE_URL = 'https://test.supabase.co/functions/v1/auth-session'
vi.mock('../../env', () => ({
  default: { VITE_SUPABASE_URL: 'https://test.supabase.co' },
}))

vi.mock('../lib/sessionApi', async () => {
  const actual = await vi.importActual('../lib/sessionApi')
  return actual
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchSessionStatus', () => {
  it('should return valid false when response is not successful', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false }),
    })

    const { fetchSessionStatus } = await import('./sessionApi')
    const result = await fetchSessionStatus()
    expect(result.valid).toBe(false)
  })

  it('should return valid false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { fetchSessionStatus } = await import('./sessionApi')
    const result = await fetchSessionStatus()
    expect(result.valid).toBe(false)
  })

  it('should return valid false when upstream returns non-json content', async () => {
    mockFetch.mockResolvedValueOnce({
      headers: {
        get: () => 'text/html',
      },
    })

    const { fetchSessionStatus } = await import('./sessionApi')
    const result = await fetchSessionStatus()
    expect(result.valid).toBe(false)
  })

  it('should return valid true with tokens when successful', async () => {
    mockFetch.mockResolvedValueOnce({
      headers: {
        get: () => 'application/json; charset=utf-8',
      },
      json: () => Promise.resolve({
        success: true,
        data: {
          valid: true,
          access_token: 'test-access-token',
          user: { id: 'user-1', email: 'test@test.com' },
        },
      }),
    })

    const { fetchSessionStatus } = await import('./sessionApi')
    const result = await fetchSessionStatus()
    expect(result.valid).toBe(true)
    expect(result.access_token).toBe('test-access-token')
    expect(result.user?.id).toBe('user-1')
  })
})

describe('refreshAccessToken', () => {
  it('should return success true with tokens when valid', async () => {
    mockFetch.mockResolvedValueOnce({
      headers: {
        get: () => 'application/json; charset=utf-8',
      },
      json: () => Promise.resolve({
        success: true,
        data: {
          access_token: 'new-access-token',
          user: { id: 'user-1', email: 'test@test.com' },
        },
      }),
    })

    const { refreshAccessToken } = await import('./sessionApi')
    const result = await refreshAccessToken()
    expect(result.success).toBe(true)
    expect(result.data?.access_token).toBe('new-access-token')
  })

  it('should return success false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { refreshAccessToken } = await import('./sessionApi')
    const result = await refreshAccessToken()
    expect(result.success).toBe(false)
  })
})

describe('loginViaEdge', () => {
  it('should send email and password to login endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      headers: {
        get: () => 'application/json; charset=utf-8',
      },
      json: () => Promise.resolve({
        success: true,
        data: {
          access_token: 'login-access-token',
          user: { id: 'user-1', email: 'test@test.com' },
        },
      }),
    })

    const { loginViaEdge } = await import('./sessionApi')
    const result = await loginViaEdge('test@test.com', 'password123')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/login'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'test@test.com', password: 'password123' }),
      })
    )
    expect(result.success).toBe(true)
    expect(result.data?.access_token).toBe('login-access-token')
  })

  it('should return success false on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { loginViaEdge } = await import('./sessionApi')
    const result = await loginViaEdge('test@test.com', 'password123')
    expect(result.success).toBe(false)
  })
})

describe('logoutViaEdge', () => {
  it('should call logout endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      headers: {
        get: () => 'application/json; charset=utf-8',
      },
      json: () => Promise.resolve({ success: true }),
    })

    const { logoutViaEdge } = await import('./sessionApi')
    await logoutViaEdge()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/logout'),
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
  })

  it('should not throw on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { logoutViaEdge } = await import('./sessionApi')
    await expect(logoutViaEdge()).resolves.toBeUndefined()
  })
})
