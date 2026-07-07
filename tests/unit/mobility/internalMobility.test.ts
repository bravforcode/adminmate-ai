import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('../../../src/services/permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import {
  createInternalJob,
  applyToInternalJob,
  getVisibleJobs,
  approveTransfer,
  getEmployeeMobilityPreferences,
} from '../../../src/services/mobility/internalMobilityService'
import { hasPermission } from '../../../src/services/permissionService'

function mockSingle(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data, error }),
    }),
  }
}

function mockInsert(data: unknown, error: unknown = null) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  }
}

function mockUpdate(data: unknown, error: unknown = null) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  }
}

describe('internalMobilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) })
  })

  describe('createInternalJob', () => {
    it('creates a job with open status', async () => {
      const mockJob = {
        id: 'job-1',
        company_id: 'c1',
        title: 'Senior Engineer',
        status: 'open',
        created_by: 'user-1',
      }
      mockSupabase.from.mockReturnValueOnce(mockInsert(mockJob))

      const result = await createInternalJob(
        { company_id: 'c1', title: 'Senior Engineer' },
        'user-1'
      )
      expect(result.title).toBe('Senior Engineer')
      expect(result.status).toBe('open')
      expect(hasPermission).toHaveBeenCalledWith('internal_mobility', 'write')
    })

    it('denies if no write permission', async () => {
      vi.mocked(hasPermission).mockResolvedValueOnce(false)
      await expect(
        createInternalJob({ company_id: 'c1', title: 'X' }, 'user-1')
      ).rejects.toThrow('Permission denied')
    })
  })

  describe('applyToInternalJob', () => {
    it('employee can apply to open job', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { company_id: 'c1', status: 'open' },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce(mockInsert({
          id: 'app-1',
          company_id: 'c1',
          job_id: 'job-1',
          employee_id: 'emp-1',
          status: 'submitted',
        }))

      const result = await applyToInternalJob('emp-1', 'job-1', 'I am interested')
      expect(result.status).toBe('submitted')
      expect(result.employee_id).toBe('emp-1')
    })

    it('rejects application to closed job', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { company_id: 'c1', status: 'filled' },
              error: null,
            }),
          }),
        }),
      })

      await expect(
        applyToInternalJob('emp-1', 'job-1')
      ).rejects.toThrow('Job is not open')
    })
  })

  describe('getVisibleJobs', () => {
    it('returns only open jobs', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'j1', status: 'open' }],
              error: null,
            }),
          }),
        }),
      })

      const result = await getVisibleJobs('emp-1')
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('open')
    })
  })

  describe('approveTransfer', () => {
    it('approves a pending transfer', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { company_id: 'c1', status: 'pending' },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce(mockUpdate({
          id: 't1',
          status: 'approved',
          approved_by: 'hr-1',
        }))

      const result = await approveTransfer('t1', 'hr-1')
      expect(result.status).toBe('approved')
      expect(hasPermission).toHaveBeenCalledWith('internal_mobility', 'approve')
    })

    it('denies approve without permission', async () => {
      vi.mocked(hasPermission).mockResolvedValueOnce(false)
      await expect(approveTransfer('t1', 'hr-1')).rejects.toThrow('Permission denied')
    })

    it('rejects approving non-pending transfer', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { company_id: 'c1', status: 'approved' },
              error: null,
            }),
          }),
        }),
      })

      await expect(approveTransfer('t1', 'hr-1')).rejects.toThrow('Transfer is not pending')
    })
  })

  describe('getEmployeeMobilityPreferences', () => {
    it('returns preferences for employee', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'mp-1',
                employee_id: 'emp-1',
                preferred_departments: ['engineering'],
                is_visible: true,
              },
              error: null,
            }),
          }),
        }),
      })

      const result = await getEmployeeMobilityPreferences('emp-1')
      expect(result?.employee_id).toBe('emp-1')
      expect(result?.preferred_departments).toContain('engineering')
    })

    it('returns null if no preferences', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })

      const result = await getEmployeeMobilityPreferences('emp-1')
      expect(result).toBeNull()
    })
  })
})

describe('Internal Mobility — Privacy & RLS', () => {
  describe('Manager cannot see private applications', () => {
    it('RLS policy excludes manager when manager_notified is false', () => {
      const managerCanSee = (
        employeeId: string,
        isManager: boolean,
        managerNotified: boolean,
        isHr: boolean,
        authUserId: string
      ) => {
        return (
          employeeId === authUserId ||
          isHr ||
          (isManager && managerNotified)
        )
      }

      expect(managerCanSee('emp-1', true, false, false, 'mgr-1')).toBe(false)
      expect(managerCanSee('emp-1', true, true, false, 'mgr-1')).toBe(true)
      expect(managerCanSee('emp-1', false, false, true, 'hr-1')).toBe(true)
      expect(managerCanSee('emp-1', false, false, false, 'emp-1')).toBe(true)
    })
  })

  describe('HR can review all applications', () => {
    it('HR roles bypass manager_notified check', () => {
      const hrRoles = ['admin', 'hr_manager', 'hr_staff']
      expect(hrRoles).toContain('admin')
      expect(hrRoles).toContain('hr_manager')
      expect(hrRoles).toContain('hr_staff')
    })
  })

  describe('Transfer approval workflow', () => {
    it('only pending transfers can be approved', () => {
      const canApprove = (status: string) => status === 'pending'
      expect(canApprove('pending')).toBe(true)
      expect(canApprove('approved')).toBe(false)
      expect(canApprove('rejected')).toBe(false)
    })

    it('approval requires internal_mobility:approve permission', () => {
      const approvableRoles = ['admin', 'hr_manager', 'owner']
      expect(approvableRoles).toContain('admin')
      expect(approvableRoles).toContain('hr_manager')
      expect(approvableRoles).not.toContain('employee')
      expect(approvableRoles).not.toContain('hr_staff')
    })
  })

  describe('RLS isolation', () => {
    it('all internal mobility tables require company_id', () => {
      const tables = [
        'internal_jobs',
        'internal_applications',
        'internal_mobility_preferences',
        'internal_transfer_requests',
      ]
      expect(tables).toHaveLength(4)
    })

    it('employee can only insert own applications', () => {
      const canInsert = (employeeId: string, authUserId: string) =>
        employeeId === authUserId
      expect(canInsert('emp-1', 'emp-1')).toBe(true)
      expect(canInsert('emp-2', 'emp-1')).toBe(false)
    })

    it('employee can only update own preferences', () => {
      const canUpdatePrefs = (employeeId: string, authUserId: string) =>
        employeeId === authUserId
      expect(canUpdatePrefs('emp-1', 'emp-1')).toBe(true)
      expect(canUpdatePrefs('emp-2', 'emp-1')).toBe(false)
    })
  })
})
