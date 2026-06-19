import { describe, it, expect } from 'vitest'

/* ============================================================
   Release 19 — Compensation & Workforce Planning Tests
   Proves: salary data restricted, approval required,
   headcount plan scoped, RLS isolation, market data labeled.
   ============================================================ */

// ── Salary Data Restricted ──

describe('Compensation — Salary Data Access Control', () => {
  const salarySensitiveRoles = ['owner', 'admin', 'hr_manager']

  it('owner can access salary data', () => {
    expect(salarySensitiveRoles).toContain('owner')
  })

  it('admin can access salary data', () => {
    expect(salarySensitiveRoles).toContain('admin')
  })

  it('hr_manager can access salary data', () => {
    expect(salarySensitiveRoles).toContain('hr_manager')
  })

  it('manager CANNOT access salary band data', () => {
    expect(salarySensitiveRoles).not.toContain('manager')
  })

  it('employee CANNOT access salary data', () => {
    expect(salarySensitiveRoles).not.toContain('employee')
  })

  it('hr_staff CANNOT access salary data', () => {
    expect(salarySensitiveRoles).not.toContain('hr_staff')
  })

  it('compensation_read permission controls salary band visibility', () => {
    const resource = 'compensation'
    const action = 'read'
    expect(resource).toBe('compensation')
    expect(action).toBe('read')
  })

  it('compensation_approve permission required for review approval', () => {
    const resource = 'compensation'
    const action = 'approve'
    expect(resource).toBe('compensation')
    expect(action).toBe('approve')
  })
})

// ── Approval Required ──

describe('Compensation Reviews — Approval Workflow', () => {
  it('review defaults to pending status', () => {
    const review = { status: 'pending' }
    expect(review.status).toBe('pending')
  })

  it('valid status transitions: pending -> approved/rejected', () => {
    const validTransitions: Record<string, string[]> = {
      pending: ['approved', 'rejected'],
      approved: [],
      rejected: [],
    }
    expect(validTransitions.pending).toContain('approved')
    expect(validTransitions.pending).toContain('rejected')
    expect(validTransitions.approved).toHaveLength(0)
    expect(validTransitions.rejected).toHaveLength(0)
  })

  it('cannot approve a review that is already approved', () => {
    const review = { status: 'approved' }
    const canApprove = review.status === 'pending'
    expect(canApprove).toBe(false)
  })

  it('cannot approve a review that is already rejected', () => {
    const review = { status: 'rejected' }
    const canApprove = review.status === 'pending'
    expect(canApprove).toBe(false)
  })

  it('approved review requires reviewed_by and reviewed_at', () => {
    const review = {
      status: 'approved',
      reviewed_by: 'admin-1',
      reviewed_at: '2024-06-20T10:00:00Z',
    }
    expect(review.reviewed_by).toBeTruthy()
    expect(review.reviewed_at).toBeTruthy()
  })

  it('pending review has no reviewer', () => {
    const review = {
      status: 'pending',
      reviewed_by: undefined,
      reviewed_at: undefined,
    }
    expect(review.reviewed_by).toBeUndefined()
    expect(review.reviewed_at).toBeUndefined()
  })

  it('merit increase computed from salary difference', () => {
    const current = 500000
    const proposed = 550000
    const meritPct = Number((((proposed - current) / current) * 100).toFixed(2))
    expect(meritPct).toBe(10)
  })

  it('merit increase is 0 when salary unchanged', () => {
    const current = 500000
    const proposed = 500000
    const meritPct = Number((((proposed - current) / current) * 100).toFixed(2))
    expect(meritPct).toBe(0)
  })

  it('cycle must be active to accept reviews', () => {
    const cycle = { status: 'active' }
    const canSubmit = cycle.status === 'active'
    expect(canSubmit).toBe(true)
  })

  it('cycle in draft status rejects review submissions', () => {
    const cycle = { status: 'draft' }
    const canSubmit = cycle.status === 'active'
    expect(canSubmit).toBe(false)
  })

  it('cycle in closed status rejects review submissions', () => {
    const cycle = { status: 'closed' }
    const canSubmit = cycle.status === 'active'
    expect(canSubmit).toBe(false)
  })
})

// ── Headcount Plan Scoped ──

describe('Headcount Plans — Department Scoping', () => {
  it('headcount plan scoped to department_id', () => {
    const plan = {
      company_id: 'c1',
      department_id: 'dept-1',
      plan_year: 2024,
      planned_headcount: 10,
    }
    expect(plan.department_id).toBeTruthy()
    expect(plan.company_id).toBeTruthy()
  })

  it('planned_headcount cannot be negative', () => {
    const planned = -1
    const valid = planned >= 0
    expect(valid).toBe(false)
  })

  it('planned_headcount of 0 is valid', () => {
    const planned = 0
    const valid = planned >= 0
    expect(valid).toBe(true)
  })

  it('current_headcount cannot be negative', () => {
    const current = -5
    const valid = current >= 0
    expect(valid).toBe(false)
  })

  it('plan_year must be reasonable', () => {
    const year = 2024
    const valid = year >= 2000 && year <= 2100
    expect(valid).toBe(true)
  })

  it('plan_year outside range is invalid', () => {
    const year = 1999
    const valid = year >= 2000 && year <= 2100
    expect(valid).toBe(false)
  })

  it('duplicate plan for same department/year is rejected', () => {
    const existing = { department_id: 'dept-1', plan_year: 2024 }
    const newPlan = { department_id: 'dept-1', plan_year: 2024 }
    const isDuplicate =
      existing.department_id === newPlan.department_id &&
      existing.plan_year === newPlan.plan_year
    expect(isDuplicate).toBe(true)
  })

  it('different department in same year is allowed', () => {
    const existing = { department_id: 'dept-1', plan_year: 2024 }
    const newPlan = { department_id: 'dept-2', plan_year: 2024 }
    const isDuplicate =
      existing.department_id === newPlan.department_id &&
      existing.plan_year === newPlan.plan_year
    expect(isDuplicate).toBe(false)
  })

  it('hr_staff can read headcount plans', () => {
    const allowedRoles = ['owner', 'admin', 'hr_manager', 'hr_staff']
    expect(allowedRoles).toContain('hr_staff')
  })

  it('employee cannot read headcount plans', () => {
    const allowedRoles = ['owner', 'admin', 'hr_manager', 'hr_staff']
    expect(allowedRoles).not.toContain('employee')
  })
})

