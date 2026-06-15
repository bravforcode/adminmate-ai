import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { pdpaService } from '../../../src/services/pdpaService'
import { sanitizeCSVCell } from '../../../src/services/pdpaService'

describe('pdpaService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('withdrawConsent', () => {
    it('updates consent to withdrawn', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: mockUpdate }),
      })

      await pdpaService.withdrawConsent('consent-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('pdpa_consents')
      const updateFn = mockSupabase.from.mock.results[0].value.update
      expect(updateFn).toHaveBeenCalledWith({
        consent_given: false,
        withdrawn_at: expect.any(String),
        purposes: [],
      })
      expect(mockUpdate).toHaveBeenCalledWith('id', 'consent-1')
    })

    it('throws on database error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
        }),
      })

      await expect(pdpaService.withdrawConsent('x')).rejects.toThrow('DB error')
    })
  })

  describe('exportUserData', () => {
    it('queries pdpa_consents with or filter instead of empty email', async () => {
      const chainable = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: { id: 'u1' }, error: null }),
      }
      mockSupabase.from.mockReturnValue(chainable)

      await pdpaService.exportUserData('user-1', 'company-1')

      const fromCalls = mockSupabase.from.mock.calls.filter(c => c[0] === 'pdpa_consents')
      expect(fromCalls.length).toBeGreaterThan(0)
      expect(chainable.or).toHaveBeenCalledWith('data_subject_email.eq.user-1,candidate_id.eq.user-1,employee_id.eq.user-1')
    })
  })

  describe('getConsentHistory', () => {
    it('returns consent records for user', async () => {
      const mockConsents = [{ id: 'c1', consent_type: 'recruitment', consent_given: true, purposes: ['recruitment_processing'], consent_form_version: '2.0', created_at: new Date().toISOString() }]
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockConsents, error: null }),
            }),
          }),
        }),
      })

      const result = await pdpaService.getConsentHistory('user-1', 'company-1')
      expect(result).toEqual(mockConsents)
      expect(mockSupabase.from).toHaveBeenCalledWith('pdpa_consents')
    })

    it('throws on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: new Error('Query failed') }),
            }),
          }),
        }),
      })

      await expect(pdpaService.getConsentHistory('u1', 'c1')).rejects.toThrow('Query failed')
    })

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      })

      const result = await pdpaService.getConsentHistory('u1', 'c1')
      expect(result).toEqual([])
    })
  })

  describe('sanitizeCSVCell', () => {
    it('returns value unchanged when no dangerous prefix', () => {
      expect(sanitizeCSVCell('hello')).toBe('hello')
      expect(sanitizeCSVCell('123')).toBe('123')
      expect(sanitizeCSVCell('normal text')).toBe('normal text')
    })

    it('prepends single quote when value starts with =', () => {
      expect(sanitizeCSVCell('=CMD("calc")')).toBe("'=CMD(\"calc\")")
    })

    it('prepends single quote when value starts with +', () => {
      expect(sanitizeCSVCell('+SUM(A1:A10)')).toBe("'+SUM(A1:A10)")
    })

    it('prepends single quote when value starts with -', () => {
      expect(sanitizeCSVCell('-1+1')).toBe("'-1+1")
    })

    it('prepends single quote when value starts with @', () => {
      expect(sanitizeCSVCell('@DDE')).toBe("'@DDE")
    })

    it('returns empty string unchanged', () => {
      expect(sanitizeCSVCell('')).toBe('')
    })
  })
})
