import { describe, it, expect, beforeEach, vi } from 'vitest'
import { qualityMetricsService } from './qualityMetricsService'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockGte = vi.fn()
const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()

function resetMocks() {
  mockSelect.mockReset()
  mockInsert.mockReset()
  mockUpdate.mockReset()
  mockEq.mockReset()
  mockOrder.mockReset()
  mockLimit.mockReset()
  mockGte.mockReset()
  mockMaybeSingle.mockReset()
  mockSingle.mockReset()

  mockSelect.mockReturnThis()
  mockInsert.mockReturnThis()
  mockUpdate.mockReturnThis()
  mockEq.mockReturnThis()
  mockOrder.mockReturnThis()
  mockLimit.mockReturnThis()
  mockGte.mockReturnThis()
  mockMaybeSingle.mockReturnThis()
  mockSingle.mockReturnThis()
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      gte: mockGte,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    })),
  },
}))

const SNAPSHOT_ROW = {
  id: 'snap-1',
  company_id: 'co-1',
  commit_sha: 'abc123',
  branch: 'main',
  tests_passed: 100,
  tests_failed: 2,
  tests_skipped: 5,
  coverage_lines: 85.5,
  coverage_functions: 90.1,
  coverage_branches: 80.3,
  build_time_ms: 12000,
  bundle_size_bytes: 500000,
  recorded_at: '2026-06-20T10:00:00Z',
}

const BASELINE_ROW = {
  id: 'bl-1',
  company_id: 'co-1',
  metric_name: 'coverage_lines',
  metric_value: 85,
  set_by: 'user-1',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

describe('qualityMetricsService', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('recordSnapshot', () => {
    it('should insert a quality snapshot', async () => {
      const inserted = { ...SNAPSHOT_ROW, id: 'snap-2' }
      mockInsert.mockReturnValue({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: inserted, error: null })) })) })

      const result = await qualityMetricsService.recordSnapshot('co-1', {
        commitSha: 'abc123',
        branch: 'main',
        testsPassed: 100,
        testsFailed: 2,
        testsSkipped: 5,
        coverageLines: 85.5,
        coverageFunctions: 90.1,
        coverageBranches: 80.3,
        buildTimeMs: 12000,
        bundleSizeBytes: 500000,
      })

      expect(result.id).toBe('snap-2')
      expect(result.tests_passed).toBe(100)
    })

    it('should throw on database error', async () => {
      mockInsert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: { message: 'db error' } })),
        })),
      })

      await expect(
        qualityMetricsService.recordSnapshot('co-1', {
          testsPassed: 0,
          testsFailed: 0,
          testsSkipped: 0,
          coverageLines: 0,
          coverageFunctions: 0,
          coverageBranches: 0,
          buildTimeMs: 0,
          bundleSizeBytes: 0,
        })
      ).rejects.toThrow()
    })
  })

  describe('getLatestSnapshot', () => {
    it('should return the most recent snapshot', async () => {
      mockOrder.mockReturnValue({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: SNAPSHOT_ROW, error: null })),
        })),
      })

      const result = await qualityMetricsService.getLatestSnapshot('co-1')
      expect(result?.id).toBe('snap-1')
    })

    it('should return null when no snapshots exist', async () => {
      mockOrder.mockReturnValue({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null, error: null })),
        })),
      })

      const result = await qualityMetricsService.getLatestSnapshot('co-1')
      expect(result).toBeNull()
    })
  })

  describe('setBaseline', () => {
    it('should create a new baseline', async () => {
      mockMaybeSingle.mockReturnValue({ data: null, error: null })
      mockInsert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: BASELINE_ROW, error: null })),
        })),
      })

      const result = await qualityMetricsService.setBaseline(
        'co-1',
        'coverage_lines',
        85,
        'user-1'
      )
      expect(result.metric_name).toBe('coverage_lines')
      expect(result.metric_value).toBe(85)
    })

    it('should update an existing baseline', async () => {
      mockMaybeSingle.mockReturnValue({ data: { id: 'bl-1' }, error: null })
      const updated = { ...BASELINE_ROW, metric_value: 90 }
      mockUpdate.mockReturnValue({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: updated, error: null })),
          })),
        })),
      })

      const result = await qualityMetricsService.setBaseline(
        'co-1',
        'coverage_lines',
        90,
        'user-1'
      )
      expect(result.metric_value).toBe(90)
    })
  })

  describe('checkRegression', () => {
    it('should detect no regression when metrics meet baseline', async () => {
      mockEq.mockReturnValue({
        order: vi.fn(() => ({
          data: [BASELINE_ROW],
          error: null,
        })),
      })

      const regressions = await qualityMetricsService.checkRegression('co-1', {
        testsPassed: 100,
        testsFailed: 0,
        coverageLines: 86,
        coverageFunctions: 91,
        coverageBranches: 81,
        buildTimeMs: 11000,
        bundleSizeBytes: 490000,
      })

      expect(regressions.every((r) => !r.regressed)).toBe(true)
    })

    it('should detect regression when coverage drops', async () => {
      mockEq.mockReturnValue({
        order: vi.fn(() => ({
          data: [
            { ...BASELINE_ROW, metric_name: 'coverage_lines', metric_value: 85 },
          ],
          error: null,
        })),
      })

      const regressions = await qualityMetricsService.checkRegression('co-1', {
        testsPassed: 100,
        testsFailed: 0,
        coverageLines: 75,
        coverageFunctions: 91,
        coverageBranches: 81,
        buildTimeMs: 11000,
        bundleSizeBytes: 490000,
      })

      const coverageReg = regressions.find((r) => r.metric === 'coverage_lines')
      expect(coverageReg?.regressed).toBe(true)
    })
  })

  describe('getTrends', () => {
    it('should return snapshots ordered by date', async () => {
      mockEq.mockReturnValue({
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [SNAPSHOT_ROW],
            error: null,
          })),
        })),
      })

      const trends = await qualityMetricsService.getTrends('co-1', 30)
      expect(trends).toHaveLength(1)
    })

    it('should return empty array when no data', async () => {
      mockEq.mockReturnValue({
        gte: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })

      const trends = await qualityMetricsService.getTrends('co-1', 7)
      expect(trends).toHaveLength(0)
    })
  })

  describe('generateReport', () => {
    it('should generate a quality report', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() => ({ data: SNAPSHOT_ROW, error: null })),
              })),
            })),
          })),
        })),
      }))

      const { supabase } = await import('../../lib/supabase')
      ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom)

      const report = await qualityMetricsService.generateReport('co-1')
      expect(report.companyId).toBe('co-1')
      expect(typeof report.passed).toBe('boolean')
      expect(Array.isArray(report.regressions)).toBe(true)
    })
  })
})
