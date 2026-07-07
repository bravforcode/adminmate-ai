# Release 27M — Talent Mobility

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Internal Mobility module, enabling employees to apply for internal positions, transfer between teams, and participate in a talent marketplace — with strict privacy protection against retaliation.

---

## Scope

### In Scope

1. **Internal Job Board** — Post and browse internal positions with eligibility rules.
2. **Internal Applications** — Employee application submission with privacy controls.
3. **Mobility Preferences** — Employee opt-in/opt-out for internal mobility visibility.
4. **Transfer Requests** — Transfer workflow with current manager notification (only when employee opts in or company policy allows).
5. **Hiring Reviews** — HR review of internal candidates with structured evaluation.
6. **Privacy Protection** — Current manager cannot see private internal applications unless employee opts in.
7. **UI States** — Internal mobility pages show correct truthful UI state.
8. **Permissions** — `mobility:read`, `mobility:write`, `mobility:approve`, `mobility:admin`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit mobility tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify current manager cannot see private internal application | P0 |
| 4 | Verify HR can review internal applications | P0 |
| 5 | Verify employee can apply for internal positions | P0 |
| 6 | Verify transfer approval workflow enforces proper authorization | P0 |
| 7 | Verify mobility privacy settings are enforced | P0 |
| 8 | Fix any gaps identified in audit | P0 |
| 9 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement AI-powered job matching.
- This release does **not** implement talent marketplace gamification or incentives.
- This release does **not** implement cross-company mobility (single tenant only).
- This release does **not** implement automatic vacancy backfill suggestions.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> **Critical privacy rule:** Manager visibility of employee internal applications must be严格 enforced. Retaliation risk is a legal and trust concern.
