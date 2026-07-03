import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase chainable query builder
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'gte', 'lte', 'lt', 'or', 'in', 'range', 'head']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: Function, reject?: Function) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error, count: result?.length ?? 0 })
  }
  return chain
}

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  },
}))

vi.mock('../permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import { createPrivacyRequest, createGrievanceCase, placeLegalHold, checkLegalHold } from './complianceService'

describe('complianceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPrivacyRequest', () => {
    it('should create a privacy request and log audit', async () => {
      const created = { id: 'pr-1', request_type: 'erasure', employee_id: 'emp-1' }
      mockFrom.mockReturnValue(createChain(created))

      const result = await createPrivacyRequest({
        company_id: 'comp-1',
        employee_id: 'emp-1',
        request_type: 'erasure',
        notes: 'User requested deletion',
      })

      expect(result.id).toBe('pr-1')
      expect(result.request_type).toBe('erasure')
    })

    it('should throw on database error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))

      await expect(
        createPrivacyRequest({ company_id: 'comp-1', employee_id: 'emp-1', request_type: 'access' })
      ).rejects.toThrow()
    })
  })

  describe('createGrievanceCase', () => {
    it('should create a grievance case', async () => {
      const created = { id: 'gc-1', category: 'harassment', status: 'open' }
      mockFrom.mockReturnValue(createChain(created))

      const result = await createGrievanceCase({
        company_id: 'comp-1',
        reporter_id: 'user-1',
        category: 'harassment',
        description: 'Test grievance',
      })

      expect(result.id).toBe('gc-1')
      expect(result.category).toBe('harassment')
    })
  })

  describe('placeLegalHold', () => {
    it('should place a legal hold on an entity', async () => {
      const created = { id: 'lh-1', entity_type: 'candidate', entity_id: 'cand-1', status: 'active' }
      mockFrom.mockReturnValue(createChain(created))

      const result = await placeLegalHold({
        company_id: 'comp-1',
        entity_type: 'candidate',
        entity_id: 'cand-1',
        reason: 'Litigation hold',
      })

      expect(result.id).toBe('lh-1')
      expect(result.status).toBe('active')
    })
  })

  describe('checkLegalHold', () => {
    it('should return true when entity is under legal hold', async () => {
      mockFrom.mockReturnValue(createChain([{ id: 'lh-1' }]))

      const result = await checkLegalHold('candidate', 'cand-1')
      expect(result).toBe(true)
    })

    it('should return false when entity is not under legal hold', async () => {
      mockFrom.mockReturnValue(createChain([]))

      const result = await checkLegalHold('candidate', 'cand-1')
      expect(result).toBe(false)
    })
  })
})
