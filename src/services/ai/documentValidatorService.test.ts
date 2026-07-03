import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  validateDocument,
  validateDocumentInput,
  validateDocumentResult,
} from './documentValidatorService'

describe('documentValidatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
  })

  describe('validateDocumentInput', () => {
    it('should pass for valid input', () => {
      const { valid } = validateDocumentInput({
        documentType: 'offer_letter',
        documentContent: 'This is a valid document with enough content',
      })
      expect(valid).toBe(true)
    })

    it('should fail without documentType', () => {
      const { valid } = validateDocumentInput({
        documentType: '',
        documentContent: 'Valid content here',
      })
      expect(valid).toBe(false)
    })

    it('should fail with short content', () => {
      const { valid } = validateDocumentInput({
        documentType: 'contract',
        documentContent: 'short',
      })
      expect(valid).toBe(false)
    })
  })

  describe('validateDocumentResult', () => {
    it('should pass for valid result', () => {
      const result = {
        completeness: 85,
        fields: [
          { name: 'employee_name', status: 'present' as const, value: 'John Doe' },
          { name: 'salary', status: 'missing' as const, issue: 'Not specified' },
        ],
        issues: ['Missing salary'],
        suggestions: ['Add salary information'],
        isValid: false,
      }
      const { valid } = validateDocumentResult(result)
      expect(valid).toBe(true)
    })

    it('should fail with completeness > 100', () => {
      const result = {
        completeness: 150,
        fields: [],
        issues: [],
        suggestions: [],
        isValid: true,
      }
      const { valid } = validateDocumentResult(result)
      expect(valid).toBe(false)
    })

    it('should fail with invalid field status', () => {
      const result = {
        completeness: 50,
        fields: [{ name: 'field', status: 'invalid_status' as any }],
        issues: [],
        suggestions: [],
        isValid: false,
      }
      const { valid } = validateDocumentResult(result)
      expect(valid).toBe(false)
    })
  })

  describe('validateDocument', () => {
    it('should call edge function and return validation', async () => {
      const mockResult = {
        success: true,
        data: {
          completeness: 75,
          fields: [
            { name: 'header', status: 'present', value: 'Offer Letter' },
            { name: 'salary', status: 'missing', issue: 'Not specified' },
          ],
          issues: ['Missing salary information'],
          suggestions: ['Add salary and benefits details'],
          isValid: false,
        },
      }

      mockFetch.mockResolvedValue({ json: () => Promise.resolve(mockResult) })

      const result = await validateDocument({
        documentType: 'offer_letter',
        documentContent: 'This is an offer letter document with some content',
      })

      expect(result.completeness).toBe(75)
      expect(result.fields).toHaveLength(2)
    })
  })
})
