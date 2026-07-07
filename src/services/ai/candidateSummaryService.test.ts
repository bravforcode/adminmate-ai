import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
const mockFrom = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit']
  methods.forEach((m) => { chain[m] = vi.fn(() => chain) })
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error })
  }
  return chain
}

import {
  generateCandidateSummary,
  getCandidateSummaries,
  validateSummaryInput,
  validateSummaryResult,
} from './candidateSummaryService'

describe('candidateSummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
  })

  describe('validateSummaryInput', () => {
    it('should pass for valid input', () => {
      const { valid } = validateSummaryInput({ candidateId: 'c1', companyId: 'co1' })
      expect(valid).toBe(true)
    })

    it('should fail without candidateId', () => {
      const { valid } = validateSummaryInput({ candidateId: '', companyId: 'co1' })
      expect(valid).toBe(false)
    })

    it('should fail without companyId', () => {
      const { valid } = validateSummaryInput({ candidateId: 'c1', companyId: '' })
      expect(valid).toBe(false)
    })
  })

  describe('validateSummaryResult', () => {
    it('should pass for valid result', () => {
      const result = {
        summary: 'Strong frontend developer with 5 years React experience',
        strengths: ['React', 'TypeScript'],
        gaps: ['No backend experience'],
        redFlags: [],
        confidence: 'medium' as const,
      }
      const { valid } = validateSummaryResult(result)
      expect(valid).toBe(true)
    })

    it('should fail without summary', () => {
      const result = {
        summary: '',
        strengths: [],
        gaps: [],
        redFlags: [],
        confidence: 'low' as const,
      }
      const { valid } = validateSummaryResult(result)
      expect(valid).toBe(false)
    })

    it('should fail with invalid confidence', () => {
      const result = {
        summary: 'Summary',
        strengths: [],
        gaps: [],
        redFlags: [],
        confidence: 'invalid' as any,
      }
      const { valid } = validateSummaryResult(result)
      expect(valid).toBe(false)
    })
  })

  describe('generateCandidateSummary', () => {
    it('should call edge function and return summary', async () => {
      const mockSummary = {
        success: true,
        summary: {
          summary: 'Experienced developer',
          strengths: ['React', 'Node.js'],
          gaps: ['No Python'],
          redFlags: [],
          confidence: 'high',
        },
      }

      mockFetch.mockResolvedValue({ json: () => Promise.resolve(mockSummary) })

      const result = await generateCandidateSummary({
        candidateId: 'c1',
        companyId: 'co1',
      })

      expect(result.summary).toBe('Experienced developer')
      expect(result.strengths).toContain('React')
      expect(result.confidence).toBe('high')
    })
  })

  describe('getCandidateSummaries', () => {
    it('should fetch summaries from DB', async () => {
      const summaries = [
        { id: '1', summary: 'Summary 1', confidence: 'high' },
        { id: '2', summary: 'Summary 2', confidence: 'medium' },
      ]
      mockFrom.mockReturnValue(createChain(summaries))

      const result = await getCandidateSummaries('co1', 'c1')
      expect(result).toHaveLength(2)
    })
  })
})
