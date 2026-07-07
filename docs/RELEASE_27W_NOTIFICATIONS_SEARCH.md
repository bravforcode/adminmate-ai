# Release 27W — Notifications & Search

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Notification Center and Global Search module, enabling employees to receive relevant notifications and search across platform data with permission-aware results.

---

## Scope

### In Scope

1. **Notifications** — Centralized notification system for approvals, assignments, reminders, and alerts.
2. **Notification Preferences** — Employee notification preference management (email, in-app, push).
3. **Delivery Logs** — Track notification delivery status and failures.
4. **Global Search** — Permission-aware search across employees, candidates, jobs, documents, and onboarding cases.
5. **Saved Searches** — Save and reuse search queries.
6. **Search Snippets** — Search result snippets that do not leak sensitive data.
7. **UI States** — Notification and search pages show correct truthful UI state.
8. **Permissions** — `notifications:read`, `notifications:manage`, `search:read`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit notification/search tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify search respects user permissions (no cross-tenant, no unauthorized module access) | P0 |
| 4 | Verify search snippets do not leak sensitive data | P0 |
| 5 | Verify notification preferences are respected | P0 |
| 6 | Verify notification delivery failures are logged | P1 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement push notifications (mobile).
- This release does **not** implement SMS or LINE OA notification delivery.
- This release does **not** implement AI-powered search ranking.
- This release does **not** implement full-text search across document contents (metadata only).

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
