# Release 27H — Payroll Calculation (Thailand Pack)

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Thailand Payroll Pack, enabling Thai companies to run payroll calculations with versioned tax and social security rules, generate payslips, and export for bank transfer.

---

## Scope

### In Scope

1. **Payroll Cycles** — Create, configure, and manage monthly/semi-monthly payroll periods.
2. **Salary Structures** — Salary components (basic, allowance, deduction) with effective dating.
3. **Recurring Items** — Recurring earnings and deductions attached to employee salary structures.
4. **One-Time Adjustments** — Ad-hoc bonuses, deductions, and adjustments per payroll run.
5. **OT/Leave Integration** — Approved OT hours and leave records feed into payroll calculation.
6. **Thai Tax Calculation** — PND1 with progressive tax brackets, versioned per effective date.
7. **Thai Social Security** — SSO contribution calculation (capped, employee + employer portions).
8. **Payroll Draft** — Generate payroll draft for review before approval.
9. **Payroll Approval** — Multi-step approval workflow (preparer → reviewer → approver).
10. **Payslip Generation** — Generate payslips per employee per payroll run.
11. **Bank Export** — Generate bank transfer file format (foundation; actual bank format varies).
12. **UI States** — Payroll pages show correct truthful UI state.
13. **Permissions** — `payroll:read`, `payroll:write`, `payroll:approve`, `payroll:export`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit payroll tables for `company_id` and RLS | P0 |
| 2 | Audit payroll services for permission checks and audit logging | P0 |
| 3 | Verify salary component effective dating works correctly | P0 |
| 4 | Verify approved leave affects payroll input | P0 |
| 5 | Verify OT input included with versioned formula | P0 |
| 6 | Verify payroll draft cannot be marked as paid | P0 |
| 7 | Verify payroll requires approval before payslip generation | P0 |
| 8 | Verify payslip access limited to employee/self + payroll roles | P0 |
| 9 | Verify cross-company payroll denied | P0 |
| 10 | Verify bank export does not expose unauthorized data | P0 |
| 11 | Verify Thai tax bracket calculation matches published rates | P0 |
| 12 | Verify SSO calculation respects annual cap | P0 |
| 13 | Fix any gaps identified in audit | P0 |
| 14 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real bank integration (file export only).
- This release does **not** implement provident fund (PF) calculation.
- This release does **not** implement withholding tax (WHT) for contractors.
- This release does **not** claim legal completeness — Thai payroll rules require HR/accounting review.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> **Payroll is a high-risk module.** Fake or incorrect calculations can cause legal liability. All tax and SSO formulas must be versioned, test-covered, and reviewed by a qualified Thai accountant before production use.
