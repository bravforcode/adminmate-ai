import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

describe('sensitiveFieldService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  async function loadService() {
    const mod = await import('../../../src/services/sensitiveFieldService')
    return mod
  }

  describe('getSensitiveFieldNames', () => {
    it('returns field names from RPC', async () => {
      mockRpc.mockResolvedValue({ data: ['age', 'gender', 'race', 'religion'], error: null })
      const { getSensitiveFieldNames } = await loadService()
      const result = await getSensitiveFieldNames()
      expect(result).toEqual(['age', 'gender', 'race', 'religion'])
      expect(mockRpc).toHaveBeenCalledWith('get_sensitive_field_names', {})
    })

    it('returns empty array on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } })
      const { getSensitiveFieldNames } = await loadService()
      const result = await getSensitiveFieldNames()
      expect(result).toEqual([])
    })
  })

  describe('excludeSensitiveFields', () => {
    it('removes sensitive fields from data object', async () => {
      mockRpc.mockResolvedValue({ data: ['age', 'gender', 'race'], error: null })
      const { excludeSensitiveFields } = await loadService()

      const result = await excludeSensitiveFields({
        full_name: 'John Doe',
        skills: ['React', 'TypeScript'],
        age: 30,
        gender: 'male',
        race: 'Asian',
        email: 'john@example.com',
      })

      expect(result.full_name).toBe('John Doe')
      expect(result.skills).toEqual(['React', 'TypeScript'])
      expect(result.email).toBe('john@example.com')
      expect(result).not.toHaveProperty('age')
      expect(result).not.toHaveProperty('gender')
      expect(result).not.toHaveProperty('race')
    })
  })

  describe('isSensitiveFieldSync', () => {
    it('returns false when cache is not populated', async () => {
      const { isSensitiveFieldSync } = await loadService()
      expect(isSensitiveFieldSync('age')).toBe(false)
    })
  })

  describe('sensitive_field_registry naming', () => {
    it('calls RPC function matching migration table name (sensitive_field_registry)', async () => {
      mockRpc.mockResolvedValue({ data: ['age', 'gender'], error: null })
      const { getSensitiveFieldNames } = await loadService()
      await getSensitiveFieldNames()
      // The SQL function is get_sensitive_field_names() which queries sensitive_field_registry
      expect(mockRpc).toHaveBeenCalledWith('get_sensitive_field_names', {})
    })
  })
})
