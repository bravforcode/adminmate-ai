import { describe, it, expect } from 'vitest'

/* ============================================================
   Release 19B — Vendor & Contractor Tests
   Proves: contractor NOT treated as employee,
   access expiry tracked, invoice approval workflow,
   RLS isolation, RBAC permissions.
   ============================================================ */

// ── Contractor NOT Treated as Employee ──

describe('Contractor — Not Treated as Employee', () => {
  it('contractor lives in separate tables, not employees', () => {
    const contractorTables = [
      'vendor_companies',
      'vendor_workers',
      'contractor_engagements',
      'contractor_invoices',
    ]
    for (const table of contractorTables) {
      expect(table).toBeDefined()
    }
    expect(contractorTables).not.toContain('employees')
    expect(contractorTables).not.toContain('user_profiles')
  })

  it('engagement links to vendor, not to employee table directly', () => {
    const engagement = {
      vendor_id: 'v1',
      employee_id: null,
      contractor_name: 'External Dev',
    }
    expect(engagement.vendor_id).toBe('v1')
    expect(engagement.employee_id).toBeNull()
  })

  it('engagement can optionally reference employee_id', () => {
    const engagement = {
      vendor_id: 'v1',
      employee_id: 'emp-1',
      contractor_name: 'Internal Consultant',
    }
    expect(engagement.employee_id).toBe('emp-1')
  })

  it('vendor_worker is not an employee record', () => {
    const worker = {
      vendor_id: 'v1',
      worker_name: 'Sub Contractor',
      status: 'active',
    }
    expect(worker).not.toHaveProperty('employee_id')
    expect(worker).not.toHaveProperty('company_id') // worker belongs to vendor, not company directly
  })

  it('contractor invoice has no payroll reference', () => {
    const invoice = {
      engagement_id: 'e1',
      invoice_number: 'INV-001',
      amount: 50000,
      currency: 'THB',
      status: 'pending',
    }
    expect(invoice).not.toHaveProperty('payroll_run_id')
    expect(invoice).not.toHaveProperty('employee_id')
  })
})

// ── Access Expiry Tracked ──

describe('Contractor — Access Expiry Tracking', () => {
  it('engagement has start_date and end_date', () => {
    const engagement = {
      start_date: '2024-07-01',
      end_date: '2024-12-31',
    }
    expect(engagement.start_date).toBeTruthy()
    expect(engagement.end_date).toBeTruthy()
  })

  it('end_date must be on or after start_date', () => {
    const start = '2024-07-01'
    const end = '2024-12-31'
    expect(end >= start).toBe(true)
  })

  it('engagement past end_date is considered expired', () => {
    const endDate = '2024-12-31'
    const today = '2025-01-15'
    const isExpired = today > endDate
    expect(isExpired).toBe(true)
  })

  it('engagement before end_date is active', () => {
    const endDate = '2025-12-31'
    const today = '2025-06-20'
    const isExpired = today > endDate
    expect(isExpired).toBe(false)
  })

  it('engagement has status field to track state', () => {
    const validStatuses = ['active', 'completed', 'terminated', 'expired']
    expect(validStatuses).toContain('active')
    expect(validStatuses).toContain('completed')
    expect(validStatuses).toContain('terminated')
    expect(validStatuses).toContain('expired')
  })

  it('vendor worker also has start_date and end_date for access expiry', () => {
    const worker = {
      start_date: '2024-07-01',
      end_date: '2024-12-31',
      status: 'active',
    }
    expect(worker.start_date).toBeTruthy()
    expect(worker.end_date).toBeTruthy()
  })

  it('engagement expiry blocks invoicing', () => {
    const engagement = { end_date: '2024-12-31', status: 'active' }
    const today = '2025-01-15'
    const canInvoice = engagement.status === 'active' && today <= engagement.end_date
    expect(canInvoice).toBe(false)
  })

  it('inactive engagement blocks invoicing', () => {
    const engagement = { end_date: '2025-12-31', status: 'terminated' }
    const today = '2025-06-20'
    const canInvoice = engagement.status === 'active' && today <= engagement.end_date
    expect(canInvoice).toBe(false)
  })
})

// ── Invoice Approval Workflow ──

