import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import {
  getReferrals,
  getMyReferrals,
  createReferral,
  updateReferralStatus,
  setReferralBonus,
  markBonusPaid,
  deleteReferral,
} from '../../../src/services/referralService'

function mockSingle(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  }
}

describe('referralService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getReferrals queries by company_id', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [{ id: '1', company_id: 'c1' }], error: null }),
        }),
      }),
    })
    const result = await getReferrals('c1')
    expect(mockSupabase.from).toHaveBeenCalledWith('employee_referrals')
    expect(result).toEqual([{ id: '1', company_id: 'c1' }])
  })

  it('getMyReferrals queries by referrer_user_id', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [{ id: '1', referrer_user_id: 'u1' }], error: null }),
          }),
        }),
      }),
    })
    const result = await getMyReferrals('u1', 'c1')
    expect(result).toEqual([{ id: '1', referrer_user_id: 'u1' }])
  })

  it('createReferral inserts referral', async () => {
    const mockData = { id: 'new', candidate_name: 'John', status: 'submitted' }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue(mockSingle(mockData)),
    })
    const result = await createReferral({
      company_id: 'c1',
      referrer_user_id: 'u1',
      job_id: 'j1',
      candidate_name: 'John',
    })
    expect(result?.candidate_name).toBe('John')
  })

  it('updateReferralStatus updates status + timestamp', async () => {
    const mockData = { id: '1', status: 'reviewed', reviewed_at: '2024-01-01' }
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(mockSingle(mockData)),
      }),
    })
    const result = await updateReferralStatus('1', 'reviewed')
    expect(result?.status).toBe('reviewed')
  })

  it('setReferralBonus sets amount + approved status', async () => {
    const mockData = { id: '1', bonus_amount: 5000, bonus_status: 'approved' }
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(mockSingle(mockData)),
      }),
    })
    const result = await setReferralBonus('1', 5000)
    expect(result?.bonus_amount).toBe(5000)
    expect(result?.bonus_status).toBe('approved')
  })

  it('markBonusPaid updates bonus_status', async () => {
    const mockData = { id: '1', bonus_status: 'paid', bonus_paid_at: '2024-01-01' }
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(mockSingle(mockData)),
      }),
    })
    const result = await markBonusPaid('1')
    expect(result?.bonus_status).toBe('paid')
  })

  it('deleteReferral returns true on success', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
    const result = await deleteReferral('1')
    expect(result).toBe(true)
  })
})
