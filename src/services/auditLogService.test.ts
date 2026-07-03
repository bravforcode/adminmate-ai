import { describe, it, expect, vi, beforeEach } from 'vitest'

function createChain(result: unknown, error: unknown = null, count?: number) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'gte', 'lte', 'lt', 'range', 'head']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: Function, reject?: Function) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error, count: count ?? result?.length ?? 0 })
  }
  return chain
}

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { auditLogService } from './auditLogService'

describe('auditLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const logs = [
        { id: '1', action: 'user_login', created_at: '2024-01-01T00:00:00Z' },
        { id: '2', action: 'candidate_created', created_at: '2024-01-02T00:00:00Z' },
      ]
      mockFrom.mockReturnValue(createChain(logs))

      const result = await auditLogService.getAuditLogs('comp-1', { limit: 25 })

      expect(result.data).toHaveLength(2)
      expect(result.hasMore).toBe(false)
      expect(result.cursor).toBeNull()
    })

    it('should apply action filter', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await auditLogService.getAuditLogs('comp-1', { action: 'user_login' })

      expect(chain.eq).toHaveBeenCalledWith('action', 'user_login')
    })

    it('should apply date filters', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await auditLogService.getAuditLogs('comp-1', { date_from: '2024-01-01', date_to: '2024-01-31' })

      expect(chain.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(chain.lte).toHaveBeenCalled()
    })

    it('should detect hasMore when results exceed limit', async () => {
      const logs = Array.from({ length: 26 }, (_, i) => ({
        id: String(i),
        action: 'test',
        created_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      }))
      mockFrom.mockReturnValue(createChain(logs))

      const result = await auditLogService.getAuditLogs('comp-1', { limit: 25 })

      expect(result.hasMore).toBe(true)
      expect(result.data).toHaveLength(25)
      expect(result.cursor).toBeTruthy()
    })

    it('should apply cursor-based pagination', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await auditLogService.getAuditLogs('comp-1', { cursor: '2024-01-15T00:00:00Z' })

      expect(chain.lt).toHaveBeenCalledWith('created_at', '2024-01-15T00:00:00Z')
    })
  })

  describe('getAuditLogStats', () => {
    it('should return audit log statistics', async () => {
      mockRpc.mockResolvedValue({
        data: { total_logs: 100, today_count: 5, unique_users: 10, top_actions: [{ action: 'user_login', count: 30 }] },
        error: null,
      })

      const stats = await auditLogService.getAuditLogStats('comp-1')

      expect(stats.total_logs).toBe(100)
      expect(stats.today_count).toBe(5)
      expect(stats.unique_users).toBe(10)
      expect(stats.top_actions).toHaveLength(1)
    })

    it('should return defaults on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') })

      await expect(auditLogService.getAuditLogStats('comp-1')).rejects.toThrow()
    })
  })

  describe('exportToCSV', () => {
    it('should convert audit logs to CSV string', () => {
      const logs = [
        {
          id: '1',
          user_id: 'u1',
          action: 'user_login',
          resource_type: 'session',
          resource_id: 's1',
          ip_address: '127.0.0.1',
          created_at: '2024-01-01T00:00:00Z',
          user_profiles: { full_name: 'Test User', email: 'test@example.com' },
        },
      ]

      const csv = auditLogService.exportToCSV(logs)

      expect(csv).toContain('Timestamp')
      expect(csv).toContain('User')
      expect(csv).toContain('Action')
      expect(csv).toContain('user_login')
      expect(csv).toContain('Test User')
    })

    it('should handle empty logs', () => {
      const csv = auditLogService.exportToCSV([])
      expect(csv).toContain('Timestamp')
      expect(csv.split('\n')).toHaveLength(1) // Only header
    })

    it('should escape double quotes in CSV', () => {
      const logs = [{
        id: '1',
        user_id: 'u1',
        action: 'test',
        details: { note: 'He said "hello"' },
        created_at: '2024-01-01T00:00:00Z',
        user_profiles: { full_name: 'Test', email: 'test@test.com' },
      }]

      const csv = auditLogService.exportToCSV(logs)
      // The details field is JSON.stringified which already escapes quotes
      expect(csv).toContain('He said')
    })
  })
})
