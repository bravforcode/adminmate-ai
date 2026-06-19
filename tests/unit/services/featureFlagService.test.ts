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
        p_org_id: null,
      })
    })

    it('returns false when feature is disabled', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      const result = await isFeatureEnabled('ai_matching')
      expect(result).toBe(false)
    })

    it('passes org_id when provided', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      await isFeatureEnabled('payroll_enabled', 'org-123')
      expect(mockRpc).toHaveBeenCalledWith('is_feature_enabled', {
        p_feature_key: 'payroll_enabled',
        p_org_id: 'org-123',
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
  })
})
