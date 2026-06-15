import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessagingHub, UnifiedMessage, SendMessageOptions } from './messagingHub'

// Mock Deno.env for Node.js test environment
const denoEnvMock: Record<string, string> = {
  WHATSAPP_API_TOKEN: 'test-wa-token',
  WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
  LINE_CHANNEL_ACCESS_TOKEN: 'test-line-token',
}
;(globalThis as any).Deno = {
  env: {
    get: (key: string) => denoEnvMock[key] || undefined,
  },
}

// Helper: create a chainable mock that records calls and returns preset results
// The chain is thenable so `const { data } = await chain` works for non-terminal queries
function createChainMock(finalResult: any = { data: null, error: null }) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'lt', 'gt', 'gte', 'lte', 'order', 'limit', 'single', 'maybeSingle', 'ilike', 'or', 'in']

  for (const method of methods) {
    if (method === 'single' || method === 'maybeSingle') {
      chain[method] = vi.fn().mockResolvedValue(finalResult)
    } else {
      chain[method] = vi.fn().mockReturnValue(chain)
    }
  }

  // Make the chain thenable so `await chain` resolves to finalResult
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve(finalResult).then(resolve, reject)

  return chain
}

describe('MessagingHub', () => {
  let hub: MessagingHub
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // from() returns a fresh chain per call — no shared state
    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ data: null }),
      from: vi.fn(() => createChainMock({ data: null, error: null })),
    }

    hub = new MessagingHub(mockSupabase)
  })

  describe('receiveMessage', () => {
    it('should store inbound message and create conversation', async () => {
      // 1. get_or_create_conversation
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-123' })

      // 2. from('messages') for dedup check — maybeSingle returns null (no dup)
      const messagesChain = createChainMock({ data: null, error: null })
      messagesChain.maybeSingle.mockResolvedValueOnce({ data: null })
      // 3. from('messages') for insert — single returns message id
      messagesChain.single.mockResolvedValueOnce({ data: { id: 'msg-123' } })
      mockSupabase.from.mockReturnValueOnce(messagesChain)

      // 4. upsert_conversation_thread rpc
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-123' })

      // 5. from('platform_sync_log') for logSync — just needs to not throw
      const logChain = createChainMock({ data: { id: 'log-1' }, error: null })
      mockSupabase.from.mockReturnValueOnce(logChain)

      const msg: UnifiedMessage = {
        company_id: 'company-1',
        platform: 'whatsapp',
        platform_user_id: '+66812345678',
        direction: 'inbound',
        content: 'Hello!',
        sender_type: 'user',
      }

      const result = await hub.receiveMessage(msg)

      expect(result.message_id).toBe('msg-123')
      expect(result.conversation_id).toBe('thread-123')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_or_create_conversation', {
        p_company_id: 'company-1',
        p_platform: 'whatsapp',
        p_platform_user_id: '+66812345678',
      })
    })

    it('should handle duplicate messages (idempotency)', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-123' })

      const messagesChain = createChainMock({ data: null, error: null })
      // Duplicate found
      messagesChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'existing-msg' } })
      mockSupabase.from.mockReturnValueOnce(messagesChain)

      const msg: UnifiedMessage = {
        company_id: 'company-1',
        platform: 'line',
        platform_message_id: 'dup-123',
        platform_user_id: 'U123456',
        direction: 'inbound',
        content: 'Duplicate message',
        sender_type: 'user',
      }

      const result = await hub.receiveMessage(msg)
      expect(result.message_id).toBe('existing-msg')
      expect(result.conversation_id).toBe('thread-123')
    })

    it('should handle missing platform_message_id (no dedup check)', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-456' })

      const messagesChain = createChainMock({ data: null, error: null })
      messagesChain.single.mockResolvedValueOnce({ data: { id: 'msg-456' } })
      mockSupabase.from.mockReturnValueOnce(messagesChain)

      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-456' })

      const logChain = createChainMock({ data: { id: 'log-2' }, error: null })
      mockSupabase.from.mockReturnValueOnce(logChain)

      const msg: UnifiedMessage = {
        company_id: 'company-1',
        platform: 'whatsapp',
        platform_user_id: '+66812345678',
        direction: 'inbound',
        content: 'No dedup ID',
        sender_type: 'user',
      }

      const result = await hub.receiveMessage(msg)
      expect(result.message_id).toBe('msg-456')
      // Should NOT call maybeSingle for dedup (no platform_message_id)
      expect(mockSupabase.from.mock.results[0].value.maybeSingle).not.toHaveBeenCalled()
    })
  })

  describe('sendMessage', () => {
    it('should queue outbound message', async () => {
      const queueChain = createChainMock({ data: null, error: null })
      queueChain.single.mockResolvedValueOnce({ data: { id: 'queue-123' } })
      mockSupabase.from.mockReturnValueOnce(queueChain)

      const opts: SendMessageOptions = {
        company_id: 'company-1',
        platform: 'whatsapp',
        platform_user_id: '+66812345678',
        content: 'Response from AI',
        priority: 1,
      }

      const result = await hub.sendMessage(opts)
      expect(result.queue_id).toBe('queue-123')
    })
  })

  describe('processQueue', () => {
    it('should return 0 when queue is empty', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [] })
      const count = await hub.processQueue()
      expect(count).toBe(0)
    })

    it('should process items using vault-decrypted token', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [
            { queue_id: 'q1', platform: 'whatsapp', platform_user_id: '+123', content: 'hi', content_type: 'text', company_id: 'c1' },
          ],
        })

      const connChain = createChainMock({ data: { access_token_vault_id: '00000000-0000-0000-0000-000000000001', platform_account_id: 'test-phone' }, error: null })
      mockSupabase.from.mockReturnValueOnce(connChain)

      mockSupabase.rpc.mockResolvedValueOnce({ data: 'decrypted-vault-token' })

      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') })

      mockSupabase.rpc.mockResolvedValueOnce({ data: null })

      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-1' })

      const messagesChain = createChainMock({ data: null, error: null })
      messagesChain.single.mockResolvedValueOnce({ data: { id: 'msg-out-1' } })
      mockSupabase.from.mockReturnValueOnce(messagesChain)

      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-1' })

      const logChain = createChainMock({ data: { id: 'log-sync' }, error: null })
      mockSupabase.from.mockReturnValueOnce(logChain)

      const count = await hub.processQueue(1)
      expect(count).toBe(1)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_decrypted_token', { p_secret_id: '00000000-0000-0000-0000-000000000001' })

      globalThis.fetch = originalFetch
    })

    it('should fallback to env var when vault id is null', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [
            { queue_id: 'q2', platform: 'whatsapp', platform_user_id: '+456', content: 'hello', content_type: 'text', company_id: 'c1' },
          ],
        })

      const connChain = createChainMock({ data: { access_token_vault_id: null, platform_account_id: 'test-phone' }, error: null })
      mockSupabase.from.mockReturnValueOnce(connChain)

      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') })

      mockSupabase.rpc.mockResolvedValueOnce({ data: null })

      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-2' })

      const messagesChain = createChainMock({ data: null, error: null })
      messagesChain.single.mockResolvedValueOnce({ data: { id: 'msg-out-2' } })
      mockSupabase.from.mockReturnValueOnce(messagesChain)

      mockSupabase.rpc.mockResolvedValueOnce({ data: 'thread-2' })

      const logChain = createChainMock({ data: { id: 'log-sync-2' }, error: null })
      mockSupabase.from.mockReturnValueOnce(logChain)

      const count = await hub.processQueue(1)
      expect(count).toBe(1)

      globalThis.fetch = originalFetch
    })
  })

  describe('getConversationHistory', () => {
    it('should return messages for a conversation', async () => {
      const mockChain = createChainMock({
        data: [{ id: 'msg-1', content: 'Hello' }],
        error: null,
      })
      mockSupabase.from.mockReturnValue(mockChain)

      const history = await hub.getConversationHistory('company-1', 'whatsapp', '+66812345678')
      expect(history).toHaveLength(1)
      expect(mockSupabase.from).toHaveBeenCalledWith('messages')
    })
  })

  describe('getConversations', () => {
    it('should return conversations for a company', async () => {
      const mockChain = createChainMock({
        data: [{ id: 't1', platform: 'whatsapp' }],
        error: null,
      })
      mockSupabase.from.mockReturnValue(mockChain)

      const convos = await hub.getConversations('company-1')
      expect(convos).toHaveLength(1)
      expect(mockSupabase.from).toHaveBeenCalledWith('conversation_threads')
    })
  })

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockChain = createChainMock({ data: [], error: null })
      mockSupabase.from.mockReturnValue(mockChain)

      const health = await hub.healthCheck()
      expect(health.database).toBe('healthy')
      expect(health.whatsapp).toBe('configured')
      expect(health.line).toBe('configured')
    })
  })
})
