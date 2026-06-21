# Release 27F — Attendance + Leave

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Attendance and Leave module, enabling employees to check in/out, request leave, and managers to approve — with payroll-ready outputs.

---

## Scope

### In Scope

1. **Attendance** — Manual, web check-in/check-out, GPS check-in, QR check-in, reason for late/early, correction request with HR approval.
2. **Leave Types & Policies** — Leave type configuration, policy assignment, accrual rules, carry-over, and public holidays.
3. **Leave Balances** — Real-time balance calculation, accrual processing, and carry-over enforcement.
4. **Leave Requests** — Request submission, manager/HR approval, conflict detection, and calendar view.
5. **Thai Starter Leave Pack** — Seed annual, sick, personal, maternity, ordination (optional), unpaid, and custom leave types.
6. **Holiday Calendar** — Country-level holiday calendar with company overrides.
7. **Payroll Integration** — Approved attendance and leave records are marked as payroll-ready inputs.
8. **UI States** — All attendance/leave pages show correct truthful UI state.
9. **Permissions** — `attendance:read`, `attendance:write`, `leave:read`, `leave:write`, `leave:approve`, `leave:manage`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit attendance/leave tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify employee cannot edit own attendance directly | P0 |
| 4 | Verify correction requires approval workflow | P0 |
| 5 | Verify leave balance cannot go negative unless policy allows | P0 |
| 6 | Verify overlapping leave is detected and blocked | P0 |
| 7 | Verify manager sees only direct reports' leave requests | P0 |
| 8 | Verify Thai starter leave pack is seeded and editable | P1 |
| 9 | Verify holiday calendar excludes public holidays from leave day count | P1 |
| 10 | Verify approved attendance/leave are flagged as payroll-ready | P0 |
| 11 | Fix any gaps identified in audit | P0 |
| 12 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement biometric or hardware-based attendance.
- This release does **not** implement leave encashment or payout calculation.
- This release does **not** implement multi-country leave policy engine (Thai starter only).
- This release does **not** implement shift scheduling (covered in 27G).

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
