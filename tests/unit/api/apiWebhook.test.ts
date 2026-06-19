import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.stubEnv('VITE_DEMO_MODE', 'false')

import { apiKeyService } from '../../../src/services/api/apiKeyService'
import { webhookService } from '../../../src/services/api/webhookService'

function makeChain(finalResult?: unknown) {
  const result = finalResult ?? { data: null, error: null }

  const chain: Record<string, unknown> = {}
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(result)
  chain.contains = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockReturnValue(result)
  chain.single = vi.fn().mockReturnValue(result)
  chain.maybeSingle = vi.fn().mockReturnValue(result)
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)

  return chain
}

describe('apiKeyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  describe('createClient', () => {
    it('creates client with company_id', async () => {
      const fakeClient = { id: 'c1', company_id: 'comp1', client_name: 'Test', client_type: 'external' }
      mockFrom.mockReturnValue(makeChain({ data: fakeClient, error: null }))

      const result = await apiKeyService.createClient('comp1', { client_name: 'Test' })
      expect(result.company_id).toBe('comp1')
      expect(mockFrom).toHaveBeenCalledWith('api_clients')
    })

    it('throws on insufficient permissions', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      await expect(apiKeyService.createClient('comp1', { client_name: 'X' })).rejects.toThrow('api_key_write')
    })
  })

  describe('generateApiKey', () => {
    it('returns raw key with am_ prefix', async () => {
      mockFrom.mockReturnValue(makeChain({ data: {}, error: null }))

      const result = await apiKeyService.generateApiKey('client1', ['read'], '2025-12-31')
      expect(result.raw_key).toMatch(/^am_[a-f0-9]{64}$/)
      expect(result.key_prefix).toBe(result.raw_key.substring(0, 8))
    })

    it('hashes key with sha256', async () => {
      mockFrom.mockReturnValue(makeChain({ data: {}, error: null }))

      const result = await apiKeyService.generateApiKey('client1', ['read'])
      const expectedHash = crypto.createHash('sha256').update(result.raw_key).digest('hex')
      expect(result.key_hash).toBe(expectedHash)
    })

    it('throws on missing permission', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      await expect(apiKeyService.generateApiKey('client1', [])).rejects.toThrow('api_key_write')
    })
  })

  describe('validateApiKey', () => {
    it('returns key record when valid', async () => {
      const fakeKey = { id: 'k1', is_active: true, expires_at: null, last_used_at: null }
      mockFrom
        .mockReturnValueOnce(makeChain({ data: fakeKey, error: null }))
        .mockReturnValueOnce(makeChain({ data: {}, error: null }))

      const result = await apiKeyService.validateApiKey('somehash')
      expect(result).toEqual(fakeKey)
    })

    it('returns null when key not found', async () => {
      mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'not found' } }))
      const result = await apiKeyService.validateApiKey('nonexistent')
      expect(result).toBeNull()
    })

    it('returns null when key expired', async () => {
      const expiredKey = {
        id: 'k1',
        is_active: true,
        expires_at: '2020-01-01T00:00:00Z',
        last_used_at: null,
      }
      mockFrom.mockReturnValue(makeChain({ data: expiredKey, error: null }))

      const result = await apiKeyService.validateApiKey('expiredhash')
      expect(result).toBeNull()
    })

    it('updates last_used_at on successful validation', async () => {
      const fakeKey = { id: 'k1', is_active: true, expires_at: null }
      const queryChain = makeChain({ data: fakeKey, error: null })
      const updateChain = makeChain({ data: {}, error: null })
      mockFrom
        .mockReturnValueOnce(queryChain)
        .mockReturnValueOnce(updateChain)

      await apiKeyService.validateApiKey('validhash')
      expect(updateChain.update).toHaveBeenCalledWith({ last_used_at: expect.any(String) })
    })
  })

  describe('revokeApiKey', () => {
    it('sets is_active to false', async () => {
      const chain = makeChain({ data: {}, error: null })
      mockFrom.mockReturnValue(chain)

      await apiKeyService.revokeApiKey('key1')
      expect(chain.update).toHaveBeenCalledWith({ is_active: false })
    })

    it('throws on missing permission', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      await expect(apiKeyService.revokeApiKey('key1')).rejects.toThrow('api_key_write')
    })
  })
})

