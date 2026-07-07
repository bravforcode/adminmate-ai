# Release 27P — Assets & Expenses

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Asset and Expense Management module, enabling companies to track company assets assigned to employees and manage expense claims with approval and reimbursement workflows.

---

## Scope

### In Scope

1. **Asset Registry** — Register company assets with category, value, and status.
2. **Asset Assignment** — Assign assets to employees with expected return date.
3. **Asset Maintenance** — Log maintenance and repair history per asset.
4. **Asset Depreciation** — Track depreciation for financial reporting.
5. **Asset Return** — Offboarding-linked asset return workflow with condition tracking.
6. **Expense Policies** — Define expense policies with limits by category and role.
7. **Expense Claims** — Employee expense submission with receipt upload.
8. **Expense Approval** — Multi-level approval workflow for expense claims.
9. **Reimbursement Handoff** — Approved expenses feed into payroll for reimbursement.
10. **UI States** — Asset/expense pages show correct truthful UI state.
11. **Permissions** — `assets:read`, `assets:write`, `expenses:read`, `expenses:write`, `expenses:approve`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit asset/expense tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify asset assignment linked to employee and tracked | P0 |
| 4 | Verify asset return links to offboarding workflow | P0 |
| 5 | Verify expense approval required before reimbursement | P0 |
| 6 | Verify reimbursement handoff to payroll is correct | P0 |
| 7 | Verify receipt storage is secure and not publicly accessible | P0 |
| 8 | Fix any gaps identified in audit | P0 |
| 9 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real depreciation accounting (simplified tracking only).
- This release does **not** implement procurement workflow.
- This release does **not** implement credit card integration or receipt OCR.
- This release does **not** implement multi-currency expense reporting.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
