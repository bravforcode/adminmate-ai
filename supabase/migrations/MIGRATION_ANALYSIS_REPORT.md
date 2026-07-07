# Migration Dependency Analysis Report
**Branch:** feat/mega-improvement-plan
**Date:** 2026-06-28
**Scope:** 11 new migrations matching `20240627*.sql`

---

## Supabase Execution Order (Lexicographic)

Supabase CLI sorts migration filenames lexicographically (byte comparison). The actual execution order is **NOT** what the numeric suffixes suggest:

```
 #  File                                        Purpose
─────────────────────────────────────────────────────────────────────
 1  202406270000010_emp_num_sequence.sql         Create emp_num_seq sequence
 2  202406270000011_encrypt_sso_certificates.sql  SSO cert encryption at rest
 3  202406270000012_fix_thai_tax_brackets.sql     Fix Thai PIT tax brackets
 4  20240627000001_consolidate_rls_functions.sql   RLS consolidation (canonical: get_user_company_id)
 5  20240627000002_payroll_atomicity_rpc.sql       Payroll atomic calculation RPC
 6  20240627000003_leave_balance_rpc.sql           Leave request/approve RPC
 7  20240627000004_consolidate_rls_functions.sql   RLS consolidation (canonical: safe_user_company_id)
 8  20240627000004b_fix_applications_read_rls.sql  Applications RLS optimization
 9  20240627000005_pg_cron_refresh.sql             pg_cron: dashboard refresh + rate limit cleanup
10  20240627000006_audit_log_stats_rpc.sql         Audit log stats RPC
11  20240627000007_search_optimization.sql         pg_trgm GIN indexes for search
```

**Why this order?** Timestamps `0000010`, `0000011`, `0000012` sort BEFORE `000001_` because ASCII `0` (48) < `_` (95). The agents who created these used 3-digit suffixes thinking they'd sort after single-digit ones, but they sort before them.

---

## Issue #1: CRITICAL — Infinite Recursion (Mitigated)

**Migrations involved:** `000001` and `000004` (both named `consolidate_rls_functions`)

**Problem:** Two agents created RLS consolidation migrations with **opposite canonical directions**:

| Migration | Canonical function | Alias |
|-----------|-------------------|-------|
| `000001` | `get_user_company_id()` | `safe_user_company_id()` → calls `get_user_company_id()` |
| `000004` | `safe_user_company_id()` | `get_user_company_id()` → calls `safe_user_company_id()` |

**After both run, the state is:**
```
get_user_company_id()    → SELECT safe_user_company_id()
safe_user_company_id()   → SELECT get_user_company_id()
                           ↻ INFINITE RECURSION (stack depth exceeded, error 54001)
```

Additionally, `000004` recreates `profiles_admin` as `FOR ALL` which includes SELECT, and the function queries `user_profiles` — causing recursive RLS evaluation (error 42P17).

**Mitigation already in place:** Migration `20240630000001_fix_rls_infinite_recursion.sql` runs AFTER all `000001-*` migrations and fixes this by:
1. Making both functions query `user_profiles` directly (no mutual recursion)
2. Splitting `profiles_admin` policy to exclude SELECT
3. Cleaning up duplicate policy names

**Verdict:** The recursion would exist briefly during migration but is fixed by the `0630` migration. `db reset` will produce a correct final state. However, this is fragile — if `0630` is ever removed, the system breaks.

---

## Issue #2: MEDIUM — Timestamp Ordering Mismatch

**Migrations involved:** `0000010`, `0000011`, `0000012`

These three migrations were intended to run AFTER `000007` (the last "Phase 3" migration), but they actually run FIRST due to lexicographic sorting.

**Impact:** Low for these specific migrations because they don't depend on the Phase 3 RLS migrations. However:
- `0000012_fix_thai_tax_brackets.sql` fixes tax bracket data that `000002_payroll_atomicity_rpc.sql` reads. In the current order, the fix runs BEFORE the RPC is created — which is fine (data exists before function is created).
- `0000010_emp_num_sequence.sql` is standalone — no issue.
- `0000011_encrypt_sso_certificates.sql` is standalone — no issue.

**Verdict:** No functional breakage, but the naming is misleading. Future maintainers will assume `0000010` runs after `000001`, which is wrong.

---

## Issue #3: No Conflicts — `000004b` vs `000004`

**Migrations involved:** `000004_consolidate_rls_functions.sql` and `000004b_fix_applications_read_rls.sql`

- `000004` drops/recreates policies on: `companies`, `user_profiles`, `notifications`, `audit_logs`, `chat_platform_connections`
- `000004b` drops/recreates policies on: `applications`

**No overlap.** They operate on different tables. Both depend on `safe_user_company_id()` existing, which is guaranteed since `000001` creates it (and runs before `000004`).

**Verdict:** Clean. No conflict.

---

## Dependency Verification

