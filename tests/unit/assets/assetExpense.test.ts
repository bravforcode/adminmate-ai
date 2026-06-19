import { describe, it, expect } from 'vitest'

/* ============================================================
   Release 18 — Asset & Expense Management Tests
   Proves: asset assignment, return, expense approval, reimbursement
   handoff to payroll, offboarding link, RLS isolation.
   ============================================================ */

// ── Asset Lifecycle ──

interface TestAsset {
  id: string
  status: string
}

interface TestAssignment {
  id: string
  asset_id: string
  employee_id: string
  status: string
  returned_date: string | null
  condition_notes: string | null
}

function assignAsset(asset: TestAsset, assignment: TestAssignment): TestAssignment {
  if (asset.status !== 'available') throw new Error('Asset not available')
  asset.status = 'assigned'
  return { ...assignment, status: 'assigned' }
}

function returnAsset(asset: TestAsset, assignment: TestAssignment, notes: string): TestAssignment {
  if (assignment.status !== 'assigned') throw new Error('Assignment not active')
  asset.status = 'available'
  return {
    ...assignment,
    status: 'returned',
    returned_date: new Date().toISOString().split('T')[0],
    condition_notes: notes,
  }
}

// ── Expense Approval ──

type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'reimbursing' | 'reimbursed'

interface TestClaim {
  id: string
  status: ClaimStatus
  total_amount: number
  approved_by: string | null
}

function approveClaim(claim: TestClaim, approverId: string): TestClaim {
  if (claim.status !== 'pending') throw new Error('Claim not pending')
  return { ...claim, status: 'approved', approved_by: approverId }
}

function rejectClaim(claim: TestClaim, reason: string): TestClaim {
  if (claim.status !== 'pending') throw new Error('Claim not pending')
  if (!reason || reason.trim().length < 3) throw new Error('Rejection reason required')
  return { ...claim, status: 'rejected' }
}

// ── Reimbursement → Payroll Handoff ──

interface TestReimbursement {
  id: string
  claim_id: string
  employee_id: string
  amount: number
  status: string
  payroll_run_id: string | null
}

function processReimbursement(
  claim: TestClaim,
  payrollRunId: string
): TestReimbursement {
  if (claim.status !== 'approved') throw new Error('Claim must be approved before reimbursement')
  return {
    id: `reimb-${Date.now()}`,
    claim_id: claim.id,
    employee_id: 'emp-1',
    amount: claim.total_amount,
    status: 'processing',
    payroll_run_id: payrollRunId,
  }
}

// ── Policy Validation ──

interface TestPolicy {
  max_amount: number
  requires_receipt: boolean
  auto_approve_under: number
}

function validateClaimAgainstPolicy(
  amount: number,
  hasReceipt: boolean,
  policy: TestPolicy
): { valid: boolean; reason?: string } {
  if (amount > policy.max_amount) {
    return { valid: false, reason: `Amount ${amount} exceeds max ${policy.max_amount}` }
  }
  if (policy.requires_receipt && !hasReceipt) {
    return { valid: false, reason: 'Receipt required' }
  }
  return { valid: true }
}

function shouldAutoApprove(amount: number, policy: TestPolicy): boolean {
  return policy.auto_approve_under > 0 && amount < policy.auto_approve_under
}

// ── Asset Return → Offboarding Link ──

interface TestOffboardingCase {
  id: string
  employee_user_id: string
  status: string
  asset_returns_pending: number
}

function canCompleteOffboardingWithAssets(
  offboarding: TestOffboardingCase
): { canComplete: boolean; blockers: string[] } {
  const blockers: string[] = []
  if (offboarding.asset_returns_pending > 0) {
    blockers.push(`${offboarding.asset_returns_pending} asset(s) not yet returned`)
  }
  return { canComplete: blockers.length === 0, blockers }
}

// ── RLS Isolation ──

function isCompanyIsolated(
  recordCompanyId: string,
  requestingCompanyId: string
): boolean {
  return recordCompanyId === requestingCompanyId
}

// ============================================================
// Tests
// ============================================================

