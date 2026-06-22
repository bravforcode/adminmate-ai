import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { metricsService } from '../../../src/services/monitoring/metricsService'

const companyId = 'comp-1'

function buildChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const method of ['select', 'insert', 'eq', 'gte', 'lte', 'order', 'range']) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (r: { data: unknown; error: unknown }) => void) =>
    Promise.resolve(resolve({ data, error }))
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('metricsService', () => {
  describe('recordMetric', () => {
    it('inserts a usage metric', async () => {
      mockSupabase.from.mockReturnValue(buildChain(null))

      await metricsService.recordMetric(companyId, 'api_calls', 42, 'count')

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_metrics')
    })

    it('throws on insert error', async () => {
      mockSupabase.from.mockReturnValue(buildChain(null, { message: 'fail' }))

      await expect(
        metricsService.recordMetric(companyId, 'api_calls', 42, 'count')
      ).rejects.toEqual({ message: 'fail' })
    })
  })

  describe('getMetrics', () => {
    it('returns metrics for a company', async () => {
      const rows = [
        { id: 'm1', company_id: companyId, metric_name: 'api_calls', metric_value: 100, metric_unit: 'count', recorded_at: '2024-06-20T00:00:00Z' },
      ]
      mockSupabase.from.mockReturnValue(buildChain(rows))

      const result = await metricsService.getMetrics(companyId)

      expect(result).toEqual(rows)
      expect(mockSupabase.from).toHaveBeenCalledWith('usage_metrics')
    })

    it('throws on error', async () => {
      mockSupabase.from.mockReturnValue(buildChain(null, { message: 'fail' }))

      await expect(metricsService.getMetrics(companyId)).rejects.toEqual({ message: 'fail' })
    })
  })

  describe('getQuotas', () => {
    it('returns tenant quotas', async () => {
      const rows = [
        { id: 'q1', company_id: companyId, quota_name: 'employees', quota_limit: 100, current_usage: 50, period_start: '2024-06-01', period_end: '2024-06-30' },
      ]
      mockSupabase.from.mockReturnValue(buildChain(rows))

      const result = await metricsService.getQuotas(companyId)

      expect(result).toEqual(rows)
    })
  })

  describe('checkQuotaWarning', () => {
    it('returns quotas above 80% usage', async () => {
      const rows = [
        { id: 'q1', company_id: companyId, quota_name: 'employees', quota_limit: 100, current_usage: 85, period_start: '2024-06-01', period_end: '2024-06-30' },
        { id: 'q2', company_id: companyId, quota_name: 'storage', quota_limit: 100, current_usage: 50, period_start: '2024-06-01', period_end: '2024-06-30' },
      ]
      mockSupabase.from.mockReturnValue(buildChain(rows))

      const result = await metricsService.checkQuotaWarning(companyId)

      expect(result).toEqual([
        { quota: 'employees', usage: 85, limit: 100 },
      ])
    })

    it('returns empty array when no quotas near limit', async () => {
      const rows = [
        { id: 'q1', company_id: companyId, quota_name: 'employees', quota_limit: 100, current_usage: 50, period_start: '2024-06-01', period_end: '2024-06-30' },
      ]
      mockSupabase.from.mockReturnValue(buildChain(rows))

      const result = await metricsService.checkQuotaWarning(companyId)

      expect(result).toEqual([])
    })

    it('skips quotas with zero limit', async () => {
      const rows = [
        { id: 'q1', company_id: companyId, quota_name: 'employees', quota_limit: 0, current_usage: 0, period_start: '2024-06-01', period_end: '2024-06-30' },
      ]
      mockSupabase.from.mockReturnValue(buildChain(rows))

      const result = await metricsService.checkQuotaWarning(companyId)

      expect(result).toEqual([])
    })
  })

  describe('getCosts', () => {
    it('returns cost attributions', async () => {
      const rows = [
        { id: 'c1', company_id: companyId, service_name: 'ai', cost_cents: 500, period: '2024-06' },
      ]
      mockSupabase.from.mockReturnValue(buildChain(rows))

      const result = await metricsService.getCosts(companyId)

      expect(result).toEqual(rows)
    })
  })

  describe('getTotalCost', () => {
    it('sums cost_cents across rows', async () => {
      const rows = [
        { cost_cents: 100 },
        { cost_cents: 250 },
      ]
      mockSupabase.from.mockReturnValue(buildChain(rows))

      const total = await metricsService.getTotalCost(companyId, '2024-06-01', '2024-06-30')

      expect(total).toBe(350)
    })

    it('returns 0 when no rows', async () => {
      mockSupabase.from.mockReturnValue(buildChain([]))

      const total = await metricsService.getTotalCost(companyId, '2024-06-01', '2024-06-30')

      expect(total).toBe(0)
    })
  })
})
