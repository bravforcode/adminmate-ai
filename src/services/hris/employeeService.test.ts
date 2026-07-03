import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// Simulate Supabase's thenable query builder
function createQueryMock(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder: Record<string, (...args: unknown[]) => typeof builder> & { then: typeof Promise.prototype.then } = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: function (resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) {
      if (error && reject) return Promise.reject(error).then(resolve, reject)
      return Promise.resolve(result).then(resolve, reject)
    },
  }
  return builder
}

import {
  createEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
  updateEmploymentStatus,
  assignManager,
  getDirectReports,
} from './employeeService'

describe('employeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createEmployee', () => {
    it('should create an employee with valid data', async () => {
      const mockEmployee = {
        id: 'emp-1', company_id: 'comp-1', employee_number: 'EMP00001',
        job_title: 'Engineer', employment_status: 'active', employment_type: 'full_time',
        hire_date: '2024-01-15', start_date: '2024-01-15', country_code: 'TH', timezone: 'Asia/Bangkok',
      }

      // Check uniqueness → null
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      // Insert
      mockFrom.mockReturnValueOnce(createQueryMock(mockEmployee))
      // Timeline event
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      // Audit log
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      const result = await createEmployee('comp-1', {
        employee_number: 'EMP00001', job_title: 'Engineer', employment_status: 'active',
        employment_type: 'full_time', hire_date: '2024-01-15', start_date: '2024-01-15',
        country_code: 'TH', timezone: 'Asia/Bangkok',
      }, 'user-1')

      expect(result).toBeDefined()
      expect(result.employee_number).toBe('EMP00001')
      expect(mockFrom).toHaveBeenCalledWith('employees')
    })

    it('should throw if employee number already exists', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ id: 'existing' }))

      await expect(
        createEmployee('comp-1', {
          employee_number: 'EMP00001', job_title: 'Engineer', employment_status: 'active',
          employment_type: 'full_time', hire_date: '2024-01-15', start_date: '2024-01-15',
          country_code: 'TH', timezone: 'Asia/Bangkok',
        }, 'user-1')
      ).rejects.toThrow('already exists')
    })
  })

  describe('getEmployee', () => {
    it('should return employee by id', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ id: 'emp-1', job_title: 'Engineer' }))

      const result = await getEmployee('emp-1')
      expect(result).toBeDefined()
      expect(result?.id).toBe('emp-1')
    })

    it('should throw on supabase error', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock(null, new Error('not found')))

      await expect(getEmployee('bad-id')).rejects.toThrow()
    })
  })

  describe('listEmployees', () => {
    it('should list employees for a company', async () => {
      const mockEmployees = [
        { id: 'emp-1', employee_number: 'EMP00001', job_title: 'Engineer' },
        { id: 'emp-2', employee_number: 'EMP00002', job_title: 'Designer' },
      ]
      mockFrom.mockReturnValueOnce(createQueryMock(mockEmployees))

      const result = await listEmployees('comp-1')
      expect(result).toHaveLength(2)
    })

    it('should apply status filter', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock([]))

      await listEmployees('comp-1', { status: 'active' })
      expect(mockFrom).toHaveBeenCalledWith('employees')
    })

    it('should apply search filter', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock([]))

      await listEmployees('comp-1', { search: 'engineer' })
      expect(mockFrom).toHaveBeenCalledWith('employees')
    })

    it('should throw on supabase error', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock(null, new Error('db error')))

      await expect(listEmployees('comp-1')).rejects.toThrow('db error')
    })
  })

  describe('updateEmployee', () => {
    it('should update an employee', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ id: 'emp-1', job_title: 'Senior Engineer' }))

      const result = await updateEmployee('emp-1', { job_title: 'Senior Engineer' })
      expect(result.job_title).toBe('Senior Engineer')
    })

    it('should throw on permission error', async () => {
      const { hasPermission } = await import('../permissionService')
      vi.mocked(hasPermission).mockResolvedValueOnce(false)

      await expect(
        updateEmployee('emp-1', { job_title: 'Senior Engineer' })
      ).rejects.toThrow('permission')
    })
  })

  describe('updateEmploymentStatus', () => {
    it('should update status with valid transition', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ company_id: 'comp-1', employment_status: 'active' }))
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      await updateEmploymentStatus('emp-1', 'on_leave', 'user-1', 'Vacation')
      expect(mockFrom).toHaveBeenCalledWith('employees')
    })

    it('should throw on invalid transition', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ company_id: 'comp-1', employment_status: 'terminated' }))

      await expect(
        updateEmploymentStatus('emp-1', 'on_leave', 'user-1')
      ).rejects.toThrow('Invalid employment status transition')
    })

    it('should throw if employee not found', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      await expect(
        updateEmploymentStatus('bad-id', 'active', 'user-1')
      ).rejects.toThrow('Employee not found')
    })
  })

  describe('assignManager', () => {
    it('should assign a manager', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ company_id: 'comp-1', manager_employee_id: null }))
      mockFrom.mockReturnValueOnce(createQueryMock({ manager_employee_id: null }))
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      await assignManager('emp-1', 'mgr-1', 'user-1')
      expect(mockFrom).toHaveBeenCalledWith('employees')
    })

    it('should throw if assigning self as manager', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ company_id: 'comp-1' }))

      await expect(
        assignManager('emp-1', 'emp-1', 'user-1')
      ).rejects.toThrow('Cannot assign employee as their own manager')
    })

    it('should throw if employee not found', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      await expect(
        assignManager('bad-id', 'mgr-1', 'user-1')
      ).rejects.toThrow('Employee not found')
    })
  })

  describe('getDirectReports', () => {
    it('should return direct reports', async () => {
      const mockReports = [
        { id: 'emp-2', manager_employee_id: 'mgr-1' },
        { id: 'emp-3', manager_employee_id: 'mgr-1' },
      ]
      mockFrom.mockReturnValueOnce(createQueryMock(mockReports))

      const result = await getDirectReports('mgr-1')
      expect(result).toHaveLength(2)
    })
  })
})
