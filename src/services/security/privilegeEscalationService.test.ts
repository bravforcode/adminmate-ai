import { describe, it, expect, vi, beforeEach } from 'vitest'

function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'gte', 'lte', 'in']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: (v: unknown) => unknown, _reject?: (e: unknown) => unknown) => {
    // Supabase returns { data, error } — never throws
    return resolve({ data: result, error })
  }
  return chain
}

const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { privilegeEscalationService } from './privilegeEscalationService'

describe('privilegeEscalationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('detectEscalation', () => {
    it('should detect escalation when high-privilege role is assigned', async () => {
      const changes = [
        { id: '1', user_id: 'u1', user_email: 'test@test.com', previous_role: 'employee', new_role: 'owner', changed_by: 'admin', changed_at: new Date().toISOString() },
      ]
      mockFrom.mockReturnValue(createChain(changes))

      const result = await privilegeEscalationService.detectEscalation('comp-1')

      expect(result.escalated).toBe(true)
      expect(result.changes).toHaveLength(1)
    })

    it('should not detect escalation for normal role changes', async () => {
      const changes = [
        { id: '1', user_id: 'u1', user_email: 'test@test.com', previous_role: 'employee', new_role: 'manager', changed_by: 'admin', changed_at: new Date().toISOString() },
      ]
      mockFrom.mockReturnValue(createChain(changes))

      const result = await privilegeEscalationService.detectEscalation('comp-1')

      expect(result.escalated).toBe(false)
    })

    it('should return empty changes on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))

      const result = await privilegeEscalationService.detectEscalation('comp-1')
      // detectEscalation catches errors and returns empty
      expect(result.escalated).toBe(false)
      expect(result.changes).toEqual([])
    })
  })

  describe('getAuditTrail', () => {
    it('should return audit trail for company', async () => {
      const changes = [
        { id: '1', user_id: 'u1', previous_role: 'employee', new_role: 'manager' },
        { id: '2', user_id: 'u2', previous_role: 'manager', new_role: 'admin' },
      ]
      mockFrom.mockReturnValue(createChain(changes))

      const result = await privilegeEscalationService.getAuditTrail('comp-1')

      expect(result).toHaveLength(2)
    })

    it('should filter by userId when provided', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await privilegeEscalationService.getAuditTrail('comp-1', 'user-1')

      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    })
  })

  describe('checkCompliance', () => {
    it('should report compliant when no violations', async () => {
      mockFrom.mockReturnValue(createChain([]))

      const result = await privilegeEscalationService.checkCompliance('comp-1')

      expect(result.compliant).toBe(true)
      expect(result.violations).toEqual([])
    })

    it('should detect violations for high-privilege roles without permissions', async () => {
      const snapshot = [
        { role: 'owner', resource: 'candidates', action: 'read', is_allowed: false },
      ]
      mockFrom.mockReturnValue(createChain(snapshot))

      const result = await privilegeEscalationService.checkCompliance('comp-1')

      expect(result.compliant).toBe(false)
      expect(result.violations).toHaveLength(1)
    })
  })
})
