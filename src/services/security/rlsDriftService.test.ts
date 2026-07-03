import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { rlsDriftService, type RLSPolicyBaseline } from './rlsDriftService'

describe('rlsDriftService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPolicyDiff', () => {
    it('should detect removed policies', () => {
      const baseline: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['authenticated'], definition: 'true', check: null },
      ]
      const current: RLSPolicyBaseline[] = []

      const changes = rlsDriftService.getPolicyDiff(baseline, current)

      expect(changes).toHaveLength(1)
      expect(changes[0].change_type).toBe('removed')
      expect(changes[0].table_name).toBe('candidates')
    })

    it('should detect added policies', () => {
      const baseline: RLSPolicyBaseline[] = []
      const current: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'new_policy', command: 'SELECT', roles: ['authenticated'], definition: 'true', check: null },
      ]

      const changes = rlsDriftService.getPolicyDiff(baseline, current)

      expect(changes).toHaveLength(1)
      expect(changes[0].change_type).toBe('added')
    })

    it('should detect modified policies', () => {
      const baseline: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['authenticated'], definition: 'true', check: null },
      ]
      const current: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'ALL', roles: ['authenticated'], definition: 'true', check: null },
      ]

      const changes = rlsDriftService.getPolicyDiff(baseline, current)

      expect(changes).toHaveLength(1)
      expect(changes[0].change_type).toBe('modified')
      expect(changes[0].field_diffs).toContain('command')
    })

    it('should return empty array when no changes', () => {
      const policies: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['authenticated'], definition: 'true', check: null },
      ]

      const changes = rlsDriftService.getPolicyDiff(policies, policies)

      expect(changes).toEqual([])
    })

    it('should detect role changes', () => {
      const baseline: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['authenticated'], definition: 'true', check: null },
      ]
      const current: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['public'], definition: 'true', check: null },
      ]

      const changes = rlsDriftService.getPolicyDiff(baseline, current)

      expect(changes).toHaveLength(1)
      expect(changes[0].field_diffs).toContain('roles')
    })

    it('should detect definition changes', () => {
      const baseline: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['authenticated'], definition: 'company_id = auth.uid()', check: null },
      ]
      const current: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['authenticated'], definition: 'true', check: null },
      ]

      const changes = rlsDriftService.getPolicyDiff(baseline, current)

      expect(changes).toHaveLength(1)
      expect(changes[0].field_diffs).toContain('definition')
    })
  })

  describe('detectDrift', () => {
    it('should detect drift when policies differ', async () => {
      const baseline: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['authenticated'], definition: 'true', check: null },
      ]
      mockRpc.mockResolvedValue({ data: [], error: null })

      const result = await rlsDriftService.detectDrift('comp-1', baseline)

      expect(result.detected).toBe(true)
      expect(result.changes).toHaveLength(1)
    })

    it('should return no drift when policies match', async () => {
      const baseline: RLSPolicyBaseline[] = [
        { table_name: 'candidates', policy_name: 'select_own', command: 'SELECT', roles: ['authenticated'], definition: 'true', check: null },
      ]
      mockRpc.mockResolvedValue({ data: baseline, error: null })

      const result = await rlsDriftService.detectDrift('comp-1', baseline)

      expect(result.detected).toBe(false)
      expect(result.changes).toEqual([])
    })

    it('should handle RPC error gracefully', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') })

      const result = await rlsDriftService.detectDrift('comp-1', [])

      expect(result.detected).toBe(false)
      expect(result.changes).toEqual([])
    })
  })

  describe('alertOnDrift', () => {
    it('should log security event when drift detected', async () => {
      const chain: Record<string, any> = {}
      const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle']
      methods.forEach((m) => { chain[m] = vi.fn(() => chain) })
      chain.then = (resolve: Function) => resolve({ data: { id: 'alert-1' }, error: null })
      mockFrom.mockReturnValue(chain)

      const driftResult = {
        detected: true,
        changes: [{ table_name: 'candidates', policy_name: 'test', change_type: 'added' as const }],
        checked_at: new Date().toISOString(),
      }

      const result = await rlsDriftService.alertOnDrift('comp-1', driftResult)
      expect(result).toBe(true)
    })

    it('should return false when no drift', async () => {
      const driftResult = { detected: false, changes: [], checked_at: new Date().toISOString() }

      const result = await rlsDriftService.alertOnDrift('comp-1', driftResult)
      expect(result).toBe(false)
    })
  })
})
