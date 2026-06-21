# Release 27Y — AI Assistant

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Employee AI Assistant, enabling employees, managers, and HR to query company policies and permissioned data through a conversational interface — with strict safety boundaries.

---

## Scope

### In Scope

1. **Conversational Interface** — Chat-based AI assistant accessible from employee portal.
2. **Knowledge Sources** — Ingest internal policy documents, handbooks, and FAQs as AI knowledge.
3. **Policy Retrieval** — RAG-based retrieval from ingested policy documents.
4. **Permissioned Data Access** — AI responses are scoped to user's permissioned data only.
5. **Answer Audit Log** — Every AI interaction logged with query, response, sources, and confidence.
6. **Safety Boundaries** — AI cites sources, asks HR if uncertain, does not provide legal/payroll guarantees.
7. **Use Cases** — Leave balance queries, onboarding status, policy lookup, payslip explanation.
8. **UI States** — AI assistant page shows correct truthful UI state.
9. **Permissions** — `ai:read`, `ai:manage_knowledge`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit AI assistant tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify AI cannot access cross-tenant data | P0 |
| 4 | Verify AI cannot access sensitive fields excluded by `sensitive_field_registry` | P0 |
| 5 | Verify AI responses cite internal sources | P0 |
| 6 | Verify AI does not provide legal, tax, or payroll guarantees | P0 |
| 7 | Verify answer audit log captures full interaction | P0 |
| 8 | Verify AI cannot auto-approve, auto-terminate, or make high-impact decisions | P0 |
| 9 | Fix any gaps identified in audit | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement AI-powered hiring decisions or performance ratings.
- This release does **not** implement AI chatbot for external candidates.
- This release does **not** implement multi-language AI responses (Thai + English foundation).
- This release does **not** implement AI-generated report summaries in analytics.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> **AI is an assistant, not a decision-maker.** All high-impact outputs (legal, payroll, termination) must include disclaimers and route to human review.