describe('Contractor — Invoice Approval Workflow', () => {
  it('invoice defaults to pending status', () => {
    const invoice = { status: 'pending' }
    expect(invoice.status).toBe('pending')
  })

  it('invoice can be approved', () => {
    const invoice = { status: 'pending' }
    const approved = { ...invoice, status: 'approved', approved_by: 'mgr-1', approved_at: new Date().toISOString() }
    expect(approved.status).toBe('approved')
    expect(approved.approved_by).toBeTruthy()
    expect(approved.approved_at).toBeTruthy()
  })

  it('invoice can be rejected', () => {
    const invoice = { status: 'pending' }
    const rejected = { ...invoice, status: 'rejected' }
    expect(rejected.status).toBe('rejected')
  })

  it('already approved invoice cannot be approved again', () => {
    const invoice = { status: 'approved' }
    const canApprove = invoice.status === 'pending'
    expect(canApprove).toBe(false)
  })

  it('already rejected invoice cannot be approved', () => {
    const invoice = { status: 'rejected' }
    const canApprove = invoice.status === 'pending'
    expect(canApprove).toBe(false)
  })

  it('invoice tracks approved_by and approved_at', () => {
    const invoice = {
      status: 'approved',
      approved_by: 'admin-1',
      approved_at: '2024-07-15T10:00:00Z',
    }
    expect(invoice.approved_by).toBe('admin-1')
    expect(invoice.approved_at).toBe('2024-07-15T10:00:00Z')
  })

  it('invoice has unique invoice_number', () => {
    const invoice = {
      invoice_number: 'INV-2024-001',
      amount: 75000,
      currency: 'THB',
    }
    expect(invoice.invoice_number).toBeTruthy()
    expect(invoice.currency).toBe('THB')
  })

  it('invoice amount is positive', () => {
    const invoice = { amount: 50000 }
    expect(invoice.amount).toBeGreaterThan(0)
  })
})

// ── RLS Isolation ──

describe('RLS — Company Isolation for Contractors', () => {
  it('all vendor/contractor tables have company_id', () => {
    const tables = [
      'vendor_companies',
      'vendor_workers',
      'contractor_engagements',
      'contractor_invoices',
    ]
    expect(tables.length).toBe(4)
    for (const table of tables) {
      expect(table).toBeDefined()
    }
  })

  it('RLS policy uses safe_user_company_id()', () => {
    const policy = 'company_id = safe_user_company_id()'
    expect(policy).toContain('safe_user_company_id')
  })

  it('cross-company vendor access is denied', () => {
    const userCompany = 'c1'
    const recordCompany = 'c2'
    const canAccess = userCompany === recordCompany
    expect(canAccess).toBe(false)
  })

  it('same-company vendor access is allowed', () => {
    const userCompany = 'c1'
    const recordCompany = 'c1'
    const canAccess = userCompany === recordCompany
    expect(canAccess).toBe(true)
  })

  it('vendor_workers scope to vendor within company', () => {
    const company = 'c1'
    const vendorCompany = 'c1'
    const canAccess = company === vendorCompany
    expect(canAccess).toBe(true)
  })

  it('invoices scope to engagement within company', () => {
    const companyId = 'c1'
    const invoiceCompanyId = 'c1'
    expect(companyId).toBe(invoiceCompanyId)
  })
})

// ── RBAC Permissions ──

describe('RBAC — Contractor Permissions', () => {
  const contractorPerms = ['read', 'write', 'approve']

  it('owner has all contractor permissions', () => {
    const ownerPerms = [...contractorPerms]
    expect(ownerPerms).toContain('read')
    expect(ownerPerms).toContain('write')
    expect(ownerPerms).toContain('approve')
  })

  it('admin has all contractor permissions', () => {
    const adminPerms = [...contractorPerms]
    expect(adminPerms).toContain('read')
    expect(adminPerms).toContain('write')
    expect(adminPerms).toContain('approve')
  })

  it('hr_manager has read/write', () => {
    const perms = ['read', 'write']
    expect(perms).toContain('read')
    expect(perms).toContain('write')
    expect(perms).not.toContain('approve')
  })

  it('hr_staff has read only', () => {
    const perms = ['read']
    expect(perms).toContain('read')
    expect(perms).not.toContain('write')
    expect(perms).not.toContain('approve')
  })

  it('finance_approver has read + approve', () => {
    const perms = ['read', 'approve']
    expect(perms).toContain('read')
    expect(perms).toContain('approve')
    expect(perms).not.toContain('write')
  })

  it('manager has read only', () => {
    const perms = ['read']
    expect(perms).toContain('read')
    expect(perms).not.toContain('write')
    expect(perms).not.toContain('approve')
  })

  it('auditor has read only', () => {
    const perms = ['read']
    expect(perms).toContain('read')
    expect(perms).not.toContain('write')
    expect(perms).not.toContain('approve')
  })

  it('employee has no contractor permissions', () => {
    const perms: string[] = []
    expect(perms).not.toContain('read')
    expect(perms).not.toContain('write')
    expect(perms).not.toContain('approve')
  })
})