| Migration | Dependencies | Status |
|-----------|-------------|--------|
| `0000010` emp_num_seq | None (standalone) | ✅ OK |
| `0000011` sso_encrypt | `sso_provider_configs` table (migration `20240620000023`), `pgcrypto` extension (`20240101000001`) | ✅ OK |
| `0000012` tax_brackets | `th_tax_brackets` table (`20240620000023`) | ✅ OK |
| `000001` rls_consolidate | `get_user_company_id()` (`20240101000020`), `safe_user_company_id()` (`20240102000004`) | ✅ OK |
| `000002` payroll_rpc | `payroll_runs`, `payroll_run_items`, `th_tax_brackets`, `th_social_security_rules`, `payroll_audit_events` (all from `20240620000023`) | ✅ OK |
| `000003` leave_rpc | `user_profiles`, `employees`, `leave_types`, `leave_balances`, `leave_requests` (all from `20240620000021`) | ✅ OK |
| `000004` rls_consolidate | `safe_user_company_id()`, `safe_user_role()` (`20240102000004`) | ✅ OK |
| `000004b` apps_rls | `safe_user_company_id()`, `safe_user_role()`, `applications.company_id` | ✅ OK |
| `000005` pg_cron | `dashboard_stats` MV (`20240102000007`), `cleanup_rate_limits()` (`20240102000005`), `pg_cron` extension | ✅ OK |
| `000006` audit_stats | `audit_logs` table (`20240101000014`) | ✅ OK |
| `000007` search_idx | `pg_trgm` extension, `candidates` table (`20240101000005`), `jobs` table (`20240101000004`) | ✅ OK |

---

## Object Overlap Check

| Object Type | Migrations | Conflict? |
|-------------|-----------|-----------|
| Tables created | None (all are functions/policies/indexes) | ✅ |
| Functions | `get_user_company_id` (`000001`, `000004`), `safe_user_company_id` (`000001`) | ⚠️ See Issue #1 |
| Functions | `payroll_calculate_run` (`000002`), `leave_request_create` (`000003`), `leave_request_approve` (`000003`), `get_audit_log_stats` (`000006`), `encrypt_sso_certificate` (`0000011`), `decrypt_sso_certificate` (`0000011`) | ✅ Unique names |
| Policies | `applications_read/write` (`000004b`) | ✅ Unique to this migration |
| Policies | `companies_read/write`, `profiles_*`, `audit_read`, `connections_*` (`000004`) | ✅ Unique to this migration |
| Indexes | `idx_applications_company_id` (`000004b`), trigram indexes (`000007`) | ✅ Unique names |
| Sequences | `emp_num_seq` (`0000010`) | ✅ Unique |
| Views | `sso_provider_configs_decrypted` (`0000011`) | ✅ Unique |
| Extensions | `pg_cron` (`000005`), `pg_trgm` (`000007`), `pgcrypto` (`0000011`) | ✅ All use `IF NOT EXISTS` |

---

## Drops Check

| Migration | Drops | Conflicts? |
|-----------|-------|-----------|
| `000004` | Policies: `companies_read/write`, `profiles_read/update_own/admin`, `notif_insert`, `audit_read`, `connections_read/write` | ✅ Recreated in same migration |
| `000004b` | Policies: `applications_read/write` | ✅ Recreated in same migration |
| `0000012` | Data: `DELETE FROM th_tax_brackets WHERE year = 2024` | ✅ Replaced with correct data |
| `0000011` | None (CREATE only) | ✅ |
| All others | None | ✅ |

No migration drops an object that another migration in this batch needs.

---

## `db reset` Verdict

**Will `supabase db reset` apply cleanly?**

✅ **YES** — with caveats:

1. **The infinite recursion from Issue #1 will exist transiently** during migration, but `20240630000001_fix_rls_infinite_recursion.sql` runs last and fixes it. Final state is correct.

2. **`pg_cron` may fail** if the Supabase project doesn't have `pg_cron` available (requires paid plan or self-hosted). This would cause migration `000005` to fail and halt the entire reset. Consider wrapping in a DO block with exception handling.

3. **`pg_trgm` may fail** if not pre-installed. `CREATE EXTENSION IF NOT EXISTS pg_trgm` requires superuser on some Supabase plans.

4. **SSO encryption key** (`app.sso_encryption_key`) must be set before `0000011` is useful, though the migration itself won't fail — the functions will just raise exceptions if called without the key.

---

## Recommendations

1. **Rename the `0000010`, `0000011`, `0000012` files** to `000008`, `000009`, `000010` (or similar) so they sort correctly after `000007`. This is cosmetic but prevents future confusion.

2. **Consolidate the two RLS consolidation migrations** (`000001` and `000004`) into a single migration with the correct canonical direction. The current setup relies on a third migration (`0630`) to fix the mess.

3. **Wrap `pg_cron` and `pg_trgm` in DO blocks** to handle cases where the extension isn't available:
   ```sql
   DO $$ BEGIN
     CREATE EXTENSION IF NOT EXISTS pg_cron;
   EXCEPTION WHEN insufficient_privilege THEN
     RAISE NOTICE 'pg_cron not available — skipping cron jobs';
   END $$;
   ```

4. **Add GRANT EXECUTE** for the new RPC functions. Only `000002` and `000003` have `GRANT EXECUTE` — `000006` (`get_audit_log_stats`) does not, which means it will only work for service_role, not authenticated users.

---

*Report generated by BravOS Elite Plan Executor*
