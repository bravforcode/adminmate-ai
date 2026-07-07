# Release 27G — Workforce Scheduling

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Workforce Scheduling module, enabling shift-based businesses (restaurants, retail, factories, clinics) to create rosters, manage shift swaps, and track overtime — with payroll-ready outputs.

---

## Scope

### In Scope

1. **Shift Templates** — Create, edit, and reuse shift templates with time, location, and role attributes.
2. **Shift Scheduling** — Build and publish weekly/monthly rosters with drag-and-drop or bulk assignment.
3. **Employee Availability** — Employee availability preferences and constraints feeding into schedule generation.
4. **Minimum Staffing** — Per-location, per-shift minimum staffing requirements with coverage warnings.
5. **Shift Swap** — Employee-initiated swap requests with manager approval workflow.
6. **Open Shift Bidding** — Publish unassigned shifts for eligible employees to bid.
7. **Overtime Rules & Approval** — OT rules (multiplier, thresholds), OT request submission, and approval workflow.
8. **Attendance vs. Schedule Variance** — Compare scheduled vs. actual attendance for payroll and reporting.
9. **UI States** — All scheduling pages show correct truthful UI state.
10. **Permissions** — `scheduling:read`, `scheduling:write`, `scheduling:approve`, `overtime:approve`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit scheduling tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify no overlapping shift assignment for same employee | P0 |
| 4 | Verify employee availability is respected in schedule | P1 |
| 5 | Verify shift swap requires manager approval | P0 |
| 6 | Verify OT request requires approval before counting as payroll input | P0 |
| 7 | Verify attendance-vs-schedule variance is calculable | P1 |
| 8 | Verify multi-location timezone handling | P1 |
| 9 | Fix any gaps identified in audit | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement AI-optimized scheduling or demand-based staffing predictions.
- This release does **not** implement employee mobile shift swap (web only).
- This release does **not** calculate OT pay — only tracks OT hours for payroll input.
- This release does **not** integrate with third-party scheduling tools.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