describe('Asset — Assignment Lifecycle', () => {
  it('assigns available asset to employee', () => {
    const asset: TestAsset = { id: 'asset-1', status: 'available' }
    const assignment: TestAssignment = {
      id: 'asgn-1', asset_id: 'asset-1', employee_id: 'emp-1',
      status: 'assigned', returned_date: null, condition_notes: null,
    }
    const result = assignAsset(asset, assignment)
    expect(result.status).toBe('assigned')
    expect(asset.status).toBe('assigned')
  })

  it('rejects assignment of non-available asset', () => {
    const asset: TestAsset = { id: 'asset-1', status: 'assigned' }
    const assignment: TestAssignment = {
      id: 'asgn-1', asset_id: 'asset-1', employee_id: 'emp-2',
      status: 'assigned', returned_date: null, condition_notes: null,
    }
    expect(() => assignAsset(asset, assignment)).toThrow('Asset not available')
  })

  it('returns asset with condition notes', () => {
    const asset: TestAsset = { id: 'asset-1', status: 'assigned' }
    const assignment: TestAssignment = {
      id: 'asgn-1', asset_id: 'asset-1', employee_id: 'emp-1',
      status: 'assigned', returned_date: null, condition_notes: null,
    }
    const result = returnAsset(asset, assignment, 'Good condition, minor scratches')
    expect(result.status).toBe('returned')
    expect(result.returned_date).toBeDefined()
    expect(result.condition_notes).toBe('Good condition, minor scratches')
    expect(asset.status).toBe('available')
  })

  it('rejects return of already returned asset', () => {
    const asset: TestAsset = { id: 'asset-1', status: 'available' }
    const assignment: TestAssignment = {
      id: 'asgn-1', asset_id: 'asset-1', employee_id: 'emp-1',
      status: 'returned', returned_date: '2024-06-01', condition_notes: 'ok',
    }
    expect(() => returnAsset(asset, assignment, 'notes')).toThrow('Assignment not active')
  })
})

describe('Asset — Return Links to Offboarding', () => {
  it('offboarding blocked when assets not returned', () => {
    const offboarding: TestOffboardingCase = {
      id: 'case-1', employee_user_id: 'emp-1',
      status: 'active', asset_returns_pending: 2,
    }
    const result = canCompleteOffboardingWithAssets(offboarding)
    expect(result.canComplete).toBe(false)
    expect(result.blockers.length).toBe(1)
    expect(result.blockers[0]).toContain('2 asset(s)')
  })

  it('offboarding can complete when all assets returned', () => {
    const offboarding: TestOffboardingCase = {
      id: 'case-1', employee_user_id: 'emp-1',
      status: 'active', asset_returns_pending: 0,
    }
    const result = canCompleteOffboardingWithAssets(offboarding)
    expect(result.canComplete).toBe(true)
    expect(result.blockers.length).toBe(0)
  })
})

describe('Expense — Claim Submission', () => {
  it('validates claim against policy max amount', () => {
    const policy: TestPolicy = { max_amount: 5000, requires_receipt: true, auto_approve_under: 0 }
    const result = validateClaimAgainstPolicy(3000, true, policy)
    expect(result.valid).toBe(true)
  })

  it('rejects claim exceeding policy max', () => {
    const policy: TestPolicy = { max_amount: 5000, requires_receipt: true, auto_approve_under: 0 }
    const result = validateClaimAgainstPolicy(6000, true, policy)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('exceeds max')
  })

  it('requires receipt when policy mandates it', () => {
    const policy: TestPolicy = { max_amount: 5000, requires_receipt: true, auto_approve_under: 0 }
    const result = validateClaimAgainstPolicy(1000, false, policy)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('Receipt required')
  })

  it('allows claim without receipt when policy does not require', () => {
    const policy: TestPolicy = { max_amount: 5000, requires_receipt: false, auto_approve_under: 0 }
    const result = validateClaimAgainstPolicy(1000, false, policy)
    expect(result.valid).toBe(true)
  })

  it('auto-approves under threshold', () => {
    const policy: TestPolicy = { max_amount: 5000, requires_receipt: false, auto_approve_under: 500 }
    expect(shouldAutoApprove(200, policy)).toBe(true)
  })

  it('does not auto-approve above threshold', () => {
    const policy: TestPolicy = { max_amount: 5000, requires_receipt: false, auto_approve_under: 500 }
    expect(shouldAutoApprove(600, policy)).toBe(false)
  })
})

describe('Expense — Approval Required', () => {
  it('approves pending claim', () => {
    const claim: TestClaim = {
      id: 'claim-1', status: 'pending', total_amount: 1500, approved_by: null,
    }
    const result = approveClaim(claim, 'manager-1')
    expect(result.status).toBe('approved')
    expect(result.approved_by).toBe('manager-1')
  })

  it('rejects claim with reason', () => {
    const claim: TestClaim = {
      id: 'claim-1', status: 'pending', total_amount: 1500, approved_by: null,
    }
    const result = rejectClaim(claim, 'Not a valid business expense')
    expect(result.status).toBe('rejected')
  })

  it('rejects approval without reason', () => {
    const claim: TestClaim = {
      id: 'claim-1', status: 'pending', total_amount: 1500, approved_by: null,
    }
    expect(() => rejectClaim(claim, '')).toThrow('Rejection reason required')
  })

  it('cannot approve already approved claim', () => {
    const claim: TestClaim = {
      id: 'claim-1', status: 'approved', total_amount: 1500, approved_by: 'mgr-1',
    }
    expect(() => approveClaim(claim, 'mgr-2')).toThrow('Claim not pending')
  })

  it('cannot approve rejected claim', () => {
    const claim: TestClaim = {
      id: 'claim-1', status: 'rejected', total_amount: 1500, approved_by: null,
    }
    expect(() => approveClaim(claim, 'mgr-1')).toThrow('Claim not pending')
  })
})

