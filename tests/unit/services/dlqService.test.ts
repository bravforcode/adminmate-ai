import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { dlqService } from '../../../src/services/queue/dlqService'

function chain(result: { data: unknown; error: unknown }) {
  const proxy: Record<string, unknown> = {}
  for (const method of ['eq', 'gte', 'lte', 'lt', 'gt', 'order', 'limit', 'range', 'select', 'insert', 'update']) {
    proxy[method] = vi.fn(() => {
      if (method === 'eq' || method === 'gte' || method === 'lte' || method === 'lt' || method === 'gt') return proxy
      if (method === 'order' || method === 'limit' || method === 'range') return proxy
      if (method === 'select') return proxy
      if (method === 'insert' || method === 'update') return proxy
      return proxy
    })
  }
  proxy.single = vi.fn(() => Promise.resolve(result))
  proxy.then = (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve)
  proxy.count = null
  return proxy
}

describe('dlqService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockRow = {
    id: 'dlq-1',
    queue_name: 'notifications',
    message_id: 'msg-1',
    payload: { to: 'a@b.com' },
    error_message: 'timeout',
    retry_count: 0,
    status: 'pending',
    created_at: '2024-06-20T00:00:00Z',
  }

  describe('getPendingMessages', () => {
    it('returns pending messages', async () => {
      mockSupabase.from.mockReturnValue(chain({ data: [mockRow], error: null }))

      const result = await dlqService.getPendingMessages()
      expect(result).toEqual([mockRow])
      expect(mockSupabase.from).toHaveBeenCalledWith('dead_letter_queue')
    })

    it('filters by queue_name when provided', async () => {
      const q = chain({ data: [mockRow], error: null })
      mockSupabase.from.mockReturnValue(q)

      await dlqService.getPendingMessages('notifications')
      expect(q.eq).toHaveBeenCalledWith('queue_name', 'notifications')
    })

    it('throws on error', async () => {
      mockSupabase.from.mockReturnValue(chain({ data: null, error: new Error('DB fail') }))
      await expect(dlqService.getPendingMessages()).rejects.toThrow('DB fail')
    })
  })

  describe('getStats', () => {
    it('aggregates by queue and status', async () => {
      const rows = [
        { queue_name: 'a', status: 'pending' },
        { queue_name: 'a', status: 'resolved' },
        { queue_name: 'b', status: 'pending' },
      ]
      mockSupabase.from.mockReturnValue(chain({ data: rows, error: null }))

      const stats = await dlqService.getStats()
      expect(stats).toEqual({
        total: 3,
        byQueue: { a: 2, b: 1 },
        byStatus: { pending: 2, resolved: 1 },
      })
    })

    it('throws on error', async () => {
      mockSupabase.from.mockReturnValue(chain({ data: null, error: new Error('fail') }))
      await expect(dlqService.getStats()).rejects.toThrow('fail')
    })
  })

  describe('retryMessage', () => {
    it('re-enqueues and marks resolved on success', async () => {
      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) return chain({ data: mockRow, error: null })
        if (callCount === 2) return chain({ data: null, error: null }) // update retrying
        if (callCount === 3) return chain({ data: null, error: null }) // insert
        return chain({ data: null, error: null }) // update resolved
      })

      const result = await dlqService.retryMessage('dlq-1')
      expect(result).toEqual({ success: true })
    })

    it('returns error when message not found', async () => {
      mockSupabase.from.mockReturnValue(chain({ data: null, error: null }))

      const result = await dlqService.retryMessage('nonexistent')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Message not found')
    })

    it('rolls back to pending if re-enqueue fails', async () => {
      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) return chain({ data: mockRow, error: null })
        if (callCount === 2) return chain({ data: null, error: null })
        if (callCount === 3) return chain({ data: null, error: new Error('insert fail') })
        return chain({ data: null, error: null })
      })

      const result = await dlqService.retryMessage('dlq-1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('insert fail')
    })
  })

  describe('abandonMessage', () => {
    it('sets status to abandoned', async () => {
      mockSupabase.from.mockReturnValue(chain({ data: null, error: null }))

      await dlqService.abandonMessage('dlq-1')
      expect(mockSupabase.from).toHaveBeenCalledWith('dead_letter_queue')
    })

    it('throws on error', async () => {
      mockSupabase.from.mockReturnValue(chain({ data: null, error: new Error('fail') }))
      await expect(dlqService.abandonMessage('dlq-1')).rejects.toThrow('fail')
    })
  })

  describe('bulkAbandon', () => {
    it('abandons old pending messages and returns count', async () => {
      mockSupabase.from.mockReturnValue(chain({ data: [{ id: '1' }, { id: '2' }], error: null }))

      const count = await dlqService.bulkAbandon(30)
      expect(count).toBe(2)
    })

    it('throws on error', async () => {
      mockSupabase.from.mockReturnValue(chain({ data: null, error: new Error('fail') }))
      await expect(dlqService.bulkAbandon(30)).rejects.toThrow('fail')
    })
  })
})
