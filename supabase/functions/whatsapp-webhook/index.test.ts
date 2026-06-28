import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

// ── Mocks ──────────────────────────────────────────

const denoEnvMock: Record<string, string> = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  WHATSAPP_APP_SECRET: 'test-app-secret',
  WHATSAPP_VERIFY_TOKEN: 'test-verify-token',
}

const mockLogRequest = vi.fn()
const mockHandleIncomingMessage = vi.fn()
const mockErrorResponse = vi.fn().mockReturnValue(new Response('error', { status: 500 }))

;(globalThis as any).Deno = {
  env: { get: (key: string) => denoEnvMock[key] || undefined },
}

let webhookHandler: ((req: Request) => Promise<Response>) | null = null

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: (handler: Function) => { webhookHandler = handler as any },
}))

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}))

vi.mock('../_shared/utils.ts', () => ({
  getCorsHeaders: () => ({ 'Access-Control-Allow-Origin': 'http://localhost:5173' }),
  getJsonHeaders: () => ({ 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Content-Type': 'application/json' }),
  logRequest: (...args: any[]) => mockLogRequest(...args),
  // Constant-time string comparison (matches the real implementation in _shared/utils.ts)
  timingSafeEqual: (a: string, b: string): boolean => {
    if (a.length !== b.length) return false
    const encoder = new TextEncoder()
    const bufA = encoder.encode(a)
    const bufB = encoder.encode(b)
    let result = 0
    for (let i = 0; i < bufA.length; i++) {
      result |= bufA[i] ^ bufB[i]
    }
    return result === 0
  },
}))

vi.mock('../_shared/messageHandler.ts', () => ({
  handleIncomingMessage: (...args: any[]) => mockHandleIncomingMessage(...args),
}))

vi.mock('../_shared/errorHandler.ts', () => ({
  errorResponse: (...args: any[]) => mockErrorResponse(...args),
}))

// Trigger module load — this captures webhookHandler via serve() mock
await import('./index.ts')

function computeSignature(secret: string, body: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(body)
  return `sha256=${hmac.digest('hex')}`
}

async function post(body: string, signature?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'content-length': String(body.length),
  }
  if (signature) headers['x-hub-signature-256'] = signature
  return webhookHandler!(new Request('https://test.function/whatsapp-webhook', {
    method: 'POST', headers, body,
  }))
}

async function get(query: Record<string, string>): Promise<Response> {
  const url = new URL('https://test.function/whatsapp-webhook')
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return webhookHandler!(new Request(url.toString(), { method: 'GET' }))
}

// ── Tests ──────────────────────────────────────────

describe('whatsapp-webhook security — signature verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    denoEnvMock.WHATSAPP_APP_SECRET = 'test-app-secret'
    denoEnvMock.WHATSAPP_VERIFY_TOKEN = 'test-verify-token'
  })

  describe('Problem 1: LINE Secret Fallback', () => {
    it('must NOT fallback to LINE_CHANNEL_SECRET when WHATSAPP_APP_SECRET is missing', async () => {
      delete denoEnvMock.WHATSAPP_APP_SECRET
      denoEnvMock.LINE_CHANNEL_SECRET = 'line-secret'

      const res = await post('{}', 'sha256=abc')
      expect(res.status).toBe(500)
      expect(await res.text()).toBe('Server configuration error')
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ status: 500, error: 'WHATSAPP_APP_SECRET not configured' })
      )
    })
  })

  describe('Problem 2: Fail Closed When Secret Is Missing', () => {
    it('should reject with 500 when WHATSAPP_APP_SECRET is not set', async () => {
      delete denoEnvMock.WHATSAPP_APP_SECRET
      const res = await post('{}')
      expect(res.status).toBe(500)
    })
  })

  describe('Fail Closed: Missing Signature', () => {
    it('should reject with 403 when signature header is missing', async () => {
      const res = await post(JSON.stringify({}))
      expect(res.status).toBe(403)
      expect(await res.text()).toBe('Forbidden')
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, error: 'missing signature' })
      )
    })
  })

  describe('Valid Signature', () => {
    it('should accept request with valid signature', async () => {
      const body = JSON.stringify({
        entry: [{ changes: [{ value: { messages: [{ id: 'msg-1', type: 'text', text: { body: 'hi' }, from: 'user-1' }], metadata: { phone_number_id: 'phone-1' } } }] }],
      })
      const sig = computeSignature('test-app-secret', body)
      const res = await post(body, sig)
      expect(res.status).toBe(200)
    })
  })

  describe('Invalid Signature', () => {
    it('should reject with 403 when signature does not match', async () => {
      const res = await post(JSON.stringify({ entry: [] }), 'sha256=invalid')
      expect(res.status).toBe(403)
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, error: 'invalid signature' })
      )
    })

    it('should reject with 403 when signature uses wrong secret', async () => {
      const body = JSON.stringify({ entry: [] })
      const res = await post(body, computeSignature('wrong-secret', body))
      expect(res.status).toBe(403)
    })
  })

  describe('GET — webhook verification', () => {
    it('should return 503 when WHATSAPP_VERIFY_TOKEN is not set', async () => {
      delete denoEnvMock.WHATSAPP_VERIFY_TOKEN
      const res = await get({ 'hub.mode': 'subscribe', 'hub.verify_token': 'anything', 'hub.challenge': 'challenge-123' })
      expect(res.status).toBe(503)
    })

    it('should accept valid verify token', async () => {
      const res = await get({ 'hub.mode': 'subscribe', 'hub.verify_token': 'test-verify-token', 'hub.challenge': 'challenge-123' })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('challenge-123')
    })
  })
})
