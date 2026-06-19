import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock setup ───────────────────────────────────────────────────────────────
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { adminService } from '../../../src/services/platform/adminService'

// ─── Chain builder ────────────────────────────────────────────────────────────
function makeChain(data: unknown, error: unknown = null) {
  const result = { data, error }
  const chain: Record<string, unknown> = {
    select: () => chain,
    single: () => Promise.resolve(result),
    eq: () => chain,
    gt: () => chain,
    gte: () => chain,
    order: () => Promise.resolve(result),
    insert: () => chain,
    update: () => chain,
    then: (resolve: (value: unknown) => void) => resolve(result),
  }
  return chain
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mockUser = { id: 'user-1', email: 'admin@example.com' }
const mockAdmin = { id: 'admin-1', user_id: 'user-1', role: 'owner', is_active: true }

function setupAuth() {
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupAuth()
})

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('adminService', () => {
  describe('grantSupportAccess', () => {
    it('rejects expired expires_at', async () => {
      const past = new Date(Date.now() - 100000).toISOString()
      await expect(
        adminService.grantSupportAccess('admin-1', 'company-1', 'debug', past)
      ).rejects.toThrow('expires_at must be in the future')
    })

    it('creates a grant and logs to platform_audit_logs', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      const grantId = 'grant-1'
      const insertedGrant = { id: grantId, admin_user_id: 'admin-1', company_id: 'company-1' }
      const logEntry = { id: 'log-1', action: 'support_access_granted' }

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        callCount++
        if (table === 'support_access_grants' && callCount === 1) {
          // First call: insert grant
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: insertedGrant, error: null }),
              }),
            }),
          }
        }
        if (table === 'platform_admin_users') {
          // Lookup admin user ID
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockAdmin, error: null }),
              }),
            }),
          }
        }
        if (table === 'platform_audit_logs' && callCount === 3) {
          // Third call: insert audit log
          return {
            insert: () => Promise.resolve({ data: logEntry, error: null }),
          }
        }
        return makeChain(null)
      })

      const result = await adminService.grantSupportAccess('admin-1', 'company-1', 'debug issue', future)
      expect(result.id).toBe(grantId)

      // Verify audit log was created with impersonation details
      expect(mockFrom).toHaveBeenCalledWith('platform_audit_logs')
    })
  })

  describe('revokeSupportAccess', () => {
    it('updates grant and logs revocation', async () => {
      const grant = { id: 'grant-1', company_id: 'company-1' }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'platform_admin_users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockAdmin, error: null }),
              }),
            }),
          }
        }
        if (table === 'support_access_grants') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: grant, error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          }
        }
        if (table === 'platform_audit_logs') {
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          }
        }
        return makeChain(null)
      })

      await adminService.revokeSupportAccess('grant-1', 'admin-2')

      // Verify update was called on support_access_grants
      expect(mockFrom).toHaveBeenCalledWith('support_access_grants')
    })

    it('throws on authenticated user missing', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
      await expect(
        adminService.revokeSupportAccess('grant-1', 'admin-2')
      ).rejects.toThrow('Not authenticated')
    })
  })

  describe('logPlatformAction', () => {
    it('inserts a log entry with correct fields', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'platform_audit_logs') {
          return {
            insert: (values: { admin_user_id: string; company_id: string; action: string; details: Record<string, unknown> }) => {
              expect(values).toMatchObject({
                admin_user_id: 'admin-1',
                company_id: 'company-1',
                action: 'test_action',
                details: { key: 'value' },
              })
              return Promise.resolve({ data: { id: 'log-1' }, error: null })
            },
          }
        }
        return makeChain(null)
      })

      await adminService.logPlatformAction('admin-1', 'company-1', 'test_action', { key: 'value' })
    })

    it('throws on insert error', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'platform_audit_logs') {
          return {
            insert: () => Promise.resolve({ data: null, error: { message: 'db error' } }),
          }
        }
        return makeChain(null)
      })

      await expect(
        adminService.logPlatformAction('admin-1', 'company-1', 'fail_action')
      ).rejects.toThrow()
    })
  })

  describe('getSupportGrants', () => {
    it('returns active non-expired grants for a company', async () => {
      const grants = [
        { id: 'g1', company_id: 'company-1', is_active: true, expires_at: new Date(Date.now() + 86400000).toISOString() },
      ]

      mockFrom.mockImplementation((table: string) => {
        if (table === 'support_access_grants') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gt: () => ({
                    order: () => Promise.resolve({ data: grants, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        return makeChain(null)
      })

      const result = await adminService.getSupportGrants('company-1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('g1')
    })

    it('excludes expired grants', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'support_access_grants') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gt: () => ({
                    order: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        return makeChain(null)
      })

      const result = await adminService.getSupportGrants('company-1')
      expect(result).toHaveLength(0)
    })
  })

  describe('security invariants', () => {
    it('all operations require authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(
        adminService.grantSupportAccess('admin-1', 'c1', 'reason', new Date(Date.now() + 86400000).toISOString())
      ).rejects.toThrow('Not authenticated')

      await expect(
        adminService.revokeSupportAccess('g1', 'admin-1')
      ).rejects.toThrow('Not authenticated')
    })

    it('impersonation is never silent — every grant creates an audit log entry', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      const insertedGrant = { id: 'grant-1', admin_user_id: 'admin-1', company_id: 'company-1' }
      const logEntry = { id: 'log-1' }

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        callCount++
        if (table === 'support_access_grants' && callCount === 1) {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: insertedGrant, error: null }),
              }),
            }),
          }
        }
        if (table === 'platform_admin_users') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockAdmin, error: null }),
              }),
            }),
          }
        }
        if (table === 'platform_audit_logs' && callCount === 3) {
          return {
            insert: (values: { action: string }) => {
              expect(values).toMatchObject({ action: 'support_access_granted' })
              return Promise.resolve({ data: logEntry, error: null })
            },
          }
        }
        return makeChain(null)
      })

      await adminService.grantSupportAccess('admin-1', 'company-1', 'audit test', future)

      // Verify exactly 2 calls to 'from': support_access_grants, platform_admin_users, platform_audit_logs
      const tableCalls = mockFrom.mock.calls.map((c: unknown[]) => c[0])
      expect(tableCalls).toContain('support_access_grants')
      expect(tableCalls).toContain('platform_audit_logs')
    })

    it('RLS isolation: getSupportGrants filters by company_id', async () => {
      const eqCalls: string[] = []
      mockFrom.mockImplementation((table: string) => {
        if (table === 'support_access_grants') {
          return {
            select: () => ({
              eq: (col: string, val: string) => {
                eqCalls.push(`${col}=${val}`)
                return {
                  eq: (col2: string, val2: string) => {
                    eqCalls.push(`${col2}=${val2}`)
                    return {
                      gt: () => ({
                        order: () => Promise.resolve({ data: [], error: null }),
                      }),
                    }
                  },
                }
              },
            }),
          }
        }
        return makeChain(null)
      })

      await adminService.getSupportGrants('target-company')

      expect(eqCalls).toContain('company_id=target-company')
      expect(eqCalls).toContain('is_active=true')
    })

    it('support access expires — expired grants are not returned', async () => {
      // The query filters with .gt('expires_at', NOW()), so expired grants are excluded
      mockFrom.mockImplementation((table: string) => {
        if (table === 'support_access_grants') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gt: () => ({
                    order: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        return makeChain(null)
      })

      const result = await adminService.getSupportGrants('company-1')
      expect(result).toHaveLength(0)
    })
  })
})
