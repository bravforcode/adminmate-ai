import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  functions: { invoke: vi.fn() },
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { offerService } from '../../../src/services/offerService'

describe('offerService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockOffer = { id: '1', company_id: 'c1', candidate_id: 'cand1', job_id: 'j1', position_title: 'Developer', status: 'draft' }

  it('create: inserts offer and returns data', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockOffer, error: null }),
        }),
      }),
    })

    const result = await offerService.create({ company_id: 'c1', candidate_id: 'cand1', job_id: 'j1', position_title: 'Developer' })
    expect(result).toEqual(mockOffer)
    expect(mockSupabase.from).toHaveBeenCalledWith('offers')
  })

  it('create: throws on database error', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    })

    await expect(offerService.create({ company_id: 'c1', candidate_id: 'cand1', job_id: 'j1' })).rejects.toThrow('DB error')
  })

  it('update: filters by id and company_id', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ data: { ...mockOffer, status: 'sent' }, error: null })
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: mockUpdate }),
          }),
        }),
      }),
    })

    const result = await offerService.update('1', { status: 'sent' }, 'c1')
    expect(result.status).toBe('sent')
    expect(mockSupabase.from).toHaveBeenCalledWith('offers')
  })

  it('update: throws on database error', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }) }),
          }),
        }),
      }),
    })

    await expect(offerService.update('1', { status: 'sent' }, 'c1')).rejects.toThrow('Update failed')
  })

  it('getById: filters by id and company_id', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockOffer, error: null }),
          }),
        }),
      }),
    })

    const result = await offerService.getById('1', 'c1')
    expect(result.company_id).toBe('c1')
    expect(mockSupabase.from).toHaveBeenCalledWith('offers')
  })

  it('getById: throws on database error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
          }),
        }),
      }),
    })

    await expect(offerService.getById('1', 'c1')).rejects.toThrow('Not found')
  })

  it('getAll: returns offers filtered by companyId', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockOffer], error: null }),
        }),
      }),
    })

    const result = await offerService.getAll('c1')
    expect(result).toHaveLength(1)
  })
})