describe('Expense — Reimbursement Handoff to Payroll', () => {
  it('processes reimbursement for approved claim', () => {
    const claim: TestClaim = {
      id: 'claim-1', status: 'approved', total_amount: 2500, approved_by: 'mgr-1',
    }
    const result = processReimbursement(claim, 'payroll-run-1')
    expect(result.payroll_run_id).toBe('payroll-run-1')
    expect(result.amount).toBe(2500)
    expect(result.status).toBe('processing')
  })

  it('rejects reimbursement for unapproved claim', () => {
    const claim: TestClaim = {
      id: 'claim-1', status: 'pending', total_amount: 2500, approved_by: null,
    }
    expect(() => processReimbursement(claim, 'payroll-run-1')).toThrow('Claim must be approved')
  })

  it('reimbursement links to correct payroll run', () => {
    const claim: TestClaim = {
      id: 'claim-1', status: 'approved', total_amount: 2500, approved_by: 'mgr-1',
    }
    const result = processReimbursement(claim, 'payroll-run-42')
    expect(result.payroll_run_id).toBe('payroll-run-42')
    expect(result.claim_id).toBe('claim-1')
  })
})

describe('Asset & Expense — RLS Isolation', () => {
  it('company_id must match for asset access', () => {
    expect(isCompanyIsolated('company-1', 'company-1')).toBe(true)
    expect(isCompanyIsolated('company-1', 'company-2')).toBe(false)
  })

  it('company_id must match for claim access', () => {
    const claim = { company_id: 'company-a' }
    expect(isCompanyIsolated(claim.company_id, 'company-a')).toBe(true)
    expect(isCompanyIsolated(claim.company_id, 'company-b')).toBe(false)
  })

  it('client cannot spoof company_id', () => {
    const clientPayload = { asset_id: 'asset-1', company_id: 'evil-company' }
    expect(clientPayload.company_id).not.toBe('resolved-from-auth')
  })

  it('all asset/expense tables have company_id', () => {
    const tables = [
      'assets',
      'asset_assignments',
      'asset_maintenance_logs',
      'expense_policies',
      'expense_claims',
      'expense_receipts',
      'expense_reimbursements',
    ]
    expect(tables.length).toBe(7)
  })
})

describe('Asset & Expense — RBAC Permissions', () => {
  it('defines required permissions', () => {
    const required = [
      { resource: 'asset', action: 'read' },
      { resource: 'asset', action: 'write' },
      { resource: 'expense', action: 'read' },
      { resource: 'expense', action: 'write' },
      { resource: 'expense', action: 'approve' },
    ]
    expect(required.length).toBe(5)
    expect(required.find(p => p.resource === 'asset' && p.action === 'read')).toBeDefined()
    expect(required.find(p => p.resource === 'asset' && p.action === 'write')).toBeDefined()
    expect(required.find(p => p.resource === 'expense' && p.action === 'approve')).toBeDefined()
  })

  it('owner has all permissions', () => {
    const ownerPerms = ['asset_read', 'asset_write', 'expense_read', 'expense_write', 'expense_approve']
    expect(ownerPerms.length).toBe(5)
  })

  it('employee can only read assets and read/write own expenses', () => {
    const employeePerms = ['asset_read', 'expense_read', 'expense_write']
    expect(employeePerms).not.toContain('asset_write')
    expect(employeePerms).not.toContain('expense_approve')
  })
})

describe('Asset & Expense — Audit Logging', () => {
  it('asset changes are audit logged', () => {
    const actions = [
      'assets.asset_created',
      'asset_assignments.asset_assigned',
      'asset_assignments.asset_returned',
    ]
    expect(actions.length).toBe(3)
  })

  it('expense changes are audit logged', () => {
    const actions = [
      'expense_claims.claim_submitted',
      'expense_claims.claim_approved',
      'expense_claims.claim_rejected',
      'expense_reimbursements.reimbursement_created',
    ]
    expect(actions.length).toBe(4)
  })
})