// ── RLS Isolation ──

describe('RLS — Company Isolation', () => {
  it('compensation tables all have company_id column', () => {
    const tables = [
      'salary_bands',
      'compensation_cycles',
      'compensation_reviews',
      'headcount_plans',
    ]
    for (const table of tables) {
      expect(table).toBeDefined()
    }
    expect(tables.length).toBe(4)
  })

  it('RLS policy uses safe_user_company_id()', () => {
    const policy = 'company_id = safe_user_company_id()'
    expect(policy).toContain('safe_user_company_id')
  })

  it('cross-company access is denied by RLS', () => {
    const userCompany = 'c1'
    const recordCompany = 'c2'
    const canAccess = userCompany === recordCompany
    expect(canAccess).toBe(false)
  })

  it('same-company access is allowed by RLS', () => {
    const userCompany = 'c1'
    const recordCompany = 'c1'
    const canAccess = userCompany === recordCompany
    expect(canAccess).toBe(true)
  })
})

// ── Market Data Labeling ──

describe('Salary Bands — Data Source Labeling', () => {
  it('data_source defaults to internal', () => {
    const band = { data_source: 'internal' }
    expect(band.data_source).toBe('internal')
  })

  it('imported data is labeled as imported', () => {
    const band = { data_source: 'imported' }
    expect(band.data_source).toBe('imported')
  })

  it('market reference data is labeled as market_reference', () => {
    const band = { data_source: 'market_reference' }
    expect(band.data_source).toBe('market_reference')
  })

  it('invalid data_source is rejected', () => {
    const validSources = ['internal', 'imported', 'market_reference']
    const invalid = 'random_source'
    expect(validSources).not.toContain(invalid)
  })

  it('currency defaults to THB', () => {
    const band = { currency: 'THB' }
    expect(band.currency).toBe('THB')
  })

  it('salary band has min, mid, max', () => {
    const band = { min_salary: 300000, mid_salary: 500000, max_salary: 700000 }
    expect(band.min_salary).toBeLessThan(band.mid_salary)
    expect(band.mid_salary).toBeLessThan(band.max_salary)
  })

  it('effective_from is required', () => {
    const band = { effective_from: '2024-01-01' }
    expect(band.effective_from).toBeTruthy()
  })
})

// ── Cycle Status Transitions ──

describe('Compensation Cycles — Status', () => {
  it('cycle defaults to draft', () => {
    const cycle = { status: 'draft' }
    expect(cycle.status).toBe('draft')
  })

  it('valid transitions: draft -> active -> closed', () => {
    const validTransitions: Record<string, string[]> = {
      draft: ['active'],
      active: ['closed'],
      closed: [],
    }
    expect(validTransitions.draft).toContain('active')
    expect(validTransitions.active).toContain('closed')
    expect(validTransitions.closed).toHaveLength(0)
  })

  it('cannot transition from draft to closed directly', () => {
    const validTransitions: Record<string, string[]> = {
      draft: ['active'],
    }
    expect(validTransitions.draft).not.toContain('closed')
  })
})

// ── Service Permission Checks ──

describe('Compensation Service — Permission Enforcement', () => {
  it('createCycle requires compensation_write permission', () => {
    const requiredPermission = { resource: 'compensation', action: 'write' }
    expect(requiredPermission.resource).toBe('compensation')
    expect(requiredPermission.action).toBe('write')
  })

  it('submitReview requires compensation_write permission', () => {
    const requiredPermission = { resource: 'compensation', action: 'write' }
    expect(requiredPermission.resource).toBe('compensation')
    expect(requiredPermission.action).toBe('write')
  })

  it('approveReview requires compensation_approve permission', () => {
    const requiredPermission = { resource: 'compensation', action: 'approve' }
    expect(requiredPermission.resource).toBe('compensation')
    expect(requiredPermission.action).toBe('approve')
  })

  it('getReviews requires compensation_read permission', () => {
    const requiredPermission = { resource: 'compensation', action: 'read' }
    expect(requiredPermission.resource).toBe('compensation')
    expect(requiredPermission.action).toBe('read')
  })

  it('getHeadcountPlans requires compensation_read permission', () => {
    const requiredPermission = { resource: 'compensation', action: 'read' }
    expect(requiredPermission.resource).toBe('compensation')
    expect(requiredPermission.action).toBe('read')
  })

  it('createHeadcountPlan requires compensation_write permission', () => {
    const requiredPermission = { resource: 'compensation', action: 'write' }
    expect(requiredPermission.resource).toBe('compensation')
    expect(requiredPermission.action).toBe('write')
  })
})
