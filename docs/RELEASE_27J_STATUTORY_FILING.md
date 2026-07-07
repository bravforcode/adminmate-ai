# Release 27J — Statutory Filing

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Statutory Filing module, enabling Thai companies to generate government report documents from payroll data, track filing status, and record manual submissions — without faking direct government integration.

---

## Scope

### In Scope

1. **Statutory Report Templates** — Templates for PND1, PND53, SSO annual report, and other Thai statutory forms.
2. **Filing Periods** — Define filing periods (monthly, quarterly, annual) with deadlines.
3. **Report Generation** — Generate filing documents from approved payroll run data.
4. **Filing Status Tracking** — Track filing lifecycle: draft → generated → submitted → acknowledged.
5. **Manual Submission Record** — Record that a filing was manually submitted (upload acknowledgement document).
6. **Provider Adapter** — Architecture for future direct filing (returns `not_configured` when provider absent).
7. **Export Audit** — Every download/export of statutory documents is audit logged.
8. **UI States** — Filing pages show correct truthful UI state (`NeedsConfiguration` when no provider).
9. **Permissions** — `statutory:read`, `statutory:write`, `statutory:submit`, `statutory:export`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit statutory tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify filing document generated from approved payroll run only | P0 |
| 4 | Verify missing approved payroll blocks filing generation | P0 |
| 5 | Verify manual submission can record acknowledgement | P1 |
| 6 | Verify unconfigured provider returns `not_configured` state | P0 |
| 7 | Verify export/download is audit logged | P0 |
| 8 | Verify no fake government acknowledgement or submission confirmation | P0 |
| 9 | Fix any gaps identified in audit | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement direct government API filing (adapter only).
- This release does **not** implement automatic filing deadline reminders (future enhancement).
- This release does **not** implement multi-country statutory filing (Thai only).
- This release does **not** claim legal completeness of statutory forms.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> Statutory filing accuracy is a legal requirement. All report templates must be validated against current Thai Revenue Department and SSO specifications before production use.
