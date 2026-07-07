import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    rpc: mocks.mockRpc,
    from: mocks.mockFrom,
  },
}))

import { rlsDriftService } from '../../../src/services/security/rlsDriftService'
import type { RLSPolicyBaseline } from '../../../src/services/security/rlsDriftService'

describe('rlsDriftService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseline: RLSPolicyBaseline[] = [
    {
      table_name: 'users',
      policy_name: 'users_select',
      command: 'SELECT',
      roles: ['authenticated'],
      definition: 'true',
      check: null,
    },
    {
      table_name: 'users',
      policy_name: 'users_insert',
      command: 'INSERT',
      roles: ['authenticated'],
      definition: null,
      check: 'true',
    },
  ]

  describe('getPolicyDiff', () => {
    it('returns empty array when policies match', () => {
      const current = [...baseline]
      const result = rlsDriftService.getPolicyDiff(baseline, current)
      expect(result).toEqual([])
    })

    it('detects removed policy', () => {
      const current = [baseline[0]]
      const result = rlsDriftService.getPolicyDiff(baseline, current)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        table_name: 'users',
        policy_name: 'users_insert',
        change_type: 'removed',
      })
    })

    it('detects added policy', () => {
      const current: RLSPolicyBaseline[] = [
        ...baseline,
        {
          table_name: 'orders',
          policy_name: 'orders_select',
          command: 'SELECT',
          roles: ['admin'],
          definition: 'true',
          check: null,
        },
      ]
      const result = rlsDriftService.getPolicyDiff(baseline, current)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        table_name: 'orders',
        policy_name: 'orders_select',
        change_type: 'added',
      })
    })

    it('detects modified definition', () => {
      const current: RLSPolicyBaseline[] = [
        {
          ...baseline[0],
          definition: 'false',
        },
        baseline[1],
      ]
      const result = rlsDriftService.getPolicyDiff(baseline, current)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        table_name: 'users',
        policy_name: 'users_select',
        change_type: 'modified',
        field_diffs: ['definition'],
      })
    })

    it('detects modified roles', () => {
      const current: RLSPolicyBaseline[] = [
        {
          ...baseline[0],
          roles: ['admin'],
        },
        baseline[1],
      ]
      const result = rlsDriftService.getPolicyDiff(baseline, current)
      expect(result).toHaveLength(1)
      expect(result[0].field_diffs).toContain('roles')
    })

    it('detects multiple field changes', () => {
      const current: RLSPolicyBaseline[] = [
        {
          table_name: 'users',
          policy_name: 'users_select',
          command: 'DELETE',
          roles: ['admin'],
          definition: 'false',
          check: null,
        },
        baseline[1],
      ]
      const result = rlsDriftService.getPolicyDiff(baseline, current)
      expect(result).toHaveLength(1)
      expect(result[0].field_diffs).toContain('command')
      expect(result[0].field_diffs).toContain('roles')
      expect(result[0].field_diffs).toContain('definition')
    })

    it('detects added and removed simultaneously', () => {
      const current: RLSPolicyBaseline[] = [
        baseline[1],
        {
          table_name: 'orders',
          policy_name: 'orders_select',
          command: 'SELECT',
          roles: ['admin'],
          definition: 'true',
          check: null,
        },
      ]
      const result = rlsDriftService.getPolicyDiff(baseline, current)
      expect(result).toHaveLength(2)
      const types = result.map(r => r.change_type)
      expect(types).toContain('removed')
      expect(types).toContain('added')
    })
  })

  describe('detectDrift', () => {
    it('returns no drift when policies match baseline', async () => {
      mocks.mockRpc.mockResolvedValue({
        data: baseline.map(p => ({
          ...p,
          roles: p.roles,
        })),
        error: null,
      })

      const result = await rlsDriftService.detectDrift('company-1', baseline)
      expect(result.detected).toBe(false)
      expect(result.changes).toEqual([])
    })

    it('returns drift when policies differ', async () => {
      const current = [baseline[0]]
      mocks.mockRpc.mockResolvedValue({ data: current, error: null })

      const result = await rlsDriftService.detectDrift('company-1', baseline)
      expect(result.detected).toBe(true)
      expect(result.changes.length).toBeGreaterThan(0)
    })

    it('returns no drift on RPC error', async () => {
      mocks.mockRpc.mockResolvedValue({ data: null, error: { message: 'db down' } })

      const result = await rlsDriftService.detectDrift('company-1', baseline)
      expect(result.detected).toBe(false)
      expect(result.changes).toEqual([])
    })
  })

  describe('alertOnDrift', () => {
    it('returns false when no drift detected', async () => {
      const driftResult = {
        detected: false,
        changes: [],
        checked_at: new Date().toISOString(),
      }
      const result = await rlsDriftService.alertOnDrift('company-1', driftResult)
      expect(result).toBe(false)
      expect(mocks.mockFrom).not.toHaveBeenCalled()
    })

    it('inserts audit log and returns true when drift detected', async () => {
      const driftResult = {
        detected: true,
        changes: [
          {
            table_name: 'users',
            policy_name: 'users_select',
            change_type: 'modified' as const,
            field_diffs: ['definition'],
          },
        ],
        checked_at: new Date().toISOString(),
      }

      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      mocks.mockFrom.mockReturnValue({ insert: mockInsert })

      const result = await rlsDriftService.alertOnDrift('company-1', driftResult)
      expect(result).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-1',
          event_type: 'rls_drift_detected',
          severity: 'critical',
          resource_type: 'rls_policy',
        })
      )
    })

    it('returns false on insert error', async () => {
      const driftResult = {
        detected: true,
        changes: [],
        checked_at: new Date().toISOString(),
      }

      const mockInsert = vi.fn().mockResolvedValue({ error: { message: 'insert failed' } })
      mocks.mockFrom.mockReturnValue({ insert: mockInsert })

      const result = await rlsDriftService.alertOnDrift('company-1', driftResult)
      expect(result).toBe(false)
    })
  })
})
