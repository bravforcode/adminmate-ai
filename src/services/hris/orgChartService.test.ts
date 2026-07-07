import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function createQueryMock(data: unknown, error: unknown = null) {
  const result = { data, error }
  const builder: Record<string, (...args: unknown[]) => typeof builder> & { then: typeof Promise.prototype.then } = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
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
  getOrgChart,
  getDirectReports,
  updateReportingLine,
  getEmployeeReportingLine,
} from './orgChartService'

describe('orgChartService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrgChart', () => {
    it('should return org chart nodes for a company', async () => {
      const mockNodes = [
        { id: 'node-1', employee_id: 'emp-1', company_id: 'comp-1', position_title: 'CEO', effective_from: '2024-01-01' },
        { id: 'node-2', employee_id: 'emp-2', company_id: 'comp-1', manager_employee_id: 'emp-1', position_title: 'VP', effective_from: '2024-01-01' },
      ]
      mockFrom.mockReturnValueOnce(createQueryMock(mockNodes))

      const result = await getOrgChart('comp-1')
      expect(result).toHaveLength(2)
      expect(result[0].position_title).toBe('CEO')
    })

    it('should throw on supabase error', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock(null, new Error('db error')))

      await expect(getOrgChart('comp-1')).rejects.toThrow('db error')
    })
  })

  describe('getDirectReports', () => {
    it('should return direct reports for a manager', async () => {
      const mockReports = [
        { id: 'node-2', employee_id: 'emp-2', manager_employee_id: 'mgr-1' },
      ]
      mockFrom.mockReturnValueOnce(createQueryMock(mockReports))

      const result = await getDirectReports('mgr-1')
      expect(result).toHaveLength(1)
      expect(result[0].manager_employee_id).toBe('mgr-1')
    })
  })

  describe('updateReportingLine', () => {
    it('should update reporting line', async () => {
      // Circular check
      mockFrom.mockReturnValueOnce(createQueryMock({ manager_employee_id: null }))
      // Deactivate current node
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      // Get employee job title
      mockFrom.mockReturnValueOnce(createQueryMock({ job_title: 'Engineer' }))
      // Insert new node
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      // Timeline event
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      await updateReportingLine('comp-1', 'emp-1', 'mgr-1', 'user-1')
      expect(mockFrom).toHaveBeenCalledWith('org_chart_nodes')
    })

    it('should throw if assigning self as manager', async () => {
      await expect(
        updateReportingLine('comp-1', 'emp-1', 'emp-1', 'user-1')
      ).rejects.toThrow('Cannot assign employee as their own manager')
    })

    it('should throw on circular manager relationship', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ manager_employee_id: 'emp-1' }))

      await expect(
        updateReportingLine('comp-1', 'emp-1', 'mgr-1', 'user-1')
      ).rejects.toThrow('Circular manager relationship')
    })
  })

  describe('getEmployeeReportingLine', () => {
    it('should return the full reporting line', async () => {
      const mockNode = { id: 'node-1', employee_id: 'emp-1', manager_employee_id: 'mgr-1', position_title: 'Engineer' }
      const mockMgrNode = { id: 'node-2', employee_id: 'mgr-1', manager_employee_id: null, position_title: 'VP' }

      mockFrom.mockReturnValueOnce(createQueryMock(mockNode))
      mockFrom.mockReturnValueOnce(createQueryMock(mockMgrNode))

      const result = await getEmployeeReportingLine('emp-1')
      expect(result).toHaveLength(2)
      expect(result[0].employee_id).toBe('emp-1')
      expect(result[1].employee_id).toBe('mgr-1')
    })

    it('should stop at root (no manager)', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ id: 'node-1', employee_id: 'emp-1', manager_employee_id: null }))

      const result = await getEmployeeReportingLine('emp-1')
      expect(result).toHaveLength(1)
    })

    it('should return empty if no node found', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      const result = await getEmployeeReportingLine('unknown')
      expect(result).toHaveLength(0)
    })
  })
})
