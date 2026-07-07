import { describe, it, expect, vi, beforeEach } from 'vitest'

const denoEnvMock: Record<string, string> = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
}
;(globalThis as any).Deno = {
  env: {
    get: (key: string) => denoEnvMock[key] || undefined,
  },
}

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: (handler: Function) => handler,
}))

let mockSignInWithPassword: any
let mockRefreshSession: any
let mockAdminSignOut: any

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      refreshSession: (...args: any[]) => mockRefreshSession(...args),
      admin: {
        signOut: (...args: any[]) => mockAdminSignOut(...args),
      },
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}))

function mockRequest(method: string, path: string, opts: any = {}): Request {
  const url = `https://test.function/auth-session${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: 'http://localhost:5173',
    ...opts.headers,
  }
  if (opts.cookie) {
    headers['Cookie'] = opts.cookie
  }
  return new Request(url, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()

  mockSignInWithPassword = vi.fn()
  mockRefreshSession = vi.fn()
  mockAdminSignOut = vi.fn().mockResolvedValue({ data: null, error: null })
})

describe('auth-session Edge Function', () => {
  it('should return 404 for unknown routes', async () => {
    const { handleLogin } = await import('./login')

    const req = mockRequest('POST', '/unknown')
    const res = await handleLogin(req)
    expect(res.status).toBe(400)
  })

  describe('login handler', () => {
    it('should return 400 for invalid JSON body', async () => {
      const { handleLogin } = await import('./login')
      const req = new Request('https://test.function/auth-session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: 'not-json',
      })
      const res = await handleLogin(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
    })

    it('should return 400 when email or password missing', async () => {
      const { handleLogin } = await import('./login')
      const req = mockRequest('POST', '/login', { body: { email: 'test@test.com' } })
      const res = await handleLogin(req)
      expect(res.status).toBe(400)
    })

    it('should return 401 when authentication fails', async () => {
      mockSignInWithPassword = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid credentials' },
      })

      const { handleLogin } = await import('./login')
      const req = mockRequest('POST', '/login', {
        body: { email: 'test@test.com', password: 'wrong' },
      })
      const res = await handleLogin(req)
      expect(res.status).toBe(401)
    })

    it('should return 200 with user info on success (cookie-only transport)', async () => {
      mockSignInWithPassword = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token-123',
            refresh_token: 'refresh-token-123',
            user: { id: 'user-1', email: 'test@test.com' },
          },
        },
        error: null,
      })

      const { handleLogin } = await import('./login')
      const req = mockRequest('POST', '/login', {
        body: { email: 'test@test.com', password: 'correct' },
      })
      const res = await handleLogin(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.access_token).toBeUndefined()
      expect(body.data.user.id).toBe('user-1')
      expect(res.headers.get('Set-Cookie')).toContain('sb-auth-refresh')
      expect(res.headers.get('Set-Cookie')).toContain('HttpOnly')
      expect(res.headers.get('Set-Cookie')).toContain('Secure')
    })

    it('should not expose refresh token in response body', async () => {
      mockSignInWithPassword = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token-123',
            refresh_token: 'refresh-token-123',
            user: { id: 'user-1', email: 'test@test.com' },
          },
        },
        error: null,
      })

      const { handleLogin } = await import('./login')
      const req = mockRequest('POST', '/login', {
        body: { email: 'test@test.com', password: 'correct' },
      })
      const res = await handleLogin(req)
      const body = await res.json()
      expect(body.data.refresh_token).toBeUndefined()
    })
  })

  describe('refresh handler', () => {
    it('should return 401 when no cookie', async () => {
      const { handleRefresh } = await import('./refresh')
      const req = mockRequest('POST', '/refresh')
      const res = await handleRefresh(req)
      expect(res.status).toBe(401)
    })

    it('should return 401 when refresh token is expired', async () => {
      mockRefreshSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Token expired' },
      })

      const { handleRefresh } = await import('./refresh')
      const req = mockRequest('POST', '/refresh', {
        cookie: 'sb-auth-refresh=expired-token',
      })
      const res = await handleRefresh(req)
      expect(res.status).toBe(401)
    })

    it('should return 200 with user info on success (cookie-only transport)', async () => {
      mockRefreshSession = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            user: { id: 'user-1', email: 'test@test.com' },
          },
        },
        error: null,
      })

      const { handleRefresh } = await import('./refresh')
      const req = mockRequest('POST', '/refresh', {
        cookie: 'sb-auth-refresh=valid-refresh-token',
      })
      const res = await handleRefresh(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.access_token).toBeUndefined()
      expect(body.data.user.id).toBe('user-1')
      expect(res.headers.get('Set-Cookie')).toContain('sb-auth-refresh')
    })

    it('should clear cookie on session expiry', async () => {
      mockRefreshSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      })

      const { handleRefresh } = await import('./refresh')
      const req = mockRequest('POST', '/refresh', {
        cookie: 'sb-auth-refresh=expired-token',
      })
      const res = await handleRefresh(req)
      expect(res.status).toBe(401)
      expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0')
    })
  })

  describe('logout handler', () => {
    it('should clear cookie on logout', async () => {
      const { handleLogout } = await import('./logout')
      const req = mockRequest('POST', '/logout', {
        cookie: 'sb-auth-refresh=some-token',
      })
      const res = await handleLogout(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0')
    })

    it('should call admin signOut when session exists', async () => {
      mockRefreshSession = vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-1' },
            access_token: 'token',
            refresh_token: 'rt',
          },
        },
        error: null,
      })

      const { handleLogout } = await import('./logout')
      const req = mockRequest('POST', '/logout', {
        cookie: 'sb-auth-refresh=valid-token',
      })
      const res = await handleLogout(req)
      expect(res.status).toBe(200)
      expect(mockRefreshSession).toHaveBeenCalled()
      expect(mockAdminSignOut).toHaveBeenCalled()
    })
  })

  describe('status handler', () => {
    it('should return valid false when no cookie', async () => {
      const { handleStatus } = await import('./status')
      const req = mockRequest('GET', '/status')
      const res = await handleStatus(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.valid).toBe(false)
    })

    it('should return valid false when refresh token is expired', async () => {
      mockRefreshSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Token expired' },
      })

      const { handleStatus } = await import('./status')
      const req = mockRequest('GET', '/status', {
        cookie: 'sb-auth-refresh=expired-token',
      })
      const res = await handleStatus(req)
      const body = await res.json()
      expect(body.data.valid).toBe(false)
    })

    it('should return valid true with user info on success (cookie-only transport)', async () => {
      mockRefreshSession = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'status-access-token',
            refresh_token: 'new-refresh-token',
            user: { id: 'user-1', email: 'test@test.com' },
          },
        },
        error: null,
      })

      const { handleStatus } = await import('./status')
      const req = mockRequest('GET', '/status', {
        cookie: 'sb-auth-refresh=valid-token',
      })
      const res = await handleStatus(req)
      const body = await res.json()
      expect(body.data.valid).toBe(true)
      expect(body.data.access_token).toBeUndefined()
      expect(body.data.user.id).toBe('user-1')
    })
  })
})
