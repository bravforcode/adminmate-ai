# Release 28A — Rule Source Ledger

**Gate:** H — Thailand Professional Validation
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Establish an auditable ledger of all payroll rule sources (Thai tax brackets, SSO rates, labor law provisions) with version tracking, effective dates, and human-verified provenance — so every payroll calculation can be traced to an authoritative source.

---

## Scope

### In Scope

1. **Rule Source Registry** — Table of authoritative rule sources (Revenue Department announcements, SSO notifications, Royal Gazette publications) with citation, effective date, and expiry.
2. **Rule Versioning** — Each payroll rule linked to a specific source document and version.
3. **Effective Date Tracking** — Rules activated and deactivated based on source effective dates.
4. **Provenance Log** — Every payroll calculation records which rule version was applied and its source.
5. **Source Document Upload** — Store source documents (PDF, scan) as evidence.
6. **Audit Trail** — All rule source changes (add, edit, deactivate) are audit logged.
7. **UI States** — Rule source pages show correct truthful UI state.
8. **Permissions** — `payroll:manage_rules`, `payroll:view_sources`, `payroll:audit`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Design and apply migration for rule source ledger tables | P0 |
| 2 | Implement rule source CRUD service with audit logging | P0 |
| 3 | Link existing Thai tax/SSO rules to source documents | P0 |
| 4 | Implement provenance recording in payroll calculation flow | P0 |
| 5 | Build rule source management UI | P1 |
| 6 | Write tests: source required for rule activation, provenance recorded | P0 |
| 7 | Write tests: deactivated source blocks new calculations | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement automated source document scraping or ingestion.
- This release does **not** implement multi-country rule sources (Thai only).
- This release does **not** implement AI-powered rule interpretation.
- This release does **not** replace human legal/accounting review of rule accuracy.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> Payroll rule provenance is critical for audit and legal defense. Every calculation must be traceable to a specific, dated, authoritative source document.
