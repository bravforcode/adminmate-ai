# Release 28B — Payroll Specialist Review

**Gate:** H — Thailand Professional Validation
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Create a structured review workflow for qualified payroll specialists to validate Thai payroll calculations, tax formulas, and SSO computations — ensuring every rule is human-verified before production use.

---

## Scope

### In Scope

1. **Specialist Registry** — Register qualified payroll specialists (accountants, tax advisors) with credentials and expertise areas.
2. **Review Assignments** — Assign payroll rules and calculations to specialists for validation.
3. **Review Checklist** — Structured checklist for each rule type (tax bracket, SSO, allowance, deduction).
4. **Validation Evidence** — Specialist records validation method, test cases, and reference materials.
5. **Approval Workflow** — Specialist review → team lead sign-off → rule activation.
6. **Re-validation Triggers** — Automatic re-validation request when source document changes or expires.
7. **Review Dashboard** — Track review status, pending items, and expert workload.
8. **UI States** — Specialist review pages show correct truthful UI state.
9. **Permissions** — `payroll:review`, `payroll:review_approve`, `payroll:manage_specialists`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Design and apply migration for specialist review tables | P0 |
| 2 | Implement specialist registry service with credential tracking | P1 |
| 3 | Implement review assignment and checklist service | P0 |
| 4 | Implement validation evidence recording | P0 |
| 5 | Implement review approval workflow | P0 |
| 6 | Build specialist review UI (dashboard, checklist, evidence form) | P1 |
| 7 | Write tests: rule requires specialist review before activation | P0 |
| 8 | Write tests: expired source triggers re-validation | P0 |
| 9 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement AI-assisted rule validation.
- This release does **not** implement external specialist marketplace.
- This release does **not** implement automatic rule correction suggestions.
- This release does **not** implement cross-country specialist review (Thai only).

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> Specialist review is a critical quality gate. No payroll rule should be activated in production without documented human validation by a qualified professional.
