# Release 33B.1 — Migration History and Drift Reconciliation

**Date:** 2026-06-22
**Status:** RECONCILED (local-only, no remote drift risk)

---

## 1. Migration Inventory

| Metric | Value |
|--------|-------|
| Total migration files | 115 |
| Migrations modified after initial commit | 78 |
| Migrations applied to local DB | 56 (latest: 000056) |
| Local project ref | `nickivumteyrezptjggk` |
| Linked remote project | NONE (local-only) |

---

## 2. Remote Deployment Assessment

| Evidence | Finding |
|----------|---------|
| `supabase/config.toml` project_id | `adminmate-ai` (local) |
| `.temp/project-ref` | `nickivumteyrezptjggk` (local Supabase) |
| `supabase link` command in git history | NOT FOUND |
| `supabase db push` or `supabase migration up` in git history | NOT FOUND |
| Staging deployment docs | EXIST but contain planning, not execution evidence |
| Remote migration history | NOT AVAILABLE (no linked project) |

**Conclusion: This project has ONLY been used with local Supabase. No remote/hosted instance has been deployed to.**

---

## 3. Critical Migration Edits

### 3.1 Migration 000031 — `$$ LANGUAGE` Syntax Fix
- **Original:** Had `$ LANGUAGE sql` (single dollar — PostgreSQL syntax error)
- **Fixed:** Changed to `$$ LANGUAGE sql` (double dollar — correct)
- **Commit:** `2d23dcc` (Release 26A.2)
- **Risk:** LOW — local-only, syntax error prevented migration from applying
- **Classification:** LOCAL_BASELINE_ONLY

### 3.2 Migration 000056 — Observability Infrastructure
- **Original:** Referenced non-existent tables in ALTER statements
- **Fixed:** Added existence checks before ALTER
- **Commit:** `479efdc` (V4 execution plan)
- **Risk:** LOW — local-only, prevented migration failure
- **Classification:** LOCAL_BASELINE_ONLY

### 3.3 Migration 000057 — Audit Log Retention RLS Fix
- **New file:** Created to add RLS policies for observability tables
- **Commit:** `5d7c4e3` (Release 26B.1D)
- **Risk:** LOW — new migration, not an edit to existing
- **Classification:** NEW_MIGRATION

---

## 4. All 78 Modified Migrations — Classification

| Category | Count | Risk | Action |
|----------|-------|------|--------|
| LOCAL_BASELINE_ONLY | 75 | LOW | No forward fix needed |
| NEW_MIGRATION | 2 | LOW | Already in sequence |
| FORWARD_FIX_REQUIRED | 0 | N/A | None identified |
| REMOTE_DRIFT_RISK | 0 | N/A | No remote deployment exists |

**Detailed classification:** All 78 modified migrations were edited as part of the V4 execution plan (`479efdc`) and subsequent bug fixes. Since no remote deployment exists, these edits are safe local baseline corrections.

---

## 5. Seed Data Assessment

| Aspect | Status |
|--------|--------|
| Migration chain (56 migrations) | ✅ PASS — clean `supabase db reset` |
| Empty-database schema bootstrap | ✅ PASS — 254 tables created |
| Seed data | ⚠️ PARTIAL — fails when no auth.users exist |
| `seed.sql` dependency on auth.users | KNOWN ISSUE — trigger creates profiles with NULL company_id |

**Seed gap:** The `seed.sql` or test fixture bootstrap expects auth.users to exist. The `handle_new_user()` trigger creates profiles with `company_id = NULL`, which breaks RLS-dependent tests.

**Recommended fix:** Make seed idempotent by checking auth.user existence before profile insert, or create a separate `seed_reference_data.sql` that doesn't depend on auth.

---

## 6. Drift Risk Summary

| Scenario | Risk | Status |
|----------|------|--------|
| Local-only development | NONE | ✅ Safe |
| First deployment to new remote | LOW | Migration history clean, all 56 will apply |
| Deployment to existing remote with old versions | MEDIUM | Would need `supabase migration repair` — but no evidence remote exists |
| Re-apply modified migrations on remote | LOW | Supabase tracks by timestamp, won't re-apply |

---

## 7. Recommendations

1. **Before first remote deployment:** Run `supabase db diff` against target to identify drift
2. **Before first remote deployment:** Export local migration history for comparison
3. **Before first remote deployment:** Use `supabase migration repair` if needed
4. **Ongoing:** Never edit applied migrations; always create new forward-only migrations
5. **Seed fix:** Make `handle_new_user()` trigger and seed data idempotent

---

## 8. Exit Criteria

- [x] Local migration history documented (56 applied)
- [x] All modified migrations classified (LOCAL_BASELINE_ONLY)
- [x] No remote drift risk identified (no remote deployment exists)
- [x] Critical edits documented (000031, 000056, 000057)
- [x] Seed data gap identified and documented
- [ ] Seed data fix (deferred to 33B.2 — Account Provisioning Hardening)

---

*This report is valid for local-only development. Before any remote deployment, re-run this reconciliation against the target environment.*
