import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { searchService } from '../../../src/services/searchService'

function mockChain(data: Record<string, unknown[]>) {
  const chain: Record<string, unknown> = {
    limit: vi.fn(() => ({ data: data.limit ?? null, error: null })),
  }
  const methods = ['select', 'eq', 'or', 'ilike', 'order', 'limit']
  methods.forEach((m) => {
    if (!chain[m]) {
      chain[m] = vi.fn(() => chain)
    }
  })
  return chain
}

function makeEmptyChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
}

describe('searchService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('globalSearch', () => {
    it('returns empty results for query shorter than 3 characters', async () => {
      const result = await searchService.globalSearch('c1', 'ab')
      expect(result).toEqual({ candidates: [], jobs: [], applications: [], interviews: [] })
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('returns empty results for empty query', async () => {
      const result = await searchService.globalSearch('c1', '')
      expect(result).toEqual({ candidates: [], jobs: [], applications: [], interviews: [] })
    })

    it('returns empty results for whitespace-only query', async () => {
      const result = await searchService.globalSearch('c1', '   ')
      expect(result).toEqual({ candidates: [], jobs: [], applications: [], interviews: [] })
    })

    it('performs search with valid query and maps results correctly', async () => {
      const mockCandidates = {
        data: [
          { id: 'cand-1', full_name: 'John Doe', current_position: 'Engineer', email: 'john@test.com', location: 'Bangkok' },
        ],
        error: null,
      }
      const mockJobs = { data: [], error: null }
      const mockApplications = { data: [], error: null }
      const mockInterviews = { data: [], error: null }

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn()
          .mockResolvedValueOnce(mockCandidates)
          .mockResolvedValueOnce(mockJobs)
          .mockResolvedValueOnce(mockApplications)
          .mockResolvedValueOnce(mockInterviews),
      }
      mockSupabase.from.mockReturnValue(chain)

      const result = await searchService.globalSearch('c1', 'john')

      expect(result.candidates).toHaveLength(1)
      expect(result.candidates[0].title).toBe('John Doe')
      expect(result.candidates[0].subtitle).toContain('Engineer')
      expect(result.candidates[0].type).toBe('candidate')
      expect(mockSupabase.from).toHaveBeenCalledTimes(4)
    })

    it('escapes % wildcard characters to prevent LIKE injection', async () => {
      const chain = makeEmptyChain()
      mockSupabase.from.mockReturnValue(chain)

      await searchService.globalSearch('c1', '%%%')

      const orCall = chain.or.mock.calls[0][0]
      expect(orCall).not.toContain('.ilike.%%%')
      expect(orCall).toContain('\\%')
    })

    it('escapes _ wildcard characters to prevent LIKE injection', async () => {
      const chain = makeEmptyChain()
      mockSupabase.from.mockReturnValue(chain)

      await searchService.globalSearch('c1', '___')

      const orCall = chain.or.mock.calls[0][0]
      expect(orCall).not.toContain('.ilike.___')
      expect(orCall).toContain('\\_')
    })

    it('escapes mixed % and _ characters', async () => {
      const chain = makeEmptyChain()
      mockSupabase.from.mockReturnValue(chain)

      await searchService.globalSearch('c1', 'a%b_c')

      const orCall = chain.or.mock.calls[0][0]
      expect(orCall).toContain('a\\%b\\_c')
    })

    it('handles null data gracefully', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn()
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: null, error: null }),
      }
      mockSupabase.from.mockReturnValue(chain)

      const result = await searchService.globalSearch('c1', 'test')
      expect(result).toEqual({ candidates: [], jobs: [], applications: [], interviews: [] })
    })

    it('passes company_id to all queries', async () => {
      const chain = makeEmptyChain()
      mockSupabase.from.mockReturnValue(chain)

      await searchService.globalSearch('company-xyz', 'search')

      const eqCalls = chain.eq.mock.calls
      expect(eqCalls.length).toBe(4)
      eqCalls.forEach((call: unknown[]) => {
        expect(call).toEqual(['company_id', 'company-xyz'])
      })
    })
  })
})
