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

import { killSwitchService } from '../../../src/services/integration/killSwitchService'

describe('killSwitchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('activate', () => {
    it('calls rpc with provider name and reason', async () => {
      mocks.mockRpc.mockResolvedValue({ error: null })
      await killSwitchService.activate('openai', 'rate limit exceeded')
      expect(mocks.mockRpc).toHaveBeenCalledWith('activate_kill_switch', {
        p_provider_name: 'openai',
        p_reason: 'rate limit exceeded',
      })
    })
  })

  describe('isKilled', () => {
    it('returns true when kill switch flag is active', async () => {
      mocks.mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { is_active: true }, error: null }),
          }),
        }),
      })
      const result = await killSwitchService.isKilled('openai')
      expect(result).toBe(true)
    })

    it('returns false when kill switch flag is inactive', async () => {
      mocks.mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { is_active: false }, error: null }),
          }),
        }),
      })
      const result = await killSwitchService.isKilled('openai')
      expect(result).toBe(false)
    })

    it('returns false when flag does not exist', async () => {
      mocks.mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      })
      const result = await killSwitchService.isKilled('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('deactivate', () => {
    it('sets is_active to false for the kill switch flag', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      mocks.mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: mockEq }),
      })
      await killSwitchService.deactivate('openai')
      expect(mockEq).toHaveBeenCalledWith('flag_name', 'kill_switch_openai')
    })
  })

  describe('getActive', () => {
    it('returns provider names with active kill switches', async () => {
      mocks.mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          like: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { flag_name: 'kill_switch_openai' },
                { flag_name: 'kill_switch_stripe' },
              ],
              error: null,
            }),
          }),
        }),
      })
      const result = await killSwitchService.getActive()
      expect(result).toEqual(['openai', 'stripe'])
    })

    it('returns empty array when no kill switches are active', async () => {
      mocks.mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          like: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })
      const result = await killSwitchService.getActive()
      expect(result).toEqual([])
    })
  })
})
