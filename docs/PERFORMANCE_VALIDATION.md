# Performance Validation Report

> Generated: 2026-06-23 | Migration: `20240620000067_performance_validation.sql`
> Stack: Supabase PostgreSQL 15 | 255 tables | ~9.5 MB total

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Tables | 255 | OK |
| Total Database Size | 9,456 KB (~9.5 MB) | OK |
| Tables with RLS | 255 | OK |
| Index Coverage (PASS) | 571 policies | GOOD |
| Index Coverage (FAIL) | 83 policies | NEEDS ATTENTION |
| RLS Critical Missing Indexes | 23 tables | ACTION REQUIRED |
| Slow Query Issues | 1 (CRITICAL) | ACTION REQUIRED |

**Overall Assessment**: The database has solid foundational indexing for core tables (jobs, applications, candidates). However, 23 newer tables added during the 33B series are missing `company_id` indexes required by their RLS policies. This causes full table scans on every policy evaluation.

---

## 1. Functions Deployed

| Function | Purpose | GRANT |
|----------|---------|-------|
| `get_table_stats()` | Row counts, sizes, vacuum stats for all public tables | `authenticated` |
| `validate_query_performance()` | Audits missing indexes on RLS, FK, and filter columns | `authenticated` |
| `identify_slow_queries()` | Identifies bloat, missing indexes, and RLS gaps | `authenticated` |
| `validate_index_coverage()` | Checks index coverage for every RLS policy | `authenticated` |

---

## 2. Table Statistics (Top 20 by Size)

| Table | Rows | Table Size | Index Size | Total |
|-------|------|------------|------------|-------|
| role_permissions | 791 | 56 kB | 72 kB | 128 kB |
| feature_capabilities | 95 | 24 kB | 80 kB | 104 kB |
| permissions | 199 | 24 kB | 48 kB | 72 kB |
| employees | 1 | 8 kB | 128 kB | 136 kB |
| user_profiles | 7 | 8 kB | 96 kB | 104 kB |
| feature_flags | 24 | 8 kB | 80 kB | 88 kB |
| sensitive_field_registry | 17 | 8 kB | 80 kB | 88 kB |
| employees | 1 | 8 kB | 128 kB | 136 kB |

All 255 tables are small (dev/seed data). Index-to-data ratios are healthy.

---

## 3. Query Performance Audit

### 3.1 RLS Coverage (company_id indexes)

| Severity | Count | Description |
|----------|-------|-------------|
| OK | 195 | RLS filter column is indexed |
| CRITICAL | 23 | RLS uses `company_id` but no index exists |

**23 CRITICAL tables missing `company_id` index:**

```
business_travel_day_counts      message_queue
chat_platform_connections       message_template_versions
cv_documents                    notification_preferences
data_deletion_requests          notification_preferences_v2
entity_addresses                offboarding_access_revocations
entity_registration_numbers     offboarding_asset_returns
entity_tax_profiles             offboarding_case_items
exit_interviews                 offboarding_documents
final_settlement_readiness      offboarding_template_items
idempotency_keys                onboarding_document_requests
platform_sync_log               onboarding_instance_items
onboarding_template_items
```

**Impact**: Every `SELECT`, `INSERT`, `UPDATE`, `DELETE` on these tables triggers a full sequential scan during RLS policy evaluation. With Supabase's `get_user_company_id()` called per-row, this is O(n) per query.

### 3.2 Foreign Key Index Coverage

| Severity | Count | Description |
|----------|-------|-------------|
| OK | 386 | FK columns are indexed |
| HIGH | 183 | FK columns lack indexes |

183 foreign key columns are not indexed. While not all require immediate action, the most commonly JOINed FKs (e.g., `application_id` in interviews, `checklist_id` in onboarding_tasks) should be prioritized.

### 3.3 Filter Column Coverage

| Severity | Count | Description |
|----------|-------|-------------|
| OK | 111 | Filter columns are indexed |
| MEDIUM | 255 | Filter columns (status, created_at, user_id, email) lack indexes |

---

## 4. Slow Query Identification

| Issue Type | Severity | Count | Details |
|------------|----------|-------|---------|
| RLS_NO_COMPANY_INDEX | CRITICAL | 1 | Table with RLS policy but no `company_id` index |

