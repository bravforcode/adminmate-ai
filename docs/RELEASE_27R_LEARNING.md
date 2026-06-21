# Release 27R — Learning & Development

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Learning & Development module, enabling course management, training assignments, compliance learning, certifications, and skill tracking.

---

## Scope

### In Scope

1. **Courses** — Create and manage learning courses with modules and content.
2. **Enrollments** — Employee self-enrollment and admin-assigned enrollment.
3. **Training Assignments** — Mandatory training assignment with due dates and completion tracking.
4. **Certifications** — Track employee certifications with expiry dates and renewal reminders.
5. **Skill Profiles** — Employee skill inventory and skill gap analysis.
6. **Completion Tracking** — Progress tracking and completion certificates.
7. **UI States** — Learning pages show correct truthful UI state.
8. **Permissions** — `learning:read`, `learning:write`, `learning:assign`, `learning:manage`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit learning tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify mandatory training assignment and tracking works | P0 |
| 4 | Verify completion is tracked accurately | P0 |
| 5 | Verify certificate expiry reminders are generated | P1 |
| 6 | Verify skill data is not used unfairly in performance/AI contexts | P0 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement SCORM/xAPI content player integration.
- This release does **not** implement live virtual classroom or webinar integration.
- This release does **not** implement AI-powered learning recommendations.
- This release does **not** implement external LMS integration.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
