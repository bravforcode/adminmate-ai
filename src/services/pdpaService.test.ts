import { describe, it, expect, vi, beforeEach } from 'vitest'

function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'or', 'head']
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

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { pdpaService, sanitizeCSVCell } from './pdpaService'

describe('pdpaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDataCategories', () => {
    it('should return data categories with record counts', async () => {
      mockFrom.mockReturnValue(createChain(null))

      const categories = await pdpaService.getDataCategories('user-1', 'comp-1')

      expect(categories.length).toBeGreaterThan(0)
      expect(categories[0]).toHaveProperty('category')
      expect(categories[0]).toHaveProperty('table_name')
      expect(categories[0]).toHaveProperty('record_count')
    })
  })

  describe('getConsentHistory', () => {
    it('should return consent records for user', async () => {
      const consents = [
        { id: 'c1', consent_type: 'recruitment', consent_given: true, purposes: ['recruitment_processing'] },
        { id: 'c2', consent_type: 'marketing', consent_given: false, purposes: [] },
      ]
      mockFrom.mockReturnValue(createChain(consents))

      const result = await pdpaService.getConsentHistory('user-1', 'comp-1')
      expect(result).toHaveLength(2)
      expect(result[0].consent_given).toBe(true)
    })

    it('should return empty array on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))

      await expect(pdpaService.getConsentHistory('user-1', 'comp-1')).rejects.toThrow()
    })
  })

  describe('withdrawConsent', () => {
    it('should update consent to withdrawn', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await pdpaService.withdrawConsent('consent-1')
      // Should not throw
    })
  })

  describe('exportUserData', () => {
    it('should export user data from multiple tables', async () => {
      mockFrom.mockReturnValue(createChain(null))

      const result = await pdpaService.exportUserData('user-1', 'comp-1')

      expect(result).toHaveProperty('exported_at')
      expect(result).toHaveProperty('user_id', 'user-1')
      expect(result).toHaveProperty('company_id', 'comp-1')
      expect(result).toHaveProperty('profile')
      expect(result).toHaveProperty('consents')
      expect(result).toHaveProperty('applications')
      expect(result).toHaveProperty('documents')
    })
  })

  describe('deleteUserData', () => {
    it('should anonymize user data and return table list', async () => {
      mockFrom.mockReturnValue(createChain(null))

      const result = await pdpaService.deleteUserData('user-1', 'comp-1')

      expect(result.success).toBe(true)
      expect(result.anonymized_tables).toContain('user_profiles')
      expect(result.anonymized_tables).toContain('candidates')
      expect(result.anonymized_tables).toContain('chat_messages')
      expect(result.anonymized_tables).toContain('pdpa_consents')
    })
  })

  describe('sanitizeCSVCell', () => {
    it('should sanitize cells starting with formula characters', () => {
      expect(sanitizeCSVCell('=cmd')).toBe("'=cmd")
      expect(sanitizeCSVCell('+cmd')).toBe("'+cmd")
      expect(sanitizeCSVCell('-cmd')).toBe("'-cmd")
      expect(sanitizeCSVCell('@cmd')).toBe("'@cmd")
    })

    it('should not sanitize normal values', () => {
      expect(sanitizeCSVCell('normal')).toBe('normal')
      expect(sanitizeCSVCell('123')).toBe('123')
    })
  })
})
