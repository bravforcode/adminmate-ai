# Release 27S — Engagement & Surveys

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Engagement and Surveys module, enabling pulse surveys, eNPS, employee recognition, and anonymous feedback — with strict anonymity protections.

---

## Scope

### In Scope

1. **Survey Templates** — Create reusable survey templates with configurable question types.
2. **Survey Campaigns** — Launch surveys with scheduling, target audience, and reminder cadence.
3. **Survey Responses** — Employee response collection with anonymous and identified modes.
4. **Anonymous Protections** — Minimum group size threshold, no reverse identification from timestamp/department.
5. **Engagement Scores** — Aggregate engagement metrics by department, location, and period.
6. **Recognition Events** — Peer-to-peer and manager-to-employee recognition with categories.
7. **Reward Points** — Optional points-based recognition with redemption tracking.
8. **UI States** — Engagement pages show correct truthful UI state.
9. **Permissions** — `engagement:read`, `engagement:write`, `engagement:admin`, `recognition:read`, `recognition:write`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit engagement tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify anonymous mode hides identity from all non-admin views | P0 |
| 4 | Verify minimum group size threshold is enforced | P0 |
| 5 | Verify manager cannot see individual anonymous responses | P0 |
| 6 | Verify recognition events are audit logged | P1 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real-time sentiment analysis.
- This release does **not** implement social feed or gamification.
- This release does **not** implement third-party survey integration (SurveyMonkey, Typeform).
- This release does **not** implement compensation-linked recognition.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> **Critical anonymity rule:** Small-group anonymous surveys can be reverse-identified via timestamp or department. Minimum group thresholds must be enforced.
