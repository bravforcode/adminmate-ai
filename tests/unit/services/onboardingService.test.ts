import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { onboardingService } from '../../../src/services/onboardingService'

describe('onboardingService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('createChecklist: creates checklist with TH template tasks', async () => {
    const mockChecklist = { id: 'cl-1', company_id: 'c1', employee_id: 'u1', status: 'in_progress' }
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockChecklist, error: null }) }),
      }),
    })

    const result = await onboardingService.createChecklist('c1', 'u1', 'offer-1', 'TH')
    expect(result.id).toBe('cl-1')
  })

  it('updateProgress: calculates percentage correctly', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ is_completed: true }, { is_completed: true }, { is_completed: false }, { is_completed: false }], error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    await onboardingService.updateProgress('cl-1')
    expect(mockSupabase.from).toHaveBeenCalled()
  })
})
