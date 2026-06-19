import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))
vi.mock('../../../src/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}))

import { hasPermission, hasRole, hasAnyRole, getUserRoleNames } from '../../../src/services/permissionService'

describe('permissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasPermission', () => {
    it('returns true when RPC returns true', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      const result = await hasPermission('candidate', 'read')
      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('has_permission', {
        p_resource: 'candidate',
        p_action: 'read',
      })
    })

    it('returns false when RPC returns false', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      const result = await hasPermission('payroll', 'approve')
      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'network error' } })
      const result = await hasPermission('candidate', 'read')
      expect(result).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('returns true when user has the role', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      const result = await hasRole('admin')
      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('has_role', { p_role_name: 'admin' })
    })

    it('returns false when user lacks the role', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      const result = await hasRole('owner')
      expect(result).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('returns true when user has any of the roles', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      const result = await hasAnyRole(['admin', 'hr_manager'])
      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('has_any_role', {
        p_role_names: ['admin', 'hr_manager'],
      })
    })
  })

  describe('getUserRoleNames', () => {
    it('returns role name array', async () => {
      mockRpc.mockResolvedValue({ data: ['admin', 'hr_manager'], error: null })
      const result = await getUserRoleNames()
      expect(result).toEqual(['admin', 'hr_manager'])
    })

    it('returns empty array on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } })
      const result = await getUserRoleNames()
      expect(result).toEqual([])
    })
  })
})
