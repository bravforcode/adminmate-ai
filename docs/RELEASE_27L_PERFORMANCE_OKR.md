# Release 27L — Performance + OKR

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Performance Management module, enabling OKR/KPI tracking, review cycles, calibration, PIP, and succession planning — with AI assistance that does not auto-decide.

---

## Scope

### In Scope

1. **Performance Cycles** — Create and manage review cycles with configurable templates.
2. **OKR** — Objective and Key Results tracking with progress updates and alignment.
3. **Reviews** — Self-review, manager review, 360 feedback with configurable question sets.
4. **Calibration** — Calibration sessions for normalizing ratings across managers.
5. **PIP** — Performance Improvement Plan case management with reason, approval, and tracking.
6. **Disciplinary Actions** — Record disciplinary actions with approval workflow.
7. **9-Box** — 9-box talent grid mapping performance × potential (potential must use evidence, not sensitive fields).
8. **Succession Planning** — Succession plans with successor candidates and readiness assessment.
9. **AI Rules** — AI can summarize feedback and draft development plans; AI cannot decide ratings or recommend termination.
10. **UI States** — Performance pages show correct truthful UI state.
11. **Permissions** — `performance:read`, `performance:write`, `performance:approve`, `performance:calibrate`, `succession:read`, `succession:write`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit performance tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify review visibility is scoped by role | P0 |
| 4 | Verify employee cannot edit manager rating | P0 |
| 5 | Verify calibration session is audit logged | P0 |
| 6 | Verify PIP requires reason and approval | P0 |
| 7 | Verify 9-box cannot use sensitive fields as inputs | P0 |
| 8 | Verify succession plan access is restricted | P0 |
| 9 | Verify AI outputs include evidence and confidence, no auto-termination | P0 |
| 10 | Fix any gaps identified in audit | P0 |
| 11 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real-time continuous feedback (cycle-based only).
- This release does **not** implement compensation-recommendation AI.
- This release does **not** implement calibration AI (human-only calibration).
- This release does **not** implement performance-based automatic PIP triggers.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
