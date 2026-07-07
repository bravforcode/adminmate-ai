import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('../../../src/services/permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import { notificationCenterService } from '../../../src/services/notification/notificationCenterService'
import { globalSearchService } from '../../../src/services/search/globalSearchService'
import { hasPermission } from '../../../src/services/permissionService'

function makeChain(resolveWith: { data: unknown; error: unknown } = { data: [], error: null }) {
  const chain: Record<string, unknown> = {}
  const chainMethods = [
    'order', 'range', 'eq', 'in', 'or', 'textSearch', 'limit',
    'update', 'select', 'delete', 'single', 'maybeSingle', 'upsert',
  ]
  chainMethods.forEach((m) => {
    chain[m] = vi.fn().mockReturnThis()
  })
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveWith)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(hasPermission).mockResolvedValue(true)
})

// ────────────────────────────────────────────────
// NOTIFICATION CENTER
// ────────────────────────────────────────────────
describe('notificationCenterService', () => {
  describe('getNotifications', () => {
    it('requires notification:read permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
      await expect(
        notificationCenterService.getNotifications('u1', 'c1')
      ).rejects.toThrow('Insufficient permissions: notification:read required')
    })

    it('fetches notifications for user within company', async () => {
      const chain = makeChain({
        data: [
          {
            id: 'n1', company_id: 'c1', user_id: 'u1',
            title: 'New applicant', body: 'John applied for Engineer',
            notification_type: 'new_applicant', reference_type: 'candidate',
            reference_id: 'cand-1', is_read: false, action_url: '/candidates/cand-1',
            created_at: '2026-06-20T10:00:00Z',
          },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await notificationCenterService.getNotifications('u1', 'c1')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('New applicant')
      expect(result[0].user_id).toBe('u1')
      expect(result[0].company_id).toBe('c1')
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'c1')
    })

    it('filters by is_read', async () => {
      const chain = makeChain({ data: [], error: null })
      mockSupabase.from.mockReturnValue(chain)

      await notificationCenterService.getNotifications('u1', 'c1', { is_read: false })

      expect(chain.eq).toHaveBeenCalledWith('is_read', false)
    })

    it('filters by notification_type', async () => {
      const chain = makeChain({ data: [], error: null })
      mockSupabase.from.mockReturnValue(chain)

      await notificationCenterService.getNotifications('u1', 'c1', { notification_type: 'interview' })

      expect(chain.eq).toHaveBeenCalledWith('notification_type', 'interview')
    })
  })

  describe('markAsRead', () => {
    it('requires notification:write permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
      await expect(
        notificationCenterService.markAsRead('n1')
      ).rejects.toThrow('Insufficient permissions: notification:write required')
    })

    it('sets is_read to true', async () => {
      const chain = makeChain({ data: null, error: null })
      mockSupabase.from.mockReturnValue(chain)

      await notificationCenterService.markAsRead('n1')
      expect(chain.update).toHaveBeenCalledWith({ is_read: true })
      expect(chain.eq).toHaveBeenCalledWith('id', 'n1')
    })
  })

  describe('markAllAsRead', () => {
    it('requires notification:write permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
      await expect(
        notificationCenterService.markAllAsRead('u1', 'c1')
      ).rejects.toThrow('Insufficient permissions: notification:write required')
    })

    it('updates all unread for user+company', async () => {
      const chain = makeChain({ data: null, error: null })
      mockSupabase.from.mockReturnValue(chain)

      await notificationCenterService.markAllAsRead('u1', 'c1')
      expect(chain.update).toHaveBeenCalledWith({ is_read: true })
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'c1')
      expect(chain.eq).toHaveBeenCalledWith('is_read', false)
    })
  })

  describe('getPreferences', () => {
    it('returns user preferences', async () => {
      const chain = makeChain({
        data: [
          {
            id: 'p1', company_id: 'c1', user_id: 'u1',
            channel: 'email', notification_type: 'new_applicant',
            is_enabled: true, created_at: '2026-06-20T10:00:00Z',
            updated_at: '2026-06-20T10:00:00Z',
          },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await notificationCenterService.getPreferences('u1')
      expect(result).toHaveLength(1)
      expect(result[0].channel).toBe('email')
      expect(result[0].is_enabled).toBe(true)
    })
  })

  describe('updatePreference', () => {
    it('upserts preference with correct values', async () => {
      const chain = makeChain({
        data: {
          id: 'p1', company_id: 'c1', user_id: 'u1',
          channel: 'push', notification_type: 'interview',
          is_enabled: false, created_at: '2026-06-20T10:00:00Z',
          updated_at: '2026-06-20T11:00:00Z',
        },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await notificationCenterService.updatePreference('u1', 'push', 'interview', false)
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          channel: 'push',
          notification_type: 'interview',
          is_enabled: false,
        }),
        { onConflict: 'user_id,channel,notification_type' }
      )
      expect(result.is_enabled).toBe(false)
    })
  })

  describe('sensitive data stripping', () => {
    it('redacts salary info from notification body', async () => {
      const chain = makeChain({
        data: [
          {
            id: 'n1', company_id: 'c1', user_id: 'u1',
            title: 'Payroll update', body: 'Employee salary: 50000',
            notification_type: 'system', reference_type: null,
            reference_id: null, is_read: false, action_url: null,
            created_at: '2026-06-20T10:00:00Z',
          },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await notificationCenterService.getNotifications('u1', 'c1')
      expect(result[0].body).toContain('[REDACTED]')
      expect(result[0].body).not.toContain('50000')
    })

    it('redacts national_id from notification body', async () => {
      const chain = makeChain({
        data: [
          {
            id: 'n1', company_id: 'c1', user_id: 'u1',
            title: 'ID update', body: 'national_id=123456789',
            notification_type: 'system', reference_type: null,
            reference_id: null, is_read: false, action_url: null,
            created_at: '2026-06-20T10:00:00Z',
          },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await notificationCenterService.getNotifications('u1', 'c1')
      expect(result[0].body).toContain('[REDACTED]')
      expect(result[0].body).not.toContain('123456789')
    })
  })

  describe('RLS isolation', () => {
    it('scopes queries to company_id + user_id', async () => {
      const chain = makeChain({ data: [], error: null })
      mockSupabase.from.mockReturnValue(chain)

      await notificationCenterService.getNotifications('user-A', 'company-X')

      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-A')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-X')
    })

    it('markAllAsRead only affects own company', async () => {
      const chain = makeChain({ data: null, error: null })
      mockSupabase.from.mockReturnValue(chain)

      await notificationCenterService.markAllAsRead('u1', 'c1')

      const eqCalls = chain.eq.mock.calls.map((c: unknown[]) => c[0])
      expect(eqCalls).toContain('company_id')
      expect(eqCalls).toContain('user_id')
    })
  })
})

// ────────────────────────────────────────────────
// GLOBAL SEARCH
// ────────────────────────────────────────────────
describe('globalSearchService', () => {
  describe('search', () => {
    it('requires search:read permission', async () => {
      vi.mocked(hasPermission).mockResolvedValue(false)
      await expect(
        globalSearchService.search('c1', 'test', 'employee')
      ).rejects.toThrow('Insufficient permissions: search:read required')
    })

    it('returns empty for short queries', async () => {
      const result = await globalSearchService.search('c1', 'ab', 'admin')
      expect(result).toEqual([])
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('returns empty for whitespace-only queries', async () => {
      const result = await globalSearchService.search('c1', '   ', 'admin')
      expect(result).toEqual([])
    })

    it('performs text search with correct company scope', async () => {
      const chain = makeChain({
        data: [
          {
            id: 'gs1', entity_type: 'candidate', entity_id: 'cand-1',
            title: 'John Doe', subtitle: 'Engineer',
            metadata: { email: 'john@test.com' },
          },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await globalSearchService.search('c1', 'john', 'admin')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('John Doe')
      expect(result[0].route).toBe('/recruitment/candidates/cand-1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'c1')
    })

    it('filters by entity_types when provided', async () => {
      const chain = makeChain({ data: [], error: null })
      mockSupabase.from.mockReturnValue(chain)

      await globalSearchService.search('c1', 'engineer', 'admin', ['job', 'candidate'])

      expect(chain.in).toHaveBeenCalledWith('entity_type', ['job', 'candidate'])
    })

    it('does not filter entity_types when not provided', async () => {
      const chain = makeChain({ data: [], error: null })
      mockSupabase.from.mockReturnValue(chain)

      await globalSearchService.search('c1', 'engineer', 'admin')

      expect(chain.in).not.toHaveBeenCalled()
    })
  })

  describe('sensitive data in snippets', () => {
    it('redacts salary from search results', async () => {
      const chain = makeChain({
        data: [
          {
            id: 'gs1', entity_type: 'employee', entity_id: 'emp-1',
            title: 'Jane Smith', subtitle: 'salary: 120000',
            metadata: {},
          },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await globalSearchService.search('c1', 'jane', 'admin')
      expect(result[0].subtitle).toContain('[REDACTED]')
      expect(result[0].subtitle).not.toContain('120000')
    })

    it('redacts bank_account from title', async () => {
      const chain = makeChain({
        data: [
          {
            id: 'gs1', entity_type: 'employee', entity_id: 'emp-1',
            title: 'bank_account=12345678', subtitle: 'Finance',
            metadata: {},
          },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await globalSearchService.search('c1', 'bank', 'admin')
      expect(result[0].title).toContain('[REDACTED]')
      expect(result[0].title).not.toContain('12345678')
    })

    it('redacts ssn from metadata-influenced subtitle', async () => {
      const chain = makeChain({
        data: [
          {
            id: 'gs1', entity_type: 'employee', entity_id: 'emp-1',
            title: 'Test User', subtitle: 'ssn: 999-99-9999',
            metadata: {},
          },
        ],
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await globalSearchService.search('c1', 'test', 'admin')
      expect(result[0].subtitle).toContain('[REDACTED]')
      expect(result[0].subtitle).not.toContain('999-99-9999')
    })
  })

  describe('indexEntity', () => {
    it('upserts entity with correct data', async () => {
      const chain = makeChain({ data: null, error: null })
      mockSupabase.from.mockReturnValue(chain)

      await globalSearchService.indexEntity('c1', 'candidate', 'cand-1', 'John', 'Engineer', 'john engineer')
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'c1',
          entity_type: 'candidate',
          entity_id: 'cand-1',
          title: 'John',
          subtitle: 'Engineer',
          searchable_text: 'john engineer',
        }),
        { onConflict: 'company_id,entity_type,entity_id' }
      )
    })
  })

  describe('removeEntity', () => {
    it('deletes entity with correct scope', async () => {
      const chain = makeChain({ data: null, error: null })
      mockSupabase.from.mockReturnValue(chain)

      await globalSearchService.removeEntity('c1', 'candidate', 'cand-1')
      expect(chain.delete).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'c1')
      expect(chain.eq).toHaveBeenCalledWith('entity_type', 'candidate')
      expect(chain.eq).toHaveBeenCalledWith('entity_id', 'cand-1')
    })
  })

  describe('RLS isolation', () => {
    it('always scopes to company_id', async () => {
      const chain = makeChain({ data: [], error: null })
      mockSupabase.from.mockReturnValue(chain)

      await globalSearchService.search('company-Y', 'test', 'admin')

      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-Y')
    })
  })
})

// ────────────────────────────────────────────────
// NOTIFICATION PREFERENCES RESPECTED
// ────────────────────────────────────────────────
describe('notification preferences', () => {
  it('isNotificationEnabled returns true when preference missing (default on)', async () => {
    const chain = makeChain({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await notificationCenterService.isNotificationEnabled('u1', 'email', 'system_alert')
    expect(result).toBe(true)
  })

  it('isNotificationEnabled returns false when explicitly disabled', async () => {
    const chain = makeChain({ data: { is_enabled: false }, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await notificationCenterService.isNotificationEnabled('u1', 'email', 'system_alert')
    expect(result).toBe(false)
  })

  it('isNotificationEnabled returns true when explicitly enabled', async () => {
    const chain = makeChain({ data: { is_enabled: true }, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const result = await notificationCenterService.isNotificationEnabled('u1', 'push', 'new_applicant')
    expect(result).toBe(true)
  })
})
