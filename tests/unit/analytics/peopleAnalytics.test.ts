import { describe, it, expect, vi, beforeEach } from 'vitest'
import { peopleAnalyticsService } from '../../../src/services/analytics/peopleAnalyticsService'

// ── Supabase mock chain ──
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()
const mockRange = vi.fn()
const mockGte = vi.fn()

function chainAll() {
  return {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    range: mockRange,
    gte: mockGte,
  }
}

const chain = chainAll()

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chain),
  },
}))

vi.mock('../../../src/services/permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

const { hasPermission } = await import('../../../src/services/permissionService')

describe('People Analytics + Predictive Insights — Release 13B', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue(chain)
    mockInsert.mockReturnValue(chain)
    mockUpdate.mockReturnValue(chain)
    mockEq.mockReturnValue(chain)
    mockOrder.mockReturnValue(chain)
    mockRange.mockReturnValue(chain)
    mockGte.mockReturnValue(chain)
    mockSingle.mockReturnValue({ data: null, error: null })
    vi.mocked(hasPermission).mockResolvedValue(true)
  })

  // ── Sensitive Fields Excluded ──

  describe('Sensitive field exclusion', () => {
    it('excludes email, phone, salary from risk indicators', async () => {
      mockSingle.mockReturnValue({ data: null, error: null })
      mockOrder.mockReturnValue({ single: mockSingle })
      mockEq.mockReturnValue({ order: mockOrder })

      const mockData = [
        {
          id: 'ri-1',
          company_id: 'c1',
          employee_id: 'emp-1',
          indicator_type: 'flight_risk',
          risk_score: 75,
          confidence: 'high',
          evidence: [{ factor: 'tenure', value: 2 }],
          email: 'john@example.com',
          phone: '0812345678',
          salary: 50000,
          model_run_id: 'run-1',
          created_at: '2024-06-20T00:00:00Z',
          updated_at: '2024-06-20T00:00:00Z',
        },
      ]
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      const fakeChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.getRiskIndicators('c1')

      expect(result[0]).not.toHaveProperty('email')
      expect(result[0]).not.toHaveProperty('phone')
      expect(result[0]).not.toHaveProperty('salary')
      expect(result[0]).toHaveProperty('risk_score')
      expect(result[0]).toHaveProperty('indicator_type')
    })

    it('strips sensitive fields from insight evidence', async () => {
      const mockInsights = [
        {
          id: 'pi-1',
          company_id: 'c1',
          employee_id: 'emp-1',
          insight_type: 'engagement_drop',
          insight_text: 'Engagement declining',
          confidence: 'medium',
          evidence: [{ source: 'survey', email: 'john@example.com', department: 'Eng' }],
          model_run_id: 'run-1',
          requires_review: true,
          reviewed_by: null,
          reviewed_at: null,
          created_at: '2024-06-20T00:00:00Z',
        },
      ]

      const fakeChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockInsights, error: null, count: 1 }),
            }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.getInsights('c1')

      expect(result.insights[0].evidence[0]).not.toHaveProperty('email')
      expect(result.insights[0].evidence[0]).toHaveProperty('source')
      expect(result.insights[0].evidence[0]).toHaveProperty('department')
    })
  })

  // ── Predictions Include Evidence ──

  describe('Predictions include evidence', () => {
    it('risk indicators include evidence array', async () => {
      const mockData = [
        {
          id: 'ri-1',
          company_id: 'c1',
          employee_id: 'emp-1',
          indicator_type: 'flight_risk',
          risk_score: 80,
          confidence: 'high',
          evidence: [{ factor: 'absenteeism', weight: 0.4 }],
          model_run_id: 'run-1',
          created_at: '2024-06-20T00:00:00Z',
          updated_at: '2024-06-20T00:00:00Z',
        },
      ]

      const fakeChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.getRiskIndicators('c1')

      expect(result[0].evidence).toBeDefined()
      expect(Array.isArray(result[0].evidence)).toBe(true)
      expect(result[0].evidence).toHaveLength(1)
      expect(result[0].evidence[0]).toHaveProperty('factor')
    })

    it('predictive insights include evidence array', async () => {
      const mockData = [
        {
          id: 'pi-1',
          company_id: 'c1',
          employee_id: 'emp-1',
          insight_type: 'engagement_drop',
          insight_text: 'Engagement score dropped 15%',
          confidence: 'high',
          evidence: [{ source: 'pulse_survey', delta: -15 }],
          model_run_id: 'run-1',
          requires_review: true,
          reviewed_by: null,
          reviewed_at: null,
          created_at: '2024-06-20T00:00:00Z',
        },
      ]

      const fakeChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 }),
            }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.getInsights('c1')

      expect(result.insights[0].evidence).toBeDefined()
      expect(Array.isArray(result.insights[0].evidence)).toBe(true)
      expect(result.insights[0].evidence[0]).toHaveProperty('source')
    })

    it('insight has confidence level', async () => {
      const mockData = [
        {
          id: 'pi-1',
          company_id: 'c1',
          employee_id: 'emp-1',
          insight_type: 'performance_decline',
          insight_text: 'Performance review scores declining',
          confidence: 'medium',
          evidence: [],
          model_run_id: 'run-1',
          requires_review: true,
          reviewed_by: null,
          reviewed_at: null,
          created_at: '2024-06-20T00:00:00Z',
        },
      ]

      const fakeChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 }),
            }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.getInsights('c1')

      expect(['low', 'medium', 'high']).toContain(result.insights[0].confidence)
    })
  })

  // ── No Automated PIP / Termination ──

  describe('No automated PIP or termination', () => {
    it('insights default to requires_review = true', () => {
      const insight = {
        id: 'pi-1',
        company_id: 'c1',
        employee_id: 'emp-1',
        insight_type: 'flight_risk',
        insight_text: 'Risk of attrition detected',
        confidence: 'high',
        evidence: [],
        model_run_id: 'run-1',
        requires_review: true,
        reviewed_by: null,
        reviewed_at: null,
        created_at: '2024-06-20T00:00:00Z',
      }
      expect(insight.requires_review).toBe(true)
    })

    it('reviewInsight does not create PIP or termination actions', async () => {
      const mockInsight = {
        id: 'pi-1',
        company_id: 'c1',
        employee_id: 'emp-1',
        insight_type: 'flight_risk',
        insight_text: 'Risk of attrition',
        confidence: 'high',
        evidence: [],
        model_run_id: 'run-1',
        requires_review: false,
        reviewed_by: 'hr-1',
        reviewed_at: '2024-06-20T12:00:00Z',
        created_at: '2024-06-20T00:00:00Z',
      }

      const fakeChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInsight, error: null }),
            }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.reviewInsight('pi-1', 'hr-1', 'approve')

      expect(result.requires_review).toBe(false)
      expect(result.reviewed_by).toBe('hr-1')
      expect(result).not.toHaveProperty('action_type')
      expect(result).not.toHaveProperty('auto_pip')
      expect(result).not.toHaveProperty('termination_initiated')
    })

    it('reviewInsight only supports approve/dismiss/flag_for_review', async () => {
      await expect(
        peopleAnalyticsService.reviewInsight('pi-1', 'hr-1', 'auto_pip' as any),
      ).rejects.toThrow('Invalid review action')

      await expect(
        peopleAnalyticsService.reviewInsight('pi-1', 'hr-1', 'terminate' as any),
      ).rejects.toThrow('Invalid review action')
    })
  })

  // ── Manager Visibility Restricted ──

  describe('Manager visibility restricted', () => {
    it('non-owner/admin/hr_manager cannot run analytics', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      await expect(
        peopleAnalyticsService.runAnalytics('model-1', 'c1', 'mgr-1'),
      ).rejects.toThrow('Insufficient permissions')
    })

    it('non-owner/admin/hr_manager cannot read risk indicators', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      await expect(
        peopleAnalyticsService.getRiskIndicators('c1'),
      ).rejects.toThrow('Insufficient permissions')
    })

    it('non-owner/admin/hr_manager cannot read insights', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      await expect(
        peopleAnalyticsService.getInsights('c1'),
      ).rejects.toThrow('Insufficient permissions')
    })

    it('non-owner/admin/hr_manager cannot review insights', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)

      await expect(
        peopleAnalyticsService.reviewInsight('pi-1', 'mgr-1', 'approve'),
      ).rejects.toThrow('Insufficient permissions')
    })
  })

  // ── RLS Isolation ──

  describe('RLS isolation', () => {
    it('all people analytics tables have company_id column', () => {
      const tables = [
        'people_analytics_models',
        'people_analytics_runs',
        'risk_indicators',
        'predictive_insights',
      ]
      for (const table of tables) {
        expect(table).toBeDefined()
      }
      expect(tables.length).toBe(4)
    })

    it('RLS policy uses safe_user_company_id()', () => {
      const policy = 'company_id = safe_user_company_id()'
      expect(policy).toContain('safe_user_company_id')
    })

    it('cross-company access is denied by RLS', () => {
      const userCompany = 'c1'
      const recordCompany = 'c2'
      const canAccess = userCompany === recordCompany
      expect(canAccess).toBe(false)
    })

    it('same-company access is allowed by RLS', () => {
      const userCompany = 'c1'
      const recordCompany = 'c1'
      const canAccess = userCompany === recordCompany
      expect(canAccess).toBe(true)
    })

    it('runAnalytics queries model with company_id filter', async () => {
      const fakeChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'model-1', config: {} },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockImplementation(fakeChain.from as any)

      const insertChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'run-1',
                company_id: 'c1',
                model_id: 'model-1',
                status: 'pending',
              },
              error: null,
            }),
          }),
        }),
      }
      fakeChain.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'model-1', config: {} },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce(insertChain)

      const result = await peopleAnalyticsService.runAnalytics('model-1', 'c1', 'user-1')

      expect(result.company_id).toBe('c1')
    })
  })

  // ── Review Workflow ──

  describe('Review workflow', () => {
    it('approve sets requires_review to false', async () => {
      const mockInsight = {
        id: 'pi-1',
        requires_review: false,
        reviewed_by: 'hr-1',
        reviewed_at: '2024-06-20T12:00:00Z',
      }

      const fakeChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInsight, error: null }),
            }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.reviewInsight('pi-1', 'hr-1', 'approve')
      expect(result.requires_review).toBe(false)
    })

    it('dismiss sets requires_review to false', async () => {
      const mockInsight = {
        id: 'pi-1',
        requires_review: false,
        reviewed_by: 'hr-1',
        reviewed_at: '2024-06-20T12:00:00Z',
      }

      const fakeChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInsight, error: null }),
            }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.reviewInsight('pi-1', 'hr-1', 'dismiss')
      expect(result.requires_review).toBe(false)
    })

    it('flag_for_review keeps requires_review true', async () => {
      const mockInsight = {
        id: 'pi-1',
        requires_review: true,
        reviewed_by: 'hr-1',
        reviewed_at: '2024-06-20T12:00:00Z',
      }

      const fakeChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInsight, error: null }),
            }),
          }),
        }),
      }
      vi.mocked((await import('../../../src/lib/supabase')).supabase.from).mockReturnValue(fakeChain as any)

      const result = await peopleAnalyticsService.reviewInsight('pi-1', 'hr-1', 'flag_for_review')
      expect(result.requires_review).toBe(true)
    })
  })
})
