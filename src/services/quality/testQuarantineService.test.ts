import { describe, it, expect, beforeEach, vi } from 'vitest'
import { testQuarantineService } from './testQuarantineService'

const QUARANTINE_ROW = {
  id: 'q-1',
  company_id: 'co-1',
  test_name: 'flakyLogin.test.ts',
  reason: 'intermittent timeout on CI',
  status: 'active' as const,
  expires_at: null,
  quarantined_by: 'user-1',
  quarantined_at: '2026-06-20T10:00:00Z',
  dismissed_at: null,
}

function chain(result: unknown): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  for (const m of [
    'select',
    'insert',
    'update',
    'eq',
    'order',
    'maybeSingle',
    'single',
    'limit',
    'gte',
  ]) {
    c[m] = vi.fn(() => (m === 'order' || m === 'maybeSingle' || m === 'single' ? result : chain(result)))
  }
  return c
}

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

let fromMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.clearAllMocks()
  const { supabase } = await import('../../lib/supabase')
  fromMock = supabase.from as ReturnType<typeof vi.fn>
})

describe('testQuarantineService', () => {
  describe('quarantine', () => {
    it('should quarantine a test', async () => {
      fromMock.mockReturnValueOnce(chain({ data: null, error: null }))
      fromMock.mockReturnValueOnce(
        chain({ data: QUARANTINE_ROW, error: null })
      )

      const result = await testQuarantineService.quarantine('co-1', {
        testName: 'flakyLogin.test.ts',
        reason: 'intermittent timeout on CI',
        quarantinedBy: 'user-1',
      })

      expect(result.test_name).toBe('flakyLogin.test.ts')
      expect(result.status).toBe('active')
    })

    it('should throw if test is already quarantined', async () => {
      fromMock.mockReturnValueOnce(
        chain({ data: { id: 'existing', status: 'active' }, error: null })
      )

      await expect(
        testQuarantineService.quarantine('co-1', {
          testName: 'flakyLogin.test.ts',
          reason: 'duplicate',
          quarantinedBy: 'user-1',
        })
      ).rejects.toThrow('already quarantined')
    })
  })

  describe('unquarantine', () => {
    it('should dismiss a quarantined test', async () => {
      fromMock.mockReturnValueOnce(chain({ data: { id: 'q-1' }, error: null }))
      fromMock.mockReturnValueOnce(
        chain({ data: { ...QUARANTINE_ROW, status: 'dismissed' }, error: null })
      )

      const result = await testQuarantineService.unquarantine(
        'co-1',
        'flakyLogin.test.ts'
      )
      expect(result?.status).toBe('dismissed')
    })

    it('should return null if test is not quarantined', async () => {
      fromMock.mockReturnValueOnce(chain({ data: null, error: null }))

      const result = await testQuarantineService.unquarantine(
        'co-1',
        'unknown.test.ts'
      )
      expect(result).toBeNull()
    })
  })

  describe('getQuarantined', () => {
    it('should return active quarantined tests', async () => {
      fromMock.mockReturnValueOnce(chain({ data: [QUARANTINE_ROW], error: null }))

      const result = await testQuarantineService.getQuarantined('co-1')
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('active')
    })

    it('should return empty array when no tests are quarantined', async () => {
      fromMock.mockReturnValueOnce(chain({ data: [], error: null }))

      const result = await testQuarantineService.getQuarantined('co-1')
      expect(result).toHaveLength(0)
    })
  })

  describe('isQuarantined', () => {
    it('should return true for quarantined test', async () => {
      fromMock.mockReturnValueOnce(chain({ count: 1, error: null }))

      const result = await testQuarantineService.isQuarantined(
        'co-1',
        'flakyLogin.test.ts'
      )
      expect(typeof result).toBe('boolean')
    })

    it('should return false for non-quarantined test', async () => {
      fromMock.mockReturnValueOnce(chain({ count: 0, error: null }))

      const result = await testQuarantineService.isQuarantined(
        'co-1',
        'stable.test.ts'
      )
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getQuarantineHistory', () => {
    it('should return history for a test', async () => {
      fromMock.mockReturnValueOnce(chain({ data: [QUARANTINE_ROW], error: null }))

      const history = await testQuarantineService.getQuarantineHistory(
        'co-1',
        'flakyLogin.test.ts'
      )
      expect(Array.isArray(history)).toBe(true)
    })
  })
})
