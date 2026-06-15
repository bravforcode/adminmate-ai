import { describe, it, expect, vi, beforeEach } from 'vitest'

const denoEnvMock: Record<string, string> = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
}
;(globalThis as any).Deno = {
  env: { get: (key: string) => denoEnvMock[key] || undefined },
}

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: (handler: Function) => handler,
}))

let mockListFactors: any

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: () => ({
    auth: {
      admin: {
        mfa: {
          listFactors: (...args: any[]) => mockListFactors(...args),
        },
      },
    },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockListFactors = vi.fn().mockResolvedValue({
    data: { all: [], totp: [], phone: [] },
    error: null,
  })
})

describe('auth-hook-mfa', () => {
  it('should accept login when no MFA factors exist', async () => {
    const { handleAuthHook } = await import('./index.ts')
    const req = new Request('https://test.function/auth-hook-mfa', {
      method: 'POST',
      body: JSON.stringify({
        user: { id: 'user-123', email: 'test@test.com', aal: 'aal1' },
        action: 'AUTH_LOGIN',
      }),
    })
    const res = await handleAuthHook(req)
    const body = await res.json()
    expect(body.decision).toBe('accept')
  })

  it('should accept login when user has no verified factors', async () => {
    mockListFactors = vi.fn().mockResolvedValue({
      data: { all: [{ id: 'f-1', status: 'unverified' }], totp: [{ id: 'f-1', status: 'unverified' }] },
      error: null,
    })
    const { handleAuthHook } = await import('./index.ts')
    const req = new Request('https://test.function/auth-hook-mfa', {
      method: 'POST',
      body: JSON.stringify({
        user: { id: 'user-123', email: 'test@test.com', aal: 'aal1' },
        action: 'AUTH_LOGIN',
      }),
    })
    const res = await handleAuthHook(req)
    const body = await res.json()
    expect(body.decision).toBe('accept')
  })

  it('should reject login when user has verified MFA but is aal1', async () => {
    mockListFactors = vi.fn().mockResolvedValue({
      data: { all: [{ id: 'f-1', status: 'verified' }], totp: [{ id: 'f-1', status: 'verified' }] },
      error: null,
    })
    const { handleAuthHook } = await import('./index.ts')
    const req = new Request('https://test.function/auth-hook-mfa', {
      method: 'POST',
      body: JSON.stringify({
        user: { id: 'user-123', email: 'test@test.com', aal: 'aal1' },
        action: 'AUTH_LOGIN',
      }),
    })
    const res = await handleAuthHook(req)
    const body = await res.json()
    expect(body.decision).toBe('reject')
    expect(body.message).toBe('MFA required')
    expect(body.redirectTo).toBe('/auth/mfa')
  })

  it('should accept login when user has verified MFA and is aal2', async () => {
    mockListFactors = vi.fn().mockResolvedValue({
      data: { all: [{ id: 'f-1', status: 'verified' }], totp: [{ id: 'f-1', status: 'verified' }] },
      error: null,
    })
    const { handleAuthHook } = await import('./index.ts')
    const req = new Request('https://test.function/auth-hook-mfa', {
      method: 'POST',
      body: JSON.stringify({
        user: { id: 'user-123', email: 'test@test.com', aal: 'aal2' },
        action: 'AUTH_LOGIN',
      }),
    })
    const res = await handleAuthHook(req)
    const body = await res.json()
    expect(body.decision).toBe('accept')
  })

  it('should accept non-login actions', async () => {
    const { handleAuthHook } = await import('./index.ts')
    const req = new Request('https://test.function/auth-hook-mfa', {
      method: 'POST',
      body: JSON.stringify({
        user: { id: 'user-123' },
        action: 'TOKEN_REFRESH',
      }),
    })
    const res = await handleAuthHook(req)
    const body = await res.json()
    expect(body.decision).toBe('accept')
  })
})