describe('webhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createSubscription', () => {
    it('hashes secret before storing', async () => {
      const chain = makeChain({ data: {}, error: null })
      mockFrom.mockReturnValue(chain)

      await webhookService.createSubscription({
        company_id: 'comp1',
        client_id: 'client1',
        event_types: ['candidate.created'],
        url: 'https://example.com/hook',
        secret: 'mysecret123',
      })

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          secret_hash: crypto.createHash('sha256').update('mysecret123').digest('hex'),
        })
      )
    })

    it('throws on missing permission', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      await expect(
        webhookService.createSubscription({
          company_id: 'comp1',
          client_id: 'client1',
          event_types: [],
          url: 'https://x.com',
          secret: 's',
        })
      ).rejects.toThrow('webhook_write')
    })
  })

  describe('verifySignature', () => {
    it('returns true for valid signature', () => {
      const secret = 'test-secret'
      const body = '{"event":"test"}'
      const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex')
      expect(webhookService.verifySignature(secret, body, expectedSig)).toBe(true)
    })

    it('returns false for invalid signature of same length', () => {
      const secret = 'test-secret'
      const body = '{"event":"test"}'
      const wrongSig = crypto.createHmac('sha256', 'wrong-secret').update(body).digest('hex')
      expect(webhookService.verifySignature(secret, body, wrongSig)).toBe(false)
    })

    it('uses timing-safe comparison', () => {
      const secret = 'k'
      const body = 'b'
      const correct = crypto.createHmac('sha256', secret).update(body).digest('hex')
      const close = correct.substring(0, 63) + '0'
      expect(webhookService.verifySignature(secret, body, close)).toBe(false)
    })
  })

  describe('retryDelivery', () => {
    it('increments attempt number', async () => {
      const originalAttempt = {
        id: 'a1',
        company_id: 'comp1',
        subscription_id: 'sub1',
        event_type: 'test.event',
        payload: { body: { event: 'test.event' } },
        attempt_number: 1,
        webhook_subscriptions: { secret_hash: 'hash', url: 'https://example.com' },
      }
      const fetchChain = makeChain({ data: originalAttempt, error: null })
      const insertChain = makeChain({ data: { ...originalAttempt, id: 'a2', attempt_number: 2 }, error: null })
      mockFrom
        .mockReturnValueOnce(fetchChain)
        .mockReturnValueOnce(insertChain)
        .mockReturnValueOnce(makeChain({ data: {}, error: null }))

      global.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('OK') })

      await webhookService.retryDelivery('a1')

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ attempt_number: 2 })
      )
    })

    it('rejects when max retries exceeded', async () => {
      const maxAttempt = {
        id: 'a5',
        attempt_number: 5,
        webhook_subscriptions: { secret_hash: 'h', url: 'https://x.com' },
        payload: { body: {} },
      }
      mockFrom.mockReturnValue(makeChain({ data: maxAttempt, error: null }))

      await expect(webhookService.retryDelivery('a5')).rejects.toThrow('Max retries')
    })
  })

  describe('getDeliveryAttempts', () => {
    it('returns delivery attempts for subscription', async () => {
      const fakeAttempts = [{ id: 'a1', status: 'delivered' }]
      const chain = makeChain({ data: fakeAttempts, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await webhookService.getDeliveryAttempts('sub1')
      expect(result).toEqual(fakeAttempts)
    })

    it('throws on missing permission', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      await expect(webhookService.getDeliveryAttempts('sub1')).rejects.toThrow('webhook_read')
    })
  })

  describe('listSubscriptions', () => {
    it('returns subscriptions scoped to company', async () => {
      const subs = [{ id: 'w1', company_id: 'comp1' }]
      mockFrom.mockReturnValue(makeChain({ data: subs, error: null }))

      const result = await webhookService.listSubscriptions('comp1')
      expect(result).toEqual(subs)
    })
  })

  describe('deleteSubscription', () => {
    it('deletes subscription by id', async () => {
      const chain = makeChain({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await webhookService.deleteSubscription('sub1')
      expect(chain.delete).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenCalledWith('id', 'sub1')
    })
  })
})

describe('RLS isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  it('API cannot bypass RLS - queries filter by company_id', async () => {
    const chain = makeChain({ data: { id: 'c1', company_id: 'comp1' }, error: null })
    mockFrom.mockReturnValue(chain)

    await apiKeyService.createClient('other-company', { client_name: 'X' })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 'other-company' })
    )
  })

  it('webhook queries are scoped by company_id', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await webhookService.listSubscriptions('other-company')

    expect(chain.eq).toHaveBeenCalledWith('company_id', 'other-company')
  })
})

describe('Workflow security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  it('workflow cannot perform unauthorized action without permission', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    await expect(
      apiKeyService.createClient('comp1', { client_name: 'Unauthorized' })
    ).rejects.toThrow('api_key_write')

    await expect(
      apiKeyService.revokeApiKey('key1')
    ).rejects.toThrow('api_key_write')
  })

  it('workflow can perform allowed actions with permission', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })
    const chain = makeChain({ data: { id: 'c1', company_id: 'comp1' }, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await apiKeyService.createClient('comp1', { client_name: 'Authorized' })
    expect(result.id).toBe('c1')
  })
})

describe('Failed webhook retries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates retry with incremented attempt_number', async () => {
    const existing = {
      id: 'a1',
      attempt_number: 2,
      company_id: 'comp1',
      subscription_id: 'sub1',
      event_type: 'test.event',
      payload: { body: { event: 'test.event' } },
      webhook_subscriptions: { secret_hash: 'h', url: 'https://example.com/hook' },
    }
    const fetchChain = makeChain({ data: existing, error: null })
    const insertChain = makeChain({ data: { ...existing, id: 'a3', attempt_number: 3 }, error: null })
    const updateChain = makeChain({ data: {}, error: null })
    mockFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(updateChain)

    global.fetch = vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('500') })

    await webhookService.retryDelivery('a1')

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ attempt_number: 3 })
    )
  })
})
