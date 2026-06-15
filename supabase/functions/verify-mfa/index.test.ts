import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashBackupCode, hashBackupCodes } from './crypto.ts'
import { generateBackupCodes } from './index.ts'

// Mock Deno.env
const denoEnvMock: Record<string, string> = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
}
;(globalThis as any).Deno = {
  env: {
    get: (key: string) => denoEnvMock[key] || undefined,
  },
}

// Mock URL imports for Deno
vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: (handler: Function) => handler,
}))

// Create mutable mock references
let mockVerifyFactorLogin: any
let mockSupabaseFrom: any
let mockGetUser: any

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: () => ({
    rpc: vi.fn().mockResolvedValue({ data: [{ allowed: true }] }),
    from: (...args: any[]) => mockSupabaseFrom(...args),
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
      admin: {
        verifyFactorLogin: (...args: any[]) => mockVerifyFactorLogin(...args),
      },
    },
  }),
}))

function createChain(overrides: Record<string, any> = {}) {
  const chain: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: Function) => Promise.resolve({ data: null, error: null }).then(resolve),
    ...overrides,
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  })
  mockVerifyFactorLogin = vi.fn()
  mockSupabaseFrom = vi.fn().mockReturnValue(createChain())
})

describe('hashBackupCode', () => {
  it('should produce a 64-character hex string', async () => {
    const hash = await hashBackupCode('A1B2-C3D4')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should produce consistent hashes for same input', async () => {
    const hash1 = await hashBackupCode('TEST-CODE')
    const hash2 = await hashBackupCode('TEST-CODE')
    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different inputs', async () => {
    const hash1 = await hashBackupCode('CODE-001')
    const hash2 = await hashBackupCode('CODE-002')
    expect(hash1).not.toBe(hash2)
  })
})

describe('hashBackupCodes', () => {
  it('should hash all codes in array', async () => {
    const codes = ['AAAA-BBBB', 'CCCC-DDDD', 'EEEE-FFFF']
    const hashes = await hashBackupCodes(codes)
    expect(hashes).toHaveLength(3)
    for (const h of hashes) {
      expect(h).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it('should return empty array for empty input', async () => {
    const hashes = await hashBackupCodes([])
    expect(hashes).toEqual([])
  })
})

describe('generateBackupCodes', () => {
  it('should generate 8 codes by default', () => {
    const codes = generateBackupCodes()
    expect(codes).toHaveLength(8)
  })

  it('should generate codes in XXXX-XXXX format', () => {
    const codes = generateBackupCodes()
    for (const code of codes) {
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/)
    }
  })

  it('should generate unique codes', () => {
    const codes = generateBackupCodes()
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })
})

describe('verify-mfa endpoint', () => {
  it('should return 405 for non-POST requests', async () => {
    const { handleRequest } = await import('./index.ts')
    const req = new Request('https://test.function/verify-mfa', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-token' },
    })
    const res = await handleRequest(req)
    expect(res.status).toBe(405)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('should return 401 for missing auth', async () => {
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    })
    const { handleRequest } = await import('./index.ts')
    const req = new Request('https://test.function/verify-mfa', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad-token' },
      body: JSON.stringify({ factor_id: 'factor-1', code: '123456' }),
    })
    const res = await handleRequest(req)
    expect(res.status).toBe(401)
  })

  it('should return 400 when factor_id is missing', async () => {
    const { handleRequest } = await import('./index.ts')
    const req = new Request('https://test.function/verify-mfa', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ code: '123456' }),
    })
    const res = await handleRequest(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 when code is too short', async () => {
    const { handleRequest } = await import('./index.ts')
    const req = new Request('https://test.function/verify-mfa', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ factor_id: 'factor-1', code: '123' }),
    })
    const res = await handleRequest(req)
    expect(res.status).toBe(400)
  })

  it('should store hashed backup codes on successful TOTP', async () => {
    mockVerifyFactorLogin = vi.fn().mockResolvedValue({
      data: { verified: true },
      error: null,
    })

    let updateArgs: any = null
    const chain = createChain()
    chain.update = vi.fn().mockImplementation((data: any) => {
      updateArgs = data
      return chain
    })
    mockSupabaseFrom = vi.fn().mockReturnValue(chain)

    const { handleRequest } = await import('./index.ts')
    const req = new Request('https://test.function/verify-mfa', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ factor_id: 'factor-1', code: '123456' }),
    })
    const res = await handleRequest(req)
    expect(res.status).toBe(200)

    const storedBackupCodes = JSON.parse(updateArgs.backup_codes)
    expect(storedBackupCodes).toHaveLength(8)
    for (const hash of storedBackupCodes) {
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it('should accept valid backup code when TOTP fails', async () => {
    mockVerifyFactorLogin = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid TOTP' },
    })

    const validBackupCode = 'A1B2-C3D4'
    const validHash = await hashBackupCode(validBackupCode)
    let storedHashes = [validHash, 'x'.repeat(64)]

    const chain = createChain()
    chain.update = vi.fn().mockImplementation((data: any) => {
      storedHashes = JSON.parse(data.backup_codes)
      return chain
    })
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: { backup_codes: JSON.stringify(storedHashes) },
      error: null,
    })
    mockSupabaseFrom = vi.fn().mockReturnValue(chain)

    const { handleRequest } = await import('./index.ts')
    const req = new Request('https://test.function/verify-mfa', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ factor_id: 'factor-1', code: validBackupCode }),
    })
    const res = await handleRequest(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.backup_code_used).toBe(true)
    expect(storedHashes).toHaveLength(1)
    expect(storedHashes[0]).toBe('x'.repeat(64))
  })

  it('should reject invalid backup code when TOTP fails', async () => {
    mockVerifyFactorLogin = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid TOTP' },
    })

    const realCode = 'REAL-CODE'
    const realHash = await hashBackupCode(realCode)

    const chain = createChain()
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: { backup_codes: JSON.stringify([realHash]) },
      error: null,
    })
    mockSupabaseFrom = vi.fn().mockReturnValue(chain)

    const { handleRequest } = await import('./index.ts')
    const req = new Request('https://test.function/verify-mfa', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token' },
      body: JSON.stringify({ factor_id: 'factor-1', code: 'WRONG-CODE' }),
    })
    const res = await handleRequest(req)
    expect(res.status).toBe(401)
  })
})
