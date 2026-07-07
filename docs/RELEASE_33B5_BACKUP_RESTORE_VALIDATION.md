# Release 33B.5 — Backup/Restore Validation

**Date:** 2026-06-23  
**Status:** PASS  
**pgTAP Tests:** 19/19 PASS  
**Commit:** `dbb87be`  

---

## Summary

Release 33B.5 introduces database-level backup and restore validation functions. These functions enable automated schema integrity checks, backup verification, and schema snapshot comparison — critical for disaster recovery and migration confidence.

---

## Deliverables

### Migration: `20240620000060_backup_restore_validation.sql`

Four new PostgreSQL functions in the `public` schema:

| Function | Purpose | Returns |
|----------|---------|---------|
| `validate_backup_integrity()` | Checks all tables have RLS enabled, all functions have `search_path` set | JSONB |
| `validate_restore_completeness()` | Reports migration count, table count, function count, policy count, index count | JSONB |
| `export_schema_snapshot()` | Exports full schema metadata (tables, functions, policies) with checksum | JSONB |
| `compare_schema_snapshots(s1, s2)` | Compares two snapshots, returns diff and `is_identical` flag | JSONB |

### Test: `33b5_backup_restore_validation.sql`

19 pgTAP tests covering:

| # | Test | Result |
|---|------|--------|
| 1 | `validate_backup_integrity()` exists | PASS |
| 2 | `validate_backup_integrity()` returns JSONB | PASS |
| 3 | `validate_backup_integrity()` reports table count > 0 | PASS |
| 4 | `validate_backup_integrity()` includes tables key with RLS info | PASS |
| 5 | `validate_backup_integrity()` includes functions key with search_path info | PASS |
| 6 | `validate_backup_integrity()` includes overall_pass boolean | PASS |
| 7 | `validate_restore_completeness()` exists | PASS |
| 8 | `validate_restore_completeness()` returns JSONB | PASS |
| 9 | `validate_restore_completeness()` reports table count > 0 | PASS |
| 10 | `validate_restore_completeness()` reports function count > 0 | PASS |
| 11 | `validate_restore_completeness()` includes snapshot timestamp | PASS |
| 12 | `export_schema_snapshot()` exists | PASS |
| 13 | `export_schema_snapshot()` returns JSONB | PASS |
| 14 | `export_schema_snapshot()` contains all required fields | PASS |
| 15 | `export_schema_snapshot()` includes tables array with entries | PASS |
| 16 | `export_schema_snapshot()` includes functions array with entries | PASS |
| 17 | `compare_schema_snapshots()` exists | PASS |
| 18 | `compare_schema_snapshots()` identical snapshots → is_identical=true | PASS |
| 19 | `compare_schema_snapshots()` different snapshots → is_identical=false | PASS |

---

## Usage Examples

### Validate backup integrity before export
```sql
SELECT validate_backup_integrity();
-- Returns: { "tables": { "total": 47, "with_rls": 41, "rls_disabled": 6, ... }, "functions": { ... }, "overall_pass": false }
```

### Capture schema snapshot for backup manifest
```sql
SELECT export_schema_snapshot();
-- Returns full JSONB with tables, functions, policies, checksum
```

### Compare before/after restore
```sql
SELECT compare_schema_snapshots(
  '...snapshot from before restore...'::jsonb,
  export_schema_snapshot()
);
-- Returns: { "is_identical": true/false, "tables_added": 0, "tables_removed": 0, ... }
```

### Validate restore completeness
```sql
SELECT validate_restore_completeness();
-- Returns: { "migrations": 0, "tables": 47, "views": 0, "functions": 140, "policies": 85, "indexes": 62 }
```

---

## Notes

- **RLS gaps:** 6 legacy tables have RLS disabled (pre-existing, deferred). The validation functions correctly detect and report these.
- **search_path gaps:** Some legacy functions lack explicit `search_path` setting (pre-existing, deferred).
- **pgTAP extension:** Must be installed before running tests: `CREATE EXTENSION IF NOT EXISTS pgtap SCHEMA public;`
- **Seed FK issue:** Known `db reset` FK violation on clean reset (deferred from 33B.0.1).

---

## Dependency Chain

```
33B.4 (CI Governance) → 33B.5 (Backup/Restore Validation)
```

No downstream dependencies from this release.
