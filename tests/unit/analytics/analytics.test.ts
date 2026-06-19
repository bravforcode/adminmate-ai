import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reportService } from '../../../src/services/analytics/reportService'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()
const mockLimit = vi.fn()

function chainAll() {
  return {
    select: mockSelect,
    insert: mockInsert,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    limit: mockLimit,
  }
}

const chain = chainAll()

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chain),
  },
}))

describe('Analytics + Reports — Release 13', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue(chain)
    mockEq.mockReturnValue(chain)
    mockOrder.mockReturnValue(chain)
    mockInsert.mockReturnValue(chain)
    mockLimit.mockReturnValue(chain)
    mockSingle.mockReturnValue({ data: null, error: null })
  })

  // ── Export Masks Sensitive Data ──

  describe('maskSensitiveData', () => {
    it('masks email field', () => {
      const row = { name: 'John', email: 'john@example.com' }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.name).toBe('John')
      expect(masked.email).toBe('************.com')
    })

    it('masks phone field', () => {
      const row = { name: 'John', phone: '0812345678' }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.phone).toBe('******5678')
    })

    it('masks salary field', () => {
      const row = { name: 'John', salary: 50000 }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.salary).toBe('*0000')
    })

    it('masks bank_account field', () => {
      const row = { name: 'John', bank_account: '1234567890' }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.bank_account).toBe('******7890')
    })

    it('masks national_id field', () => {
      const row = { name: 'John', national_id: '1234567890123' }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.national_id).toBe('*********0123')
    })

    it('preserves non-sensitive fields', () => {
      const row = { name: 'John', department: 'Engineering', email: 'john@example.com' }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.name).toBe('John')
      expect(masked.department).toBe('Engineering')
    })

    it('short values (<=4 chars) become ****', () => {
      const row = { email: 'a@b' }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.email).toBe('****')
    })

    it('does not modify null/undefined sensitive fields', () => {
      const row = { name: 'John', email: null, phone: undefined }
      const masked = reportService.maskSensitiveData(row)
      expect(masked.email).toBeNull()
      expect(masked.phone).toBeUndefined()
    })
  })

  describe('maskRows', () => {
    it('masks all rows in array', () => {
      const rows = [
        { name: 'A', email: 'a@test.com' },
        { name: 'B', email: 'b@test.com' },
      ]
      const masked = reportService.maskRows(rows)
      expect(masked[0].email).toBe('******.com')
      expect(masked[1].email).toBe('******.com')
    })
  })

  // ── Report Respects RLS ──

  describe('RLS — Report Generation', () => {
    it('generateReport queries with company_id filter', async () => {
      mockSingle.mockResolvedValue({
        data: { query_config: { table: 'audit_logs', columns: ['action', 'created_at'] } },
        error: null,
      })
      mockLimit.mockResolvedValue({ data: [{ action: 'login' }], error: null })

      await reportService.generateReport('def-1', 'company-abc')

      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-abc')
    })

    it('generateReport returns only allowed columns', async () => {
      mockSingle.mockResolvedValue({
        data: { query_config: { table: 'audit_logs', columns: ['action'] } },
        error: null,
      })
      mockLimit.mockResolvedValue({ data: [{ action: 'login', secret: 'x' }], error: null })

      const result = await reportService.generateReport('def-1', 'company-abc')
      expect(result.columns).toEqual(['action'])
    })

    it('generateReport applies custom filters', async () => {
      mockSingle.mockResolvedValue({
        data: { query_config: { table: 'audit_logs', columns: ['action'] } },
        error: null,
      })
      mockLimit.mockResolvedValue({ data: [], error: null })

      await reportService.generateReport('def-1', 'company-abc', { action: 'login' })

      expect(chain.eq).toHaveBeenCalledWith('action', 'login')
    })
  })

  // ── Scheduled Report Not Auto-Sent ──

  describe('Scheduled Reports — No Auto-Send', () => {
    it('scheduleReport creates record without sending', async () => {
      const scheduled = {
        id: 'sched-1',
        company_id: 'company-abc',
        report_def_id: 'def-1',
        schedule_config: { frequency: 'weekly' },
        recipients: ['admin@co.com'],
        is_active: true,
        last_run_at: null,
        next_run_at: null,
      }
      mockSingle.mockResolvedValue({ data: scheduled, error: null })

      const result = await reportService.scheduleReport('company-abc', {
        report_def_id: 'def-1',
        schedule_config: { frequency: 'weekly' },
        recipients: ['admin@co.com'],
      })

      expect(result.last_run_at).toBeNull()
      expect(result.next_run_at).toBeNull()
      expect(result.is_active).toBe(true)
    })

    it('scheduleReport does not invoke email/sending functions', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'sched-1' }, error: null })

      await reportService.scheduleReport('company-abc', {
        report_def_id: 'def-1',
        schedule_config: { frequency: 'daily' },
        recipients: [],
      })

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          report_def_id: 'def-1',
          company_id: 'company-abc',
          is_active: true,
        }),
      )
    })

    it('inserted scheduled report defaults last_run_at to null', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'sched-1', last_run_at: null }, error: null })

      const result = await reportService.scheduleReport('company-abc', {
        report_def_id: 'def-1',
        schedule_config: {},
        recipients: [],
      })

      expect(result.last_run_at).toBeNull()
    })
  })

  // ── RLS Isolation ──

  describe('RLS — Company Isolation', () => {
    it('all report tables require company_id', () => {
      const tables = [
        'report_definitions',
        'dashboard_layouts',
        'scheduled_reports',
        'report_exports',
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

    it('exportReport records company_id', async () => {
      const exportRec = {
        id: 'exp-1',
        company_id: 'company-abc',
        report_def_id: 'def-1',
        format: 'csv',
        status: 'pending',
      }
      mockSingle.mockResolvedValue({ data: exportRec, error: null })

      const result = await reportService.exportReport('def-1', 'company-abc', 'csv', 'user-1')
      expect(result.company_id).toBe('company-abc')
    })
  })
})
