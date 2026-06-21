# Release 28G — Country Pack Governance

**Gate:** H — Thailand Professional Validation
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Establish governance controls for country pack lifecycle — ensuring new country packs go through a structured review, validation, and activation process before production use.

---

## Scope

### In Scope

1. **Country Pack Lifecycle** — States: `draft` → `review` → `validated` → `active` → `deprecated`.
2. **Pack Proposal Workflow** — Process for proposing a new country pack with source documents and expert assignment.
3. **Validation Checklist** — Structured checklist for each country pack (tax rules, social security, labor law, reporting).
4. **Expert Assignment** — Assign qualified experts per country for validation review.
5. **Activation Gate** — Country pack cannot be activated without completed validation checklist and expert sign-off.
6. **Deprecation Process** — Process for deprecating country packs with migration guidance.
7. **Pack Versioning** — Version tracking with changelog and effective dates.
8. **Pack Audit Trail** — All lifecycle transitions audit logged.
9. **UI States** — Country pack governance pages show correct truthful UI state.
10. **Permissions** — `payroll:manage_country_packs`, `payroll:review_country_packs`, `payroll:activate_country_packs`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Design and apply migration for country pack governance tables | P0 |
| 2 | Implement country pack lifecycle state machine | P0 |
| 3 | Implement pack proposal and validation checklist service | P0 |
| 4 | Implement expert assignment and sign-off workflow | P0 |
| 5 | Implement activation gate (blocks activation without validation) | P0 |
| 6 | Build country pack governance UI (lifecycle, checklist, expert view) | P1 |
| 7 | Write tests: lifecycle transitions enforced, activation gate blocks invalid packs | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement automated country pack generation.
- This release does **not** implement real-time regulatory monitoring per country.
- This release does **not** implement country pack marketplace or sharing.
- This release does **not** implement automatic migration between country pack versions.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> Country pack governance prevents premature activation of incomplete or unvalidated country packs. Every pack must go through structured review before production use.