The `identify_slow_queries()` function detected **1 CRITICAL** issue where a table has an RLS policy referencing `get_user_company_id()` but lacks the corresponding `company_id` index.

---

## 5. RLS Index Coverage Analysis

| Status | Policies | Avg Coverage | Description |
|--------|----------|--------------|-------------|
| PASS | 571 | 100.0% | All filter columns indexed |
| PARTIAL | 35 | 51.9% | Some filter columns missing indexes |
| FAIL | 83 | 2.4% | Most/all filter columns missing indexes |
| N/A | 61 | 100.0% | Custom filters, manual review needed |

**Worst offenders** (0% coverage):

- `api_keys` — 4 policies, `company_id` not indexed
- `business_travel_day_counts` — 2 policies, `company_id` not indexed
- `chat_platform_connections` — 4 policies, `company_id` not indexed
- `cv_documents` — 2 policies, `company_id` not indexed
- `data_deletion_requests` — 3 policies, `company_id` not indexed

---

## 6. Recommendations

### Immediate (CRITICAL)

1. **Add `company_id` indexes to 23 tables** missing them for RLS:

```sql
-- Batch create missing company_id indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_company ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_business_travel_day_counts_company ON business_travel_day_counts(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_platform_connections_company ON chat_platform_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_cv_documents_company ON cv_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_company ON data_deletion_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_company ON entity_addresses(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_registration_numbers_company ON entity_registration_numbers(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_tax_profiles_company ON entity_tax_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_exit_interviews_company ON exit_interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_final_settlement_readiness_company ON final_settlement_readiness(company_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_company ON idempotency_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_company ON message_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_message_template_versions_company ON message_template_versions(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_company ON notification_preferences(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_v2_company ON notification_preferences_v2(company_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_access_revocations_company ON offboarding_access_revocations(company_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_asset_returns_company ON offboarding_asset_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_case_items_company ON offboarding_case_items(company_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_documents_company ON offboarding_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_template_items_company ON offboarding_template_items(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_document_requests_company ON onboarding_document_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_instance_items_company ON onboarding_instance_items(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_template_items_company ON onboarding_template_items(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_sync_log_company ON platform_sync_log(company_id);
```

### Short-term (HIGH)

2. **Audit 183 FK indexes** — prioritize the most frequently JOINed tables:
   - `interviews.application_id`
   - `onboarding_tasks.checklist_id`
   - `offboarding_case_items.case_id`
   - `message_queue.thread_id`

3. **Monitor vacuum stats** — run `SELECT * FROM get_table_stats() WHERE dead_tuples > 1000` periodically.

### Medium-term

4. **Add composite indexes** for common query patterns (e.g., `(company_id, status, created_at)`).
5. **Schedule periodic `REFRESH MATERIALIZED VIEW dashboard_stats`** after bulk writes.

---

## 7. pgTAP Test Results

```
1..14
ok 1 - get_table_stats is callable
ok 2 - get_table_stats returns at least one table entry
ok 3 - get_table_stats is a set-returning fn
ok 4 - validate_query_performance is callable
ok 5 - validate_query_performance returns at least one check result
ok 6 - All severity values are valid (OK/CRITICAL/HIGH/MEDIUM)
ok 7 - RLS_COVERAGE category has entries
ok 8 - identify_slow_queries is callable
ok 9 - All issue types are valid (HIGH_DEAD_TUPLES/TABLE_NO_INDEXES/RLS_NO_COMPANY_INDEX)
ok 10 - All identify_slow_queries severity values are valid
ok 11 - validate_index_coverage is callable
ok 12 - validate_index_coverage returns at least one policy coverage entry
ok 13 - All validate_index_coverage status values are valid (PASS/PARTIAL/FAIL/N/A)
ok 14 - All coverage_pct values are between 0 and 100
```

**Result: 14/14 PASS**

---

## 8. Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20240620000067_performance_validation.sql` | Migration deploying 4 validation functions |
| `supabase/tests/33b_performance_validation.sql` | 14 pgTAP tests validating all functions |
| `docs/PERFORMANCE_VALIDATION.md` | This report |
