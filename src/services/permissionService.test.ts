import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

import { hasPermission, hasRole, hasAnyRole, getUserRoleNames, checkPermissions } from './permissionService'

describe('permissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true when permission is granted', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const result = await hasPermission('candidates', 'read')
      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('has_permission', { p_resource: 'candidates', p_action: 'read' })
    })

    it('should return false when permission is denied', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      const result = await hasPermission('candidates', 'delete')
      expect(result).toBe(false)
    })

    it('should return false on RPC error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') })

      const result = await hasPermission('candidates', 'read')
      expect(result).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('should return true when user has role', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const result = await hasRole('admin')
      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('has_role', { p_role_name: 'admin' })
    })

    it('should return false when user does not have role', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      const result = await hasRole('super_admin')
      expect(result).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('should return true when user has any of the specified roles', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const result = await hasAnyRole(['admin', 'hr_manager'])
      expect(result).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith('has_any_role', { p_role_names: ['admin', 'hr_manager'] })
    })

    it('should return false when user has none of the specified roles', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      const result = await hasAnyRole(['super_admin', 'owner'])
      expect(result).toBe(false)
    })
  })

  describe('getUserRoleNames', () => {
    it('should return role names', async () => {
      mockRpc.mockResolvedValue({ data: ['admin', 'hr_manager'], error: null })

      const roles = await getUserRoleNames()
      expect(roles).toEqual(['admin', 'hr_manager'])
    })

    it('should return empty array on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') })

      const roles = await getUserRoleNames()
      expect(roles).toEqual([])
    })
  })

  describe('checkPermissions', () => {
    it('should return permission map for multiple checks', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: false, error: null })
        .mockResolvedValueOnce({ data: true, error: null })

      const result = await checkPermissions([
        { resource: 'candidates', action: 'read' },
        { resource: 'candidates', action: 'delete' },
        { resource: 'jobs', action: 'write' },
      ])

      expect(result['candidates:read']).toBe(true)
      expect(result['candidates:delete']).toBe(false)
      expect(result['jobs:write']).toBe(true)
    })
  })
})
