import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))
vi.mock('../../../src/lib/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

import { isFeatureEnabled, clearFlagCache } from '../../../src/services/featureFlagService'

describe('featureFlagService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFlagCache()
  })

  describe('isFeatureEnabled', () => {
    it('returns true when feature is enabled globally', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      const result = await isFeatureEnabled('payroll_enabled')
      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('is_feature_enabled', {
        p_feature_key: 'payroll_enabled',
        p_company_id: null,
      })
    })

    it('returns false when feature is disabled', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      const result = await isFeatureEnabled('ai_matching')
      expect(result).toBe(false)
    })

    it('passes company_id when provided', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      await isFeatureEnabled('payroll_enabled', 'org-123')
      expect(mockRpc).toHaveBeenCalledWith('is_feature_enabled', {
        p_feature_key: 'payroll_enabled',
        p_company_id: 'org-123',
      })
    })

    it('caches results', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      await isFeatureEnabled('payroll_enabled')
      await isFeatureEnabled('payroll_enabled')
      expect(mockRpc).toHaveBeenCalledTimes(1)
    })

    it('returns false on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } })
      const result = await isFeatureEnabled('payroll_enabled')
      expect(result).toBe(false)
    })

    it('clearFlagCache resets cache', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      await isFeatureEnabled('payroll_enabled')
      clearFlagCache()
      mockRpc.mockResolvedValue({ data: false, error: null })
      await isFeatureEnabled('payroll_enabled')
      expect(mockRpc).toHaveBeenCalledTimes(2)
    })

    it('uses company_id scoping (not organization_id)', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      await isFeatureEnabled('payroll_enabled', 'company-abc')
      expect(mockRpc).toHaveBeenCalledWith('is_feature_enabled', {
        p_feature_key: 'payroll_enabled',
        p_company_id: 'company-abc',
      })
      // Verify no org_id parameter leaks through
      expect(mockRpc).not.toHaveBeenCalledWith(
        expect.objectContaining({ p_org_id: expect.anything() })
      )
    })

    it('different company IDs produce separate cache entries', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      await isFeatureEnabled('payroll_enabled', 'company-1')
      await isFeatureEnabled('payroll_enabled', 'company-2')
      // Two calls: different cache keys
      expect(mockRpc).toHaveBeenCalledTimes(2)
    })
  })
})
