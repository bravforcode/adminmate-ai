import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { jobService } from '../../../src/services/jobService'

describe('jobService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getAll: returns jobs filtered by companyId', async () => {
    const mockJobs = [{ id: '1', title: 'Developer', company_id: 'c1', status: 'active' }]
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
        }),
      }),
    })

    const result = await jobService.getAll('c1')
    expect(result).toEqual(mockJobs)
    expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
  })

  it('create: throws on database error', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB write error') }),
        }),
      }),
    })

    await expect(jobService.create({ title: 'Test Job', company_id: 'x' } as any)).rejects.toThrow('DB write error')
  })

  it('updateStatus: calls update with status', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ data: { id: '1', status: 'closed' }, error: null })
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: mockUpdate }),
        }),
      }),
    })

    await jobService.updateStatus('1', 'closed')
    expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
  })
})
