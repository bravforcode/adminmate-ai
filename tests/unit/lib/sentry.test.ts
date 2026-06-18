import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInit = vi.fn()
let beforeSendFn: ((event: any) => any) | null = null

vi.mock('@sentry/react', () => ({
  init: (config: any) => {
    beforeSendFn = config.beforeSend ?? null
    mockInit(config)
  },
}))

describe('Sentry beforeSend', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@o0.ingest.sentry.io/0')
    beforeSendFn = null
    mockInit.mockClear()
    const mod = await import('../../../src/lib/sentry')
    mod.initSentry()
    await new Promise(resolve => setTimeout(resolve, 10))
  })

  it('should capture beforeSend from init config', () => {
    expect(beforeSendFn).toBeTypeOf('function')
  })

  it('should redact sensitive headers', () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer token123',
          'X-RateLimit-Key': 'my-secret-key',
          Cookie: 'session=abc123',
          'Content-Type': 'application/json',
        },
      },
    }
    const result = beforeSendFn!(event)
    expect(result.request.headers.Authorization).toBe('[redacted]')
    expect(result.request.headers['X-RateLimit-Key']).toBe('[redacted]')
    expect(result.request.headers.Cookie).toBe('[redacted]')
    expect(result.request.headers['Content-Type']).toBe('application/json')
  })

  it('should redact user PII', () => {
    const event = {
      user: {
        email: 'user@example.com',
        username: 'johndoe',
        ip_address: '192.168.1.1',
        id: 'user-123',
      },
    }
    const result = beforeSendFn!(event)
    expect(result.user.email).toBe('[redacted]')
    expect(result.user.username).toBe('[redacted]')
    expect(result.user.ip_address).toBe('[redacted]')
    expect(result.user.id).toBe('user-123')
  })

  it('should strip query params from URL', () => {
    const event = {
      request: {
        url: 'https://api.example.com/data?token=secret&email=user@test.com',
      },
    }
    const result = beforeSendFn!(event)
    expect(result.request.url).toBe('https://api.example.com/data')
  })

  it('should handle invalid URLs gracefully', () => {
    const event = {
      request: {
        url: 'not-a-valid-url',
      },
    }
    const result = beforeSendFn!(event)
    expect(result.request.url).toBe('not-a-valid-url')
  })

  it('should handle missing request/user gracefully', () => {
    const event = {}
    const result = beforeSendFn!(event)
    expect(result).toEqual({})
  })

  it('should preserve breadcrumbs and exception data', () => {
    const event = {
      exception: { values: [{ type: 'Error', value: 'test error' }] },
      breadcrumbs: [{ message: 'test' }],
    }
    const result = beforeSendFn!(event)
    expect(result.exception).toEqual(event.exception)
    expect(result.breadcrumbs).toEqual(event.breadcrumbs)
  })
})
