# Release 27E — HRIS Closure

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Close all remaining gaps in the HRIS Core module (Employee Directory, Org Chart, Offboarding, Legal Entities, Organization Hierarchy) to achieve production readiness.

---

## Scope

### In Scope

1. **Employee Directory** — Verify employee profile completeness, search, filtering, and profile field management.
2. **Org Chart** — Ensure org chart rendering, reporting line management, and multi-level hierarchy display work.
3. **Legal Entities** — Verify legal entity creation, addresses, registration numbers, and tax profiles.
4. **Organization Hierarchy** — Ensure business units, cost centers, locations, and reporting lines are manageable.
5. **Employee Lifecycle** — Verify hire, transfer, promotion, and termination status transitions.
6. **Sensitive Fields** — Confirm sensitive field registry is respected across all HRIS views and exports.
7. **UI States** — All HRIS pages show correct truthful UI state.
8. **Permissions** — All HRIS permissions enforced (`hris:read`, `hris:write`, `hris:export`).

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit HRIS tables for `company_id` and RLS | P0 |
| 2 | Audit HRIS services for permission checks and audit logging | P0 |
| 3 | Verify org chart does not leak cross-tenant reporting lines | P0 |
| 4 | Verify sensitive fields are masked in employee directory views | P0 |
| 5 | Verify employee export respects `sensitive_field_registry` | P0 |
| 6 | Verify all UI pages have loading/empty/error/permission states | P1 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** add new HRIS features (e.g., custom fields, employee self-service portal).
- This release does **not** change employee data model or add new profile fields.
- This release does **not** implement employee document upload (covered in Onboarding).

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
