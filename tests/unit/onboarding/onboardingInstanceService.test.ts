import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import {
  createOnboardingFromHired,
  getOnboardingInstance,
  listOnboardingInstances,
  calculateCompletion,
  completeOnboarding,
} from '../../../src/services/onboarding/onboardingInstanceService'

describe('onboardingInstanceService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockInstance = {
    id: 'inst-1',
    company_id: 'c1',
    candidate_id: 'cand-1',
    status: 'active',
    started_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  describe('createOnboardingFromHired', () => {
    it('creates instance from hired candidate with template items', async () => {
      const mockTemplate = { id: 'tpl-1' }
      const mockTemplateItems = [
        { id: 'ti-1', item_type: 'document', title: 'Submit ID', required: true, sort_order: 0, due_days_after_hire: 1, metadata: {} },
        { id: 'ti-2', item_type: 'task', title: 'Orientation', required: true, sort_order: 1, due_days_after_hire: 7, metadata: {} },
      ]

      let callIdx = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callIdx++
        if (table === 'onboarding_instances') {
          if (callIdx === 1) {
            // Check for existing
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    in: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                    }),
                  }),
                }),
              }),
            }
          }
          // Create instance
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockInstance, error: null }),
              }),
            }),
          }
        }
        if (table === 'onboarding_templates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: mockTemplate }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'onboarding_template_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockTemplateItems }),
              }),
            }),
          }
        }
        if (table === 'onboarding_instance_items') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      })

      const result = await createOnboardingFromHired('c1', 'cand-1', 'app-1', 'job-1', 'hr-1')
      expect(result.id).toBe('inst-1')
      expect(result.status).toBe('active')
    })

    it('throws if active onboarding already exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-inst' } }),
              }),
            }),
          }),
        }),
      })

      await expect(createOnboardingFromHired('c1', 'cand-1')).rejects.toThrow('Active onboarding already exists')
    })

    it('creates audit log on creation', async () => {
      const auditInsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'onboarding_instances') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockInstance, error: null }),
              }),
            }),
          }
        }
        if (table === 'onboarding_templates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: auditInsert }
        return {}
      })

      await createOnboardingFromHired('c1', 'cand-1', undefined, undefined, 'hr-1')
      expect(auditInsert).toHaveBeenCalled()
      expect(auditInsert.mock.calls[0][0].action).toBe('onboarding.created')
    })
  })

  describe('calculateCompletion', () => {
    it('calculates 100% when all required items complete', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { required: true, status: 'verified' },
              { required: true, status: 'completed' },
              { required: false, status: 'pending' },
            ],
            error: null,
          }),
        }),
      })

      const result = await calculateCompletion('inst-1')
      expect(result.percentage).toBe(100)
      expect(result.totalRequired).toBe(2)
      expect(result.completedRequired).toBe(2)
    })

    it('calculates 50% when half required items complete', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { required: true, status: 'verified' },
              { required: true, status: 'pending' },
            ],
            error: null,
          }),
        }),
      })

      const result = await calculateCompletion('inst-1')
      expect(result.percentage).toBe(50)
    })

    it('returns 100% when no items exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      const result = await calculateCompletion('inst-1')
      expect(result.percentage).toBe(100)
      expect(result.totalItems).toBe(0)
    })

    it('counts skipped items as completed', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { required: true, status: 'verified' },
              { required: true, status: 'skipped' },
            ],
            error: null,
          }),
        }),
      })

      const result = await calculateCompletion('inst-1')
      expect(result.percentage).toBe(100)
    })
  })

  describe('completeOnboarding', () => {
    it('completes when all required items done', async () => {
      // calculateCompletion call
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { required: true, status: 'verified' },
          ],
          error: null,
        }),
      })

      let callIdx = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callIdx++
        if (table === 'onboarding_instance_items') {
          return { select: selectMock }
        }
        if (table === 'onboarding_instances') {
          if (callIdx <= 2) {
            // First: update, Second: select for audit
            return {
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
              select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { company_id: 'c1' }, error: null }) }) }),
            }
          }
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { company_id: 'c1' }, error: null }) }) }) }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      await completeOnboarding('inst-1', 'hr-1')
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('throws when required items remain without override', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { required: true, status: 'verified' },
              { required: true, status: 'pending' },
            ],
            error: null,
          }),
        }),
      })

      await expect(completeOnboarding('inst-1', 'hr-1')).rejects.toThrow('Cannot complete')
    })

    it('allows override with reason', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'onboarding_instance_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { required: true, status: 'verified' },
                  { required: true, status: 'pending' },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'onboarding_instances') {
          return {
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { company_id: 'c1' }, error: null }) }) }),
          }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      await completeOnboarding('inst-1', 'hr-1', 'Approved by management')
      expect(mockSupabase.from).toHaveBeenCalled()
    })
  })

  describe('listOnboardingInstances', () => {
    it('returns instances for company', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [mockInstance], error: null }),
          }),
        }),
      })

      const result = await listOnboardingInstances('c1')
      expect(result).toHaveLength(1)
    })

    it('applies status filter', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: [mockInstance], error: null })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: orderMock,
            }),
          }),
        }),
      })

      const result = await listOnboardingInstances('c1', { status: 'active' })
      expect(result).toHaveLength(1)
    })
  })
})
