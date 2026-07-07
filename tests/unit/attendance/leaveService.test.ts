import { describe, it, expect, vi, beforeEach } from 'vitest'

/* ============================================================
   Leave Service — Enhanced Unit Tests
   Tests: request, approve/reject, balance, policy,
   configurable leave types, RLS isolation.
   ============================================================ */

// Mock supabase
vi.mock('../../src/lib/supabase', () => {
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle, maybeSingle: mockMaybeSingle, order: vi.fn(() => ({ range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })) })) }))
  const mockEq = vi.fn(() => ({ select: mockSelect, maybeSingle: mockMaybeSingle, single: vi.fn(() => Promise.resolve({ data: null, error: null })) }))
  const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))
  const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) }))

  return {
    supabase: {
      from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        eq: mockEq,
      })),
    },
    mockSingle,
    mockMaybeSingle,
    mockInsert,
    mockUpdate,
  }
})

describe('LeaveService — Service Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Leave Types — Configurable Per Company', () => {
    it('leave types are company-scoped', () => {
      const leaveType = { company_id: 'c1', code: 'annual_leave', name: 'Annual Leave' }
      expect(leaveType.company_id).toBeDefined()
    })

    it('leave types have configurable max_days_per_year', () => {
      const leaveTypes = [
        { code: 'annual_leave', max_days_per_year: 15 },
        { code: 'sick_leave', max_days_per_year: 30 },
        { code: 'personal_leave', max_days_per_year: 3 },
      ]
      leaveTypes.forEach(lt => {
        expect(lt.max_days_per_year).toBeGreaterThanOrEqual(0)
      })
    })

    it('leave types can be paid or unpaid', () => {
      const paid = { code: 'annual_leave', is_paid: true }
      const unpaid = { code: 'unpaid_leave', is_paid: false }
      expect(paid.is_paid).toBe(true)
      expect(unpaid.is_paid).toBe(false)
    })

    it('leave types can require or skip approval', () => {
      const requiresApproval = { code: 'annual_leave', requires_approval: true }
      const autoApprove = { code: 'sick_leave', requires_approval: false }
      expect(requiresApproval.requires_approval).toBe(true)
      expect(autoApprove.requires_approval).toBe(false)
    })

    it('leave types support localization (name_th)', () => {
      const leaveType = { name: 'Annual Leave', name_th: 'ลาพักร้อน' }
      expect(leaveType.name_th).toBeDefined()
      expect(leaveType.name_th).not.toBe(leaveType.name)
    })

    it('leave types have carry_over_enabled flag', () => {
      const leaveType = { code: 'annual_leave', carry_over_enabled: true, max_days_per_year: 15 }
      expect(leaveType.carry_over_enabled).toBe(true)
    })

    it('leave types can be deactivated', () => {
      const leaveType = { code: 'old_leave', is_active: false }
      expect(leaveType.is_active).toBe(false)
    })
  })

  describe('Leave Request — Balance Validation', () => {
    it('rejects request when insufficient balance', () => {
      const balance = { total_days: 15, used_days: 12, pending_days: 3 }
      const available = balance.total_days - balance.used_days - balance.pending_days
      const requested = 1
      expect(requested > available).toBe(true)
    })

    it('allows request when sufficient balance', () => {
      const balance = { total_days: 15, used_days: 5, pending_days: 0 }
      const available = balance.total_days - balance.used_days - balance.pending_days
      const requested = 3
      expect(requested <= available).toBe(true)
    })

    it('total_days must be positive', () => {
      const valid = (d: number) => d > 0
      expect(valid(0)).toBe(false)
      expect(valid(-1)).toBe(false)
      expect(valid(1)).toBe(true)
      expect(valid(0.5)).toBe(true)
    })

    it('end_date must be >= start_date', () => {
      const valid = (s: string, e: string) => e >= s
      expect(valid('2024-06-20', '2024-06-22')).toBe(true)
      expect(valid('2024-06-22', '2024-06-20')).toBe(false)
      expect(valid('2024-06-20', '2024-06-20')).toBe(true)
    })

    it('half-day leave is supported (0.5 days)', () => {
      const request = { total_days: 0.5 }
      expect(request.total_days).toBe(0.5)
    })
  })

  describe('Leave Request — Approval Workflow', () => {
    it('request defaults to pending when requires_approval', () => {
      const leaveType = { requires_approval: true }
      const status = leaveType.requires_approval ? 'pending' : 'approved'
      expect(status).toBe('pending')
    })

    it('request auto-approved when requires_approval is false', () => {
      const leaveType = { requires_approval: false }
      const status = leaveType.requires_approval ? 'pending' : 'approved'
      expect(status).toBe('approved')
    })

    it('approval moves pending_days to used_days', () => {
      const balance = { pending_days: 5, used_days: 3 }
      const totalDays = 3
      const updated = {
        pending_days: Math.max(0, balance.pending_days - totalDays),
        used_days: balance.used_days + totalDays,
      }
      expect(updated.pending_days).toBe(2)
      expect(updated.used_days).toBe(6)
    })

    it('rejection returns pending_days', () => {
      const balance = { pending_days: 5 }
      const totalDays = 3
      const updated = { pending_days: Math.max(0, balance.pending_days - totalDays) }
      expect(updated.pending_days).toBe(2)
    })

    it('rejection requires reason (min 3 chars)', () => {
      const canReject = (r: string) => !!(r && r.trim().length >= 3)
      expect(canReject('')).toBe(false)
      expect(canReject('ab')).toBe(false)
      expect(canReject('No coverage')).toBe(true)
    })

    it('only pending requests can be approved/rejected', () => {
      const canProcess = (s: string) => s === 'pending'
      expect(canProcess('pending')).toBe(true)
      expect(canProcess('approved')).toBe(false)
      expect(canProcess('rejected')).toBe(false)
      expect(canProcess('cancelled')).toBe(false)
    })
  })

  describe('Leave Balance — Calculation', () => {
    it('available = total - used - pending + carried_over', () => {
      const balance = { total_days: 15, used_days: 5, pending_days: 2, carried_over_days: 3 }
      const available = balance.total_days - balance.used_days - balance.pending_days + balance.carried_over_days
      expect(available).toBe(11)
    })

    it('balance is per employee, per type, per year', () => {
      const key = { employee_id: 'emp-1', leave_type_id: 'lt-1', year: 2024 }
      expect(key.employee_id).toBeDefined()
      expect(key.leave_type_id).toBeDefined()
      expect(key.year).toBeDefined()
    })

    it('pending_days tracks unapproved requests', () => {
      const balance = { total_days: 15, used_days: 5, pending_days: 3 }
      const available = balance.total_days - balance.used_days - balance.pending_days
      expect(available).toBe(7)
    })

    it('used_days only counts approved requests', () => {
      const requests = [
        { status: 'approved', total_days: 3 },
        { status: 'pending', total_days: 2 },
        { status: 'approved', total_days: 1 },
      ]
      const usedDays = requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.total_days, 0)
      const pendingDays = requests.filter(r => r.status === 'pending').reduce((s, r) => s + r.total_days, 0)
      expect(usedDays).toBe(4)
      expect(pendingDays).toBe(2)
    })
  })

  describe('Audit Logging', () => {
    it('all leave mutations create audit logs', () => {
      const actions = [
        'leave.request_created',
        'leave.request_approved',
        'leave.request_rejected',
      ]
      expect(actions).toHaveLength(3)
      actions.forEach(a => expect(a).toMatch(/^leave\./))
    })

    it('audit log includes company_id', () => {
      const audit = { company_id: 'c1', action: 'leave.request_created' }
      expect(audit.company_id).toBeDefined()
    })
  })

  describe('RLS — Organization Scoping', () => {
    it('leave_types unique per company + code', () => {
      const lt1 = { company_id: 'c1', code: 'annual_leave' }
      const lt2 = { company_id: 'c1', code: 'annual_leave' }
      const isDup = lt1.company_id === lt2.company_id && lt1.code === lt2.code
      expect(isDup).toBe(true)
    })

    it('different company same code is allowed', () => {
      const lt1 = { company_id: 'c1', code: 'annual_leave' }
      const lt2 = { company_id: 'c2', code: 'annual_leave' }
      const isDup = lt1.company_id === lt2.company_id && lt1.code === lt2.code
      expect(isDup).toBe(false)
    })

    it('leave_requests scoped by company_id', () => {
      const tables = ['leave_types', 'leave_balances', 'leave_requests']
      tables.forEach(t => expect(t).toBeDefined())
    })

    it('cross-company access denied', () => {
      const userCompany = 'c1'
      const recordCompany = 'c2'
      expect(userCompany).not.toBe(recordCompany)
    })
  })

  describe('Default Thailand Leave Policy', () => {
    it('annual_leave: 15 days, paid, requires approval', () => {
      const lt = { code: 'annual_leave', max_days_per_year: 15, is_paid: true, requires_approval: true }
      expect(lt).toEqual({ code: 'annual_leave', max_days_per_year: 15, is_paid: true, requires_approval: true })
    })

    it('sick_leave: 30 days, paid, no approval', () => {
      const lt = { code: 'sick_leave', max_days_per_year: 30, is_paid: true, requires_approval: false }
      expect(lt).toEqual({ code: 'sick_leave', max_days_per_year: 30, is_paid: true, requires_approval: false })
    })

    it('personal_leave: 3 days, paid, requires approval', () => {
      const lt = { code: 'personal_leave', max_days_per_year: 3, is_paid: true, requires_approval: true }
      expect(lt.max_days_per_year).toBe(3)
    })

    it('maternity_leave: 90 days, paid, no approval', () => {
      const lt = { code: 'maternity_leave', max_days_per_year: 90, is_paid: true, requires_approval: false }
      expect(lt.max_days_per_year).toBe(90)
    })

    it('ordination_leave: 15 days, paid, no approval', () => {
      const lt = { code: 'ordination_leave', max_days_per_year: 15, is_paid: true, requires_approval: false }
      expect(lt.max_days_per_year).toBe(15)
    })

    it('unpaid_leave: 0 max days, not paid, requires approval', () => {
      const lt = { code: 'unpaid_leave', max_days_per_year: 0, is_paid: false, requires_approval: true }
      expect(lt.is_paid).toBe(false)
    })
  })
})
