# Release 27D — Onboarding Closure

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Close all remaining gaps in the Onboarding module (Checklists, Documents, Contract Templates, E-Signature) to achieve production readiness.

---

## Scope

### In Scope

1. **Checklists** — Verify onboarding task creation, assignment, completion tracking, and template system.
2. **Documents** — Ensure document request, secure upload, and document metadata management are complete.
3. **Contract Templates** — Verify template creation, variable interpolation, and generated contract storage.
4. **E-Signature** — Ensure e-signature request flow, status tracking, and signed document storage work (adapter-based, no fake signing).
5. **Offboarding** — Verify offboarding checklists, asset return tracking, access revocation triggers, exit interview, and final settlement readiness.
6. **UI States** — All onboarding/offboarding pages show correct truthful UI state.
7. **Permissions** — All onboarding permissions enforced (`onboarding:read`, `onboarding:write`, `onboarding:approve`).

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit onboarding/offboarding tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify e-signature adapter shows `NeedsConfiguration` when provider not set | P0 |
| 4 | Verify offboarding triggers access revocation and asset return tracking | P0 |
| 5 | Verify contract template generation does not expose other tenant templates | P0 |
| 6 | Verify all UI pages have loading/empty/error/permission states | P1 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** add new onboarding features (e.g., buddy assignment, 30-60-90 plans).
- This release does **not** implement real e-signature provider integration (adapter pattern only).
- This release does **not** change document storage architecture.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
