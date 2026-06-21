# Release 27T — HR Helpdesk & Grievance

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the HR Helpdesk and Case Management module, enabling employees to submit HR tickets, managers to assign and resolve cases, and a knowledge base for self-service.

---

## Scope

### In Scope

1. **Cases** — Employee ticket submission with category, priority, and attachments.
2. **Case Assignment** — Auto or manual assignment to HR staff with workload balancing.
3. **Case Comments** — Threaded comments with internal (HR-only) and public (employee-visible) visibility.
4. **SLA Policies** — Define SLA targets by category and priority with escalation rules.
5. **Escalation** — Automatic escalation when SLA is breached.
6. **Knowledge Base** — HR knowledge base articles with search and feedback.
7. **Anonymous Reporting** — Whistleblower/anonymous report channel with strict identity protection.
8. **Grievance Cases** — Formal grievance tracking with investigation workflow.
9. **UI States** — Helpdesk pages show correct truthful UI state.
10. **Permissions** — `helpdesk:read`, `helpdesk:write`, `helpdesk:assign`, `helpdesk:escalate`, `grievance:read`, `grievance:write`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit helpdesk/grievance tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify employee sees only own cases | P0 |
| 4 | Verify HR sees assigned/company cases only | P0 |
| 5 | Verify private HR comments hidden from employee view | P0 |
| 6 | Verify SLA escalation triggers correctly | P0 |
| 7 | Verify anonymous reports cannot be deanonymized by normal roles | P0 |
| 8 | Verify whistleblower access is strictly controlled | P0 |
| 9 | Fix any gaps identified in audit | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real-time chat or video support.
- This release does **not** implement AI-powered case routing or auto-resolution.
- This release does **not** implement legal hold or eDiscovery for cases.
- This release does **not** implement multi-language knowledge base.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
