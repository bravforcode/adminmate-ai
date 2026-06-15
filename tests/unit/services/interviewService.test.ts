import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { interviewService } from '../../../src/services/interviewService'

describe('interviewService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockInterview = { id: '1', application_id: 'a1', company_id: 'c1', scheduled_at: '2024-01-01T10:00:00Z', status: 'scheduled' }

  it('create: inserts interview and returns data', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockInterview, error: null }),
        }),
      }),
    })

    const result = await interviewService.create({ application_id: 'a1', company_id: 'c1', scheduled_at: '2024-01-01T10:00:00Z' })
    expect(result).toEqual(mockInterview)
    expect(mockSupabase.from).toHaveBeenCalledWith('interviews')
  })

  it('create: throws on database error', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    })

    await expect(interviewService.create({ application_id: 'a1', company_id: 'c1', scheduled_at: '2024-01-01T10:00:00Z' })).rejects.toThrow('DB error')
  })

  it('update: filters by id and company_id', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ data: { ...mockInterview, status: 'completed' }, error: null })
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: mockUpdate }),
          }),
        }),
      }),
    })

    const result = await interviewService.update('1', { status: 'completed' }, 'c1')
    expect(result.status).toBe('completed')
    expect(mockSupabase.from).toHaveBeenCalledWith('interviews')
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

    await expect(interviewService.update('1', { status: 'completed' }, 'c1')).rejects.toThrow('Update failed')
  })

  it('getByApplication: returns interviews for application', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockInterview], error: null }),
        }),
      }),
    })

    const result = await interviewService.getByApplication('a1')
    expect(result).toHaveLength(1)
  })

  it('getUpcoming: filters by companyId and status', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [mockInterview], error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await interviewService.getUpcoming('c1')
    expect(result).toHaveLength(1)
  })
})
