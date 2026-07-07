# Release 27U — Privacy & Compliance

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Compliance Framework module, enabling PDPA/GDPR-ready workflows, privacy request management, data retention enforcement, legal hold, and sensitive field access logging.

---

## Scope

### In Scope

1. **Privacy Requests** — Employee data subject access requests (DSAR) with workflow.
2. **Retention Policies** — Data retention rules by category with automated purge scheduling.
3. **Deletion Workflows** — Data deletion requests with approval and verification.
4. **Legal Hold** — Legal hold placement blocking data purge with scope and effects tracking.
5. **Sensitive Field Access Logs** — Audit log for every access to fields flagged in `sensitive_field_registry`.
6. **Compliance Evidence** — Registry of compliance evidence documents and certifications.
7. **Country Compliance Packs** — Jurisdiction-specific compliance rule sets.
8. **Health & Safety Incidents** — Incident reporting and tracking.
9. **UI States** — Compliance pages show correct truthful UI state.
10. **Permissions** — `compliance:read`, `compliance:write`, `compliance:manage`, `privacy:read`, `privacy:write`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit compliance tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify deletion request requires approval | P0 |
| 4 | Verify legal hold blocks purge | P0 |
| 5 | Verify sensitive field access is logged | P0 |
| 6 | Verify compliance evidence export is audit logged | P0 |
| 7 | Verify anonymous whistleblower reports cannot be deanonymized | P0 |
| 8 | Fix any gaps identified in audit | P0 |
| 9 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real PDPA/GDPR filing or notification to authorities.
- This release does **not** implement automated data discovery or classification.
- This release does **not** implement encryption at rest or in transit (Supabase handles this).
- This release does **not** implement cross-border data transfer compliance.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> This module provides workflow and tooling for compliance — it does not guarantee legal compliance. Legal review by qualified counsel is required for each jurisdiction.
