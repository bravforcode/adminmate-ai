# Release 27B — Data Import / Export

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Enable customers to migrate data into AdminMate AI safely and export module data for reporting, without breaking tenant isolation or leaking sensitive information.

---

## Scope

### In Scope

1. **CSV import engine** — Upload, parse, validate, dry-run, and commit employee, candidate, job, and document metadata imports.
2. **Column mapping UI** — Drag-and-drop or auto-map CSV columns to target fields.
3. **Validation preview** — Show row-level errors, warnings, and skipped rows before commit.
4. **Rollback / reconciliation** — Log every imported row with rollback capability for partial imports.
5. **Module export** — Export employees, candidates, jobs, attendance summaries, and payroll summaries as CSV/Excel.
6. **Export audit** — Every export triggers an audit log entry with user, module, row count, and timestamp.
7. **Sensitive field masking** — Exports mask or exclude fields flagged in `sensitive_field_registry`.
8. **Dry-run validation** — Dry-run mode writes nothing to the database.

### Database Tables

```sql
import_jobs
import_files
import_column_mappings
import_validation_errors
import_row_results
export_jobs
export_files
migration_batches
```

All tables require `company_id` and RLS.

### Services

- `importJobService` — Create, validate, commit, rollback import jobs
- `csvMappingService` — Auto-detect and persist column mappings
- `importValidationService` — Row-level validation with error categorization
- `exportJobService` — Generate exports with permission checks and audit

### UI

- Import Wizard (upload → map → validate → commit)
- Import History & Reconciliation
- Export Page (module selector, field picker, format, download)
- Export Audit Log

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Design and apply migration for import/export tables | P0 |
| 2 | Implement `importJobService` with dry-run and commit phases | P0 |
| 3 | Implement `csvMappingService` with auto-detection | P0 |
| 4 | Implement `importValidationService` with row-level error reporting | P0 |
| 5 | Implement `exportJobService` with permission and audit checks | P0 |
| 6 | Build Import Wizard UI (multi-step) | P0 |
| 7 | Build Export Page with module/field selection | P1 |
| 8 | Implement sensitive field masking in exports | P0 |
| 9 | Write tests: dry-run isolation, cross-company block, permission check | P0 |
| 10 | Write tests: partial import reconciliation, invalid row reporting | P1 |

---

## Non-Goals

- This release does **not** implement real-time sync or streaming import.
- This release does **not** integrate with third-party migration tools (e.g., Rippling, BambooHR importers).
- This release does **not** implement payroll history import (payroll data is too sensitive for bulk import without specialist review).
- This release does **not** auto-merge duplicate records — duplicates are flagged for human resolution.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
