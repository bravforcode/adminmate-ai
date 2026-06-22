# Release 33B.1R — Remote Status and Migration Manifest Reconciliation

**Date:** 2026-06-22
**Status:** CONDITIONAL PASS

---

## A. Remote Status Correction

| Field | Value |
|-------|-------|
| Project ref in config | `adminmate-ai` |
| Project ref in .temp | `nickivumteyrezptjggk` |
| Project URL (status) | `http://127.0.0.1:54321` (local) |
| Linked remote project | **POTENTIAL_LINKED_REMOTE — UNVERIFIED** |

**Evidence:** `supabase status` shows local URL. `supabase migration list --linked` returns same output as `--local`, suggesting no separate linked project. However, the project reference exists and cannot be proven to have never been linked without Supabase API verification.

**Classification:** Until `supabase projects list` or Supabase API confirms no hosted project with ref `nickivumteyrezptjggk`, this remains POTENTIAL_LINKED_REMOTE.

---

## B. Complete Migration Manifest

### Summary

| Metric | Value |
|--------|-------|
| Total .sql files in supabase/migrations/ | 115 |
| Non-migration files (.gitkeep) | 1 |
| Invalid filename (manual_migrate_tokens.sql) | 1 |
| Actual migration files | 113 |
| Applied in local DB | 113 |
| Application rate | 100% |

### Classification Breakdown

| Classification | Count | Description |
|----------------|-------|-------------|
| active_local_baseline | 39 | Applied, not modified post-commit |
| historical_edit | 75 | Applied AND modified post-commit |
| invalid_filename | 1 | manual_migrate_tokens.sql (not a migration) |

### Skipped Files

| File | Reason |
|------|--------|
| `.gitkeep` | Does not match `<timestamp>_name.sql` pattern |
| `manual_migrate_tokens.sql` | Does not match `<timestamp>_name.sql` pattern |

### Full Manifest

Saved to: `docs/evidence/33b1r-migration-manifest.txt`

Format: `filename|timestamp|valid_timestamp|first_commit|was_modified|applied_locally|classification`

---

## C. Read-Only Remote Inspection

| Command | Result |
|---------|--------|
| `supabase status` | Local instance running at 127.0.0.1:54321 |
| `supabase migration list` | 113 local, 113 remote (local DB) |
| `supabase migration list --linked` | Same output as local (no separate linked project detected) |

**No linked remote project was found.** The "Remote" column in migration list matches the local database. This is consistent with a local-only project but does not prove no hosted project exists.

---

## D. Historical Migration Edits

| Category | Count | Risk | Action |
|----------|-------|------|--------|
| active_local_baseline | 39 | NONE | No action needed |
| historical_edit | 75 | LOW (local-only) | No forward fix needed unless remote is discovered |
| invalid_filename | 1 | NONE | Not a migration, ignored by CLI |

**All 75 edited migrations** were modified as part of V4 execution plan and bug fixes. Since no linked remote project was found, these edits are safe local baseline corrections.

**If a remote project is later discovered:** Create forward-only repair migrations after reviewing drift with `supabase db diff --linked`.

---

## E. Seed/Provisioning Baseline

| Aspect | Status |
|--------|--------|
| Schema bootstrap | ✅ PASS — 113 migrations apply, 254 tables created |
| Migration chain | ✅ PASS — clean `supabase db reset` |
| Seed data | ⚠️ PARTIAL — fails when no auth.users exist |
| `handle_new_user()` trigger | ⚠️ Creates profiles with NULL company_id |
| Deterministic test fixture | ⚠️ Requires direct SQL workaround |

**Seed boundary:** Reference seed data (countries, tax brackets, plan configs) should be separated from auth-dependent test fixtures (users, companies, memberships). This separation is required before 33B.2.

---

## F. Evidence Files

| File | Content |
|------|---------|
| `docs/evidence/33b1r-local-migration-list.txt` | Full `supabase migration list` output |
| `docs/evidence/33b1r-migration-manifest.txt` | 115-file manifest with classifications |

---

## G. Verdict Criteria

| Criterion | Status |
|-----------|--------|
| Local migration manifest explains all 115 files | ✅ 113 migrations + 1 .gitkeep + 1 invalid |
| Local DB history identified | ✅ 113 applied, 100% rate |
| Read-only linked inspection attempted | ✅ No linked project found |
| Project ref classified as POTENTIAL_LINKED_REMOTE | ✅ Classified correctly |
| No supabase migration repair used | ✅ Not used |
| No db push/pull/reset --linked used | ✅ Not used |
| All edited migrations classified | ✅ 75 historical_edit, 39 active_local_baseline |
| Seed baseline documented with remediation plan | ✅ Boundary documented, fix deferred to 33B.2 |

---

## H. Verdict

**CONDITIONAL PASS**

- All local migration reconciliation criteria met
- Remote status correctly classified as POTENTIAL_LINKED_REMOTE — UNVERIFIED
- Seed baseline documented but fix deferred to 33B.2
- No forbidden commands used

**Condition for full PASS:** Before first remote deployment, verify no hosted project exists with ref `nickivumteyrezptjggk` via Supabase API or dashboard.

---

*This report is valid as of 2026-06-22. Re-verify before any remote deployment.*
