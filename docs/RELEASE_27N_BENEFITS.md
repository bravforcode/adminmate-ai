# Release 27N — Benefits Administration

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Benefits Administration module, enabling companies to manage benefit plans, enrollment, eligibility, dependents, and payroll deductions.

---

## Scope

### In Scope

1. **Benefit Plans** — Create and manage benefit plans (health, life, dental, etc.) with plan options.
2. **Eligibility Rules** — Define eligibility based on employment status, tenure, grade, and other criteria.
3. **Enrollment** — Employee self-service enrollment during open enrollment or qualifying life events.
4. **Dependents** — Track dependent information for family coverage plans.
5. **Contributions** — Employee and employer contribution calculations with payroll deduction handoff.
6. **Provider Configs** — External benefit provider configuration (API or manual).
7. **Open Enrollment** — Time-bound open enrollment periods with deadline enforcement.
8. **UI States** — Benefits pages show correct truthful UI state.
9. **Permissions** — `benefits:read`, `benefits:write`, `benefits:enroll`, `benefits:manage`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit benefits tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify eligibility rules are correctly evaluated | P0 |
| 4 | Verify dependent data is protected (not visible to non-authorized roles) | P0 |
| 5 | Verify enrollment requires approval if configured | P0 |
| 6 | Verify payroll deduction handoff data is correct | P0 |
| 7 | Verify open enrollment period is enforced | P1 |
| 8 | Fix any gaps identified in audit | P0 |
| 9 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real benefit provider API integration.
- This release does **not** implement COBRA or similar continuation coverage.
- This release does **not** implement benefits billing reconciliation.
- This release does **not** implement multi-country benefits (Thai starter only).

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
