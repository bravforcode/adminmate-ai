# Release 28I — Independent Review

**Gate:** H — Thailand Professional Validation
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Establish an independent review process where qualified external reviewers (accountants, tax advisors, legal counsel, privacy officers) can validate system outputs against professional standards — without requiring system access or technical expertise.

---

## Scope

### In Scope

1. **Review Package Generation** — Generate review packages (payroll calculations, tax computations, compliance reports) as exportable documents for external review.
2. **Reviewer Portal** — Minimal portal for external reviewers to view assigned review packages.
3. **Annotation System** — Reviewers can annotate, flag, and comment on specific calculations or outputs.
4. **Discrepancy Tracking** — Track discrepancies between system output and reviewer findings.
5. **Resolution Workflow** — Process for resolving discrepancies (correct system, correct source data, or document exception).
6. **Review Certification** — Reviewer sign-off on validated outputs with validity period.
7. **Review History** — Complete history of all reviews, annotations, and resolutions.
8. **UI States** — Review pages show correct truthful UI state.
9. **Permissions** — `review:generate`, `review:view`, `review:annotate`, `review:certify`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Design and apply migration for independent review tables | P0 |
| 2 | Implement review package generation service | P0 |
| 3 | Implement reviewer portal with read-only access | P1 |
| 4 | Implement annotation and discrepancy tracking | P0 |
| 5 | Implement resolution workflow | P0 |
| 6 | Implement review certification with validity period | P0 |
| 7 | Build review UI (package viewer, annotations, certification) | P1 |
| 8 | Write tests: review package contains all required data, certification valid | P0 |
| 9 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real-time collaborative review.
- This release does **not** implement AI-powered review or anomaly detection.
- This release does **not** implement automated discrepancy resolution.
- This release does **not** implement reviewer marketplace or matching.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> Independent review is the final quality gate before production use of payroll calculations. External reviewers must be qualified professionals (CPA, tax advisor, legal counsel).
