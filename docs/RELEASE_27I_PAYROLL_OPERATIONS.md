# Release 27I — Payroll Operations

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Payroll Operations layer — the workflow, approval, audit, and employee self-service components that wrap around the payroll calculation engine.

---

## Scope

### In Scope

1. **Payroll Run Management** — Create, lock, process, and close payroll runs with status tracking.
2. **Payroll Approval Workflow** — Multi-step approval: preparer → reviewer → approver with delegation support.
3. **Payslip Portal** — Employee self-service payslip view with historical access.
4. **Payroll Audit Trail** — Every payroll action (create, edit, approve, reject, export) logged with actor, timestamp, and diff.
5. **Payroll Correction** — Post-approval correction workflow (void and re-run) with full audit trail.
6. **Payroll Dashboard** — Summary view of current run status, pending approvals, and historical runs.
7. **Offboarding Final Settlement** — Handoff from offboarding to payroll for final pay calculation.
8. **UI States** — All payroll operations pages show correct truthful UI state.
9. **Permissions** — `payroll:read`, `payroll:write`, `payroll:approve`, `payroll:export`, `payslip:view_own`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit payroll operations tables for `company_id` and RLS | P0 |
| 2 | Audit payroll operations services for permission checks and audit logging | P0 |
| 3 | Verify payroll run status transitions are enforced (draft → processing → approved → paid) | P0 |
| 4 | Verify payroll approval requires designated approver role | P0 |
| 5 | Verify employee can only view own payslips | P0 |
| 6 | Verify payroll correction (void/re-run) creates full audit trail | P0 |
| 7 | Verify offboarding final settlement readiness handoff works | P1 |
| 8 | Verify payroll dashboard respects role-based data access | P1 |
| 9 | Fix any gaps identified in audit | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement payroll calculation (covered in 27H).
- This release does **not** implement real payment processing or bank integration.
- This release does **not** implement payroll reporting/analytics (covered in 27V).
- This release does **not** implement multi-country payroll operations (Thai only).

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
