import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { candidateService } from '../../../src/services/candidateService'

describe('candidateService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getAll: returns candidates filtered by companyId', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [{ id: '1', full_name: 'Test', company_id: 'c1' }], error: null }),
          }),
        }),
      }),
    })
    const result = await candidateService.getAll('c1')
    expect(mockSupabase.from).toHaveBeenCalledWith('candidates')
    expect(result.data).toHaveLength(1)
  })

  it('create: inserts candidate', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new', full_name: 'New', company_id: 'c1' }, error: null })
    const mockSelect = vi.fn()
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ count: 0, error: null }) })
      .mockReturnValueOnce({ single: mockSingle })
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'companies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { subscription_tier: 'pro' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'candidates') {
        return {
          select: mockSelect,
          insert: vi.fn().mockReturnValue({ select: mockSelect }),
        }
      }
      return {}
    })
    const result = await candidateService.create({ full_name: 'New', company_id: 'c1' })
    expect(result.full_name).toBe('New')
  })

  it('update: updates candidate by id', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: '1', full_name: 'Updated' }, error: null }),
          }),
        }),
      }),
    })
    const result = await candidateService.update('1', { full_name: 'Updated' })
    expect(result.full_name).toBe('Updated')
  })

  it('getById: returns candidate with cv_documents and applications', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: '1', full_name: 'Test', cv_documents: [], applications: [] },
              error: null,
            }),
          }),
        }),
      }),
    })
    const result = await candidateService.getById('1', 'c1')
    expect(result.id).toBe('1')
  })
})
