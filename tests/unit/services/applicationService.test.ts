import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn(), functions: { invoke: vi.fn() } }))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { applicationService } from '../../../src/services/applicationService'

describe('applicationService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getByJob: returns applications for a job', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: '1', job_id: 'j1', candidates: { full_name: 'Test' } }],
            error: null,
          }),
        }),
      }),
    })
    const result = await applicationService.getByJob('j1')
    expect(result).toHaveLength(1)
    expect(mockSupabase.from).toHaveBeenCalledWith('applications')
  })

  it('create: inserts application', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new', job_id: 'j1', company_id: 'c1', status: 'applied' },
            error: null,
          }),
        }),
      }),
    })
    const result = await applicationService.create({ job_id: 'j1', company_id: 'c1' })
    expect(result.status).toBe('applied')
  })

  it('updateStatus: sets status and timestamps', async () => {
    // Chain: from().update().eq().select().single()
    const selectSingle = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: '1', status: 'hired' }, error: null }),
    })
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: selectSingle,
        }),
      }),
    })
    const result = await applicationService.updateStatus('1', 'hired')
    expect(result.status).toBe('hired')
  })

  it('updateStatus: filters by companyId when provided', async () => {
    // Chain: from().update().eq('id').eq('company_id').select().single()
    const selectSingle = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: '1', status: 'rejected' }, error: null }),
    })
    const secondEq = vi.fn().mockReturnValue({
      select: selectSingle,
    })
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: secondEq,
          select: selectSingle,
        }),
      }),
    })
    const result = await applicationService.updateStatus('1', 'rejected', 'No fit', 'c1')
    expect(result.status).toBe('rejected')
    expect(secondEq).toHaveBeenCalledWith('company_id', 'c1')
  })
})
