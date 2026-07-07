import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase chainable query builder
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'range', 'or', 'gte', 'lte']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error, count: Array.isArray(result) ? result.length : 0 })
  }
  return chain
}

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('../permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import {
  reportService,
  type ReportDefinition,
} from './reportService'

import {
  peopleAnalyticsService,
  excludeSensitiveFields,
  stripSensitiveFromInsights,
} from './peopleAnalyticsService'

describe('reportService (analytics)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('maskSensitiveData', () => {
    it('should mask sensitive fields', () => {
      const row = {
        name: 'John',
        email: 'john@example.com',
        phone: '0812345678',
        salary: 50000,
        national_id: '1234567890123',
      }

      const masked = reportService.maskSensitiveData(row)
      expect(masked.name).toBe('John')
      expect(masked.email).toBe('************.com')
      expect(masked.phone).toBe('******5678')
      expect(masked.salary).toBe('*0000')
      expect(masked.national_id).toBe('*********0123')
    })

    it('should handle short values', () => {
      const row = { email: 'a@b' }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.email).toBe('****')
    })

    it('should not mask non-sensitive fields', () => {
      const row = { name: 'John', department: 'Engineering' }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.name).toBe('John')
      expect(masked.department).toBe('Engineering')
    })
  })

  describe('maskRows', () => {
    it('should mask all rows', () => {
      const rows = [
        { email: 'test@example.com', name: 'A' },
        { email: 'other@example.com', name: 'B' },
      ]
      const masked = reportService.maskRows(rows)
      expect(masked).toHaveLength(2)
      expect(masked[0].email).not.toBe('test@example.com')
      expect(masked[1].email).not.toBe('other@example.com')
    })
  })

  describe('getReportDefinitions', () => {
    it('should return report definitions', async () => {
      const defs = [{ id: '1', name: 'Hiring Report', company_id: 'c1' }]
      mockFrom.mockReturnValue(createChain(defs))

      const result = await reportService.getReportDefinitions('c1')
      expect(mockFrom).toHaveBeenCalledWith('report_definitions')
      expect(result).toEqual(defs)
    })

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))
      await expect(reportService.getReportDefinitions('c1')).rejects.toThrow('DB error')
    })
  })

  describe('generateReport', () => {
    it('should generate report with masking', async () => {
      const def = { query_config: { table: 'employees', columns: ['name', 'email'] } }
      const rows = [{ name: 'John', email: 'john@test.com' }]

      mockFrom
        .mockReturnValueOnce(createChain(def))
        .mockReturnValueOnce(createChain(rows))

      const result = await reportService.generateReport('r1', 'c1')
      expect(result.columns).toEqual(['name', 'email'])
      expect(result.rows[0].email).not.toBe('john@test.com')
    })

    it('should apply filters', async () => {
      const def = { query_config: { table: 'employees', columns: ['*'] } }
      const rows = [{ name: 'John', department: 'Engineering' }]

      mockFrom
        .mockReturnValueOnce(createChain(def))
        .mockReturnValueOnce(createChain(rows))

      const result = await reportService.generateReport('r1', 'c1', { department: 'Engineering' })
      expect(result.rows).toHaveLength(1)
    })
  })

  describe('exportReport', () => {
    it('should create export record', async () => {
      const exportRecord = { id: 'e1', format: 'csv', status: 'pending' }
      mockFrom.mockReturnValue(createChain(exportRecord))

      const result = await reportService.exportReport('r1', 'c1', 'csv', 'u1')
      expect(result.format).toBe('csv')
      expect(result.status).toBe('pending')
    })
  })

  describe('scheduleReport', () => {
    it('should create schedule', async () => {
      const schedule = { id: 's1', is_active: true }
      mockFrom.mockReturnValue(createChain(schedule))

      const result = await reportService.scheduleReport('c1', {
        report_def_id: 'r1',
        schedule_config: { frequency: 'weekly' },
        recipients: ['admin@test.com'],
      })
      expect(result.is_active).toBe(true)
    })
  })
})

describe('peopleAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('excludeSensitiveFields', () => {
    it('should remove sensitive fields', () => {
      const row = { name: 'John', email: 'john@test.com', salary: 50000, department: 'Eng' }
      const result = excludeSensitiveFields(row)
      expect(result.name).toBe('John')
      expect(result.department).toBe('Eng')
      expect(result).not.toHaveProperty('email')
      expect(result).not.toHaveProperty('salary')
    })
  })

  describe('stripSensitiveFromInsights', () => {
    it('should strip sensitive data from evidence', () => {
      const insights = [{
        id: '1',
        insight_text: 'High performer',
        evidence: [{ name: 'John', salary: 50000, department: 'Eng' }],
      }]
      const result = stripSensitiveFromInsights(insights as any)
      expect(result[0].evidence[0]).not.toHaveProperty('salary')
      expect(result[0].evidence[0].name).toBe('John')
    })
  })

  describe('runAnalytics', () => {
    it('should create analytics run', async () => {
      const model = { id: 'm1', config: {} }
      const run = { id: 'r1', status: 'pending' }

      mockFrom
        .mockReturnValueOnce(createChain(model))
        .mockReturnValueOnce(createChain(run))

      const result = await peopleAnalyticsService.runAnalytics('m1', 'c1', 'u1')
      expect(result.status).toBe('pending')
    })

    it('should throw if model not found', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Not found')))
      await expect(peopleAnalyticsService.runAnalytics('m1', 'c1', 'u1')).rejects.toThrow()
    })
  })

  describe('getRiskIndicators', () => {
    it('should return risk indicators', async () => {
      const indicators = [{ id: '1', risk_score: 85, employee_id: 'e1' }]
      mockFrom.mockReturnValue(createChain(indicators))

      const result = await peopleAnalyticsService.getRiskIndicators('c1')
      expect(result).toHaveLength(1)
      expect(result[0].risk_score).toBe(85)
    })

    it('should filter by employee', async () => {
      const indicators = [{ id: '1', employee_id: 'e1' }]
      mockFrom.mockReturnValue(createChain(indicators))

      await peopleAnalyticsService.getRiskIndicators('c1', 'e1')
      expect(mockFrom).toHaveBeenCalledWith('risk_indicators')
    })
  })

  describe('getInsights', () => {
    it('should return paginated insights', async () => {
      const insights = [{ id: '1', insight_text: 'Test' }]
      mockFrom.mockReturnValue(createChain(insights))

      const result = await peopleAnalyticsService.getInsights('c1', { page: 1, limit: 10 })
      expect(result.insights).toHaveLength(1)
    })

    it('should apply filters', async () => {
      mockFrom.mockReturnValue(createChain([]))

      await peopleAnalyticsService.getInsights('c1', {
        employeeId: 'e1',
        insightType: 'performance',
        requiresReview: true,
        confidence: 'high',
      })
      expect(mockFrom).toHaveBeenCalledWith('predictive_insights')
    })
  })

  describe('reviewInsight', () => {
    it('should approve insight', async () => {
      const insight = { id: '1', requires_review: true }
      const updated = { id: '1', requires_review: false, reviewed_by: 'u1' }

      mockFrom
        .mockReturnValueOnce(createChain(updated))

      const result = await peopleAnalyticsService.reviewInsight('1', 'u1', 'approve')
      expect(result.requires_review).toBe(false)
    })

    it('should throw on invalid action', async () => {
      await expect(peopleAnalyticsService.reviewInsight('1', 'u1', 'invalid' as any)).rejects.toThrow('Invalid review action')
    })
  })
})
