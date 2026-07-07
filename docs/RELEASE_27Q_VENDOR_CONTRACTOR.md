# Release 27Q — Vendor & Contractor Management

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Vendor and Contractor Management module, enabling companies to manage non-employee workforce including contractors, vendor workers, and freelancers.

---

## Scope

### In Scope

1. **Vendor Companies** — Register vendor/supplier companies with contact and contract information.
2. **Vendor Workers** — Track individual workers provided by vendor companies.
3. **Contractor Engagements** — Define engagement terms, duration, rate, and deliverables.
4. **Contractor Contracts** — Store and track contractor agreement documents.
5. **Contractor Invoices** — Invoice submission and approval workflow.
6. **Access Reviews** — Periodic review of contractor access to company systems.
7. **UI States** — Vendor/contractor pages show correct truthful UI state.
8. **Permissions** — `vendor:read`, `vendor:write`, `vendor:approve`, `contractor:read`, `contractor:write`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit vendor/contractor tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify contractor is not treated as employee by default | P0 |
| 4 | Verify access expiry is tracked and flagged | P0 |
| 5 | Verify invoice approval workflow enforces authorization | P0 |
| 6 | Verify vendor credentials/secrets are not exposed | P0 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real EOR (Employer of Record) service integration.
- This release does **not** implement contractor payroll (separate from employee payroll).
- This release does **not** implement vendor performance scoring.
- This release does **not** implement procurement or purchase order workflow.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
