# Release 28D — Legal Boundary Enforcement

**Gate:** H — Thailand Professional Validation
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Implement explicit legal boundary markers throughout the payroll and compliance modules — ensuring the system never claims legal completeness and always routes uncertain situations to human review.

---

## Scope

### In Scope

1. **Legal Boundary Registry** — Central registry of all legal boundary statements (payroll, tax, labor, immigration, privacy).
2. **Boundary Markers in UI** — Visible disclaimers on every payroll, tax, compliance, and legal page.
3. **Boundary Markers in AI** — AI responses include legal disclaimers for tax, payroll, and compliance queries.
4. **Boundary Markers in Export** — Exported documents include legal boundary statements.
5. **Uncertainty Routing** — When system confidence is below threshold, route to human expert.
6. **Claim Detection** — Audit log for any output that could be interpreted as a legal claim.
7. **Boundary Review Workflow** — Process for legal counsel to review and approve boundary statements.
8. **UI States** — Boundary marker pages show correct truthful UI state.
9. **Permissions** — `compliance:manage_boundaries`, `compliance:review_boundaries`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Design and apply migration for legal boundary registry tables | P0 |
| 2 | Audit all payroll UI pages for existing boundary markers | P0 |
| 3 | Audit AI responses for legal claim risk | P0 |
| 4 | Audit export documents for boundary statements | P0 |
| 5 | Implement boundary marker component for consistent display | P0 |
| 6 | Implement uncertainty routing in AI assistant | P0 |
| 7 | Implement claim detection audit logging | P1 |
| 8 | Build boundary statement management UI | P1 |
| 9 | Write tests: boundary markers present on all high-risk pages | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** provide legal advice or legal interpretation.
- This release does **not** implement automated legal document generation.
- This release does **not** implement jurisdiction-specific legal compliance checking.
- This release does **not** replace qualified legal counsel review.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> **Legal boundary enforcement is non-negotiable.** The system must never imply legal completeness or guarantee compliance. Every boundary statement must be reviewed by qualified legal counsel.
