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
  createChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  listChangeRequests,
} from './employeeChangeRequestService'

describe('employeeChangeRequestService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createChangeRequest', () => {
    it('should create a change request', async () => {
      const mockRequest = {
        id: 'req-1', company_id: 'comp-1', employee_id: 'emp-1',
        requested_by: 'user-1', request_type: 'personal_info', status: 'pending',
        requested_values: { first_name: 'New Name' },
      }

      mockFrom.mockReturnValueOnce(createQueryMock({ first_name: 'Old Name' }))
      mockFrom.mockReturnValueOnce(createQueryMock(mockRequest))
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      const result = await createChangeRequest('comp-1', 'emp-1', 'user-1', 'personal_info', { first_name: 'New Name' })
      expect(result).toBeDefined()
      expect(result.status).toBe('pending')
      expect(result.request_type).toBe('personal_info')
    })

    it('should create request even if profile not found', async () => {
      const mockRequest = {
        id: 'req-1', company_id: 'comp-1', employee_id: 'emp-1',
        request_type: 'contact_info', status: 'pending',
      }

      mockFrom.mockReturnValueOnce(createQueryMock(null))
      mockFrom.mockReturnValueOnce(createQueryMock(mockRequest))
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      const result = await createChangeRequest('comp-1', 'emp-1', 'user-1', 'contact_info', { phone: '123' })
      expect(result).toBeDefined()
    })
  })

  describe('approveChangeRequest', () => {
    it('should approve a pending request', async () => {
      const mockRequest = {
        id: 'req-1', company_id: 'comp-1', employee_id: 'emp-1',
        status: 'pending', requested_values: { first_name: 'New Name' },
      }

      mockFrom.mockReturnValueOnce(createQueryMock(mockRequest))
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      mockFrom.mockReturnValueOnce(createQueryMock(null))
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      await approveChangeRequest('req-1', 'hr-user-1')
      expect(mockFrom).toHaveBeenCalledWith('employee_change_requests')
    })

    it('should throw if request not found', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      await expect(approveChangeRequest('bad-id', 'hr-user-1')).rejects.toThrow('not found')
    })

    it('should throw if request is not pending', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock({ id: 'req-1', status: 'approved' }))

      await expect(approveChangeRequest('req-1', 'hr-user-1')).rejects.toThrow('Cannot approve')
    })
  })

  describe('rejectChangeRequest', () => {
    it('should reject a pending request with reason', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock(null))

      await rejectChangeRequest('req-1', 'hr-user-1', 'Insufficient documentation')
      expect(mockFrom).toHaveBeenCalledWith('employee_change_requests')
    })

    it('should throw if reason is too short', async () => {
      await expect(
        rejectChangeRequest('req-1', 'hr-user-1', 'no')
      ).rejects.toThrow('Rejection reason required')
    })

    it('should throw if reason is empty', async () => {
      await expect(
        rejectChangeRequest('req-1', 'hr-user-1', '')
      ).rejects.toThrow('Rejection reason required')
    })
  })

  describe('listChangeRequests', () => {
    it('should list change requests for a company', async () => {
      const mockRequests = [
        { id: 'req-1', status: 'pending', request_type: 'personal_info' },
        { id: 'req-2', status: 'approved', request_type: 'contact_info' },
      ]
      mockFrom.mockReturnValueOnce(createQueryMock(mockRequests))

      const result = await listChangeRequests('comp-1')
      expect(result).toHaveLength(2)
    })

    it('should apply employee filter', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock([]))

      await listChangeRequests('comp-1', { employeeId: 'emp-1' })
      expect(mockFrom).toHaveBeenCalledWith('employee_change_requests')
    })

    it('should apply status filter', async () => {
      mockFrom.mockReturnValueOnce(createQueryMock([]))

      await listChangeRequests('comp-1', { status: 'pending' })
      expect(mockFrom).toHaveBeenCalledWith('employee_change_requests')
    })
  })
})
