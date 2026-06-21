# Release 27O — Compensation

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Compensation module, enabling salary band management, compensation review cycles, merit increases, bonus plans, and total rewards statements.

---

## Scope

### In Scope

1. **Salary Bands** — Define salary bands by job family, level, and location with min/mid/max.
2. **Compensation Cycles** — Create annual or ad-hoc compensation review cycles.
3. **Compensation Reviews** — Manager and HR review of employee compensation with increase recommendations.
4. **Change Requests** — Compensation change request and approval workflow.
5. **Bonus Plans** — Bonus plan design, eligibility, and pro-ration rules.
6. **Total Rewards Statements** — Employee-facing total compensation statement.
7. **Headcount Planning** — Headcount budget and forecast by department/location.
8. **UI States** — Compensation pages show correct truthful UI state.
9. **Permissions** — `compensation:read`, `compensation:write`, `compensation:approve`, `compensation:view_salary`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit compensation tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify salary data access is restricted to authorized roles | P0 |
| 4 | Verify manager cannot view broad salary data without explicit permission | P0 |
| 5 | Verify compensation change requests require approval | P0 |
| 6 | Verify market data labeled as imported/reference (not fake real data) | P1 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement equity grants or vesting schedules (US-centric).
- This release does **not** implement real-time market salary data feeds.
- This release does **not** implement compensation AI recommendations.
- This release does **not** implement multi-currency compensation comparison.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> Salary data is highly sensitive. Access must be strictly controlled and every view/access audit logged.
