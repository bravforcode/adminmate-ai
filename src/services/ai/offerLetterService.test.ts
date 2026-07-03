import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  generateOfferLetter,
  validateOfferInput,
  validateOfferResult,
} from './offerLetterService'

describe('offerLetterService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
  })

  describe('validateOfferInput', () => {
    it('should pass for valid input', () => {
      const { valid } = validateOfferInput({ offerId: 'o1' })
      expect(valid).toBe(true)
    })

    it('should fail without offerId', () => {
      const { valid } = validateOfferInput({ offerId: '' })
      expect(valid).toBe(false)
    })

    it('should fail with invalid language', () => {
      const { valid } = validateOfferInput({ offerId: 'o1', language: 'fr' as any })
      expect(valid).toBe(false)
    })

    it('should accept valid languages', () => {
      for (const lang of ['th', 'en', 'vi', 'id'] as const) {
        const { valid } = validateOfferInput({ offerId: 'o1', language: lang })
        expect(valid).toBe(true)
      }
    })
  })

  describe('validateOfferResult', () => {
    it('should pass for valid result', () => {
      const result = {
        header: 'OFFER LETTER',
        employee_name: 'John Doe',
        company_name: 'Acme Corp',
        position: 'Senior Developer',
        salary_paragraph: 'Monthly salary of 80,000 THB',
        benefits_paragraph: 'Health insurance, 15 days vacation',
        working_conditions: 'Monday to Friday, 9am-6pm',
        termination_clause: '30 days notice period',
        confidentiality_clause: 'Employee agrees to maintain confidentiality',
      }
      const { valid } = validateOfferResult(result)
      expect(valid).toBe(true)
    })

    it('should fail when any required field missing', () => {
      const requiredFields = [
        'header', 'employee_name', 'company_name', 'position',
        'salary_paragraph', 'benefits_paragraph', 'working_conditions',
        'termination_clause', 'confidentiality_clause',
      ]

      for (const field of requiredFields) {
        const result = {
          header: 'OFFER LETTER',
          employee_name: 'John Doe',
          company_name: 'Acme Corp',
          position: 'Senior Developer',
          salary_paragraph: 'Salary',
          benefits_paragraph: 'Benefits',
          working_conditions: 'Conditions',
          termination_clause: 'Termination',
          confidentiality_clause: 'Confidentiality',
          [field]: '', // Empty this field
        }
        const { valid } = validateOfferResult(result)
        expect(valid).toBe(false)
      }
    })
  })

  describe('generateOfferLetter', () => {
    it('should call edge function and return offer letter', async () => {
      const mockResult = {
        success: true,
        data: {
          header: 'OFFER LETTER',
          employee_name: 'John Doe',
          company_name: 'Acme Corp',
          position: 'Senior Developer',
          salary_paragraph: 'Monthly salary of 80,000 THB',
          benefits_paragraph: 'Health insurance, 15 days vacation',
          working_conditions: 'Monday to Friday',
          termination_clause: '30 days notice',
          confidentiality_clause: 'Maintain confidentiality',
        },
      }

      mockFetch.mockResolvedValue({ json: () => Promise.resolve(mockResult) })

      const result = await generateOfferLetter({ offerId: 'o1', language: 'en' })

      expect(result.employee_name).toBe('John Doe')
      expect(result.salary_paragraph).toContain('80,000')
    })

    it('should throw on invalid input', async () => {
      await expect(
        generateOfferLetter({ offerId: '' })
      ).rejects.toThrow('Invalid input')
    })
  })
})
