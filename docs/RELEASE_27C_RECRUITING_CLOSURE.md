# Release 27C — Recruiting Closure

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Close all remaining gaps in the Recruiting module (Jobs, Candidates, Applications, Interviews, Offers, Referrals, Talent Pool) to achieve production readiness.

---

## Scope

### In Scope

1. **Jobs** — Ensure job creation, editing, publishing, and archiving workflows are complete with permission checks.
2. **Candidates** — Verify candidate profiles, resume upload, status tracking, and tag management.
3. **Applications** — Ensure application submission, status pipeline, and rejection/offer flows are wired end-to-end.
4. **Interviews** — Verify interview scheduling, feedback forms, scorecards, and interviewer assignment.
5. **Offers** — Ensure offer creation, approval, e-signature handoff, and acceptance/rejection flows.
6. **Referrals** — Verify employee referral campaigns, referral tracking, and reward status.
7. **Talent Pool** — Ensure inactive candidates can be tagged, searched, and reactivated.
8. **AI Recruiting** — Confirm AI scoring excludes sensitive fields, provides evidence and confidence, and does not auto-decide.
9. **UI States** — All recruiting pages show correct truthful UI state (`Active`, `NeedsConfiguration`, etc.).
10. **Permissions** — All recruiting permissions (`recruiting:read`, `recruiting:write`, `recruiting:approve`, `recruiting:export`) enforced.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit all recruiting tables for `company_id` and RLS | P0 |
| 2 | Audit all recruiting services for permission checks and audit logging | P0 |
| 3 | Verify offer approval workflow enforces HR/manager approval | P0 |
| 4 | Verify AI scoring excludes sensitive fields per `sensitive_field_registry` | P0 |
| 5 | Verify referral reward status is informational only (no auto-payout) | P1 |
| 6 | Verify all recruiting UI pages have loading/empty/error/permission states | P1 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** add new recruiting features (e.g., video interview, background check integration).
- This release does **not** implement offer letter PDF generation (covered in Onboarding/Contracts).
- This release does **not** change the AI scoring algorithm.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
