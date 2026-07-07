# Release 26B.1D — Full Green Baseline

**Date**: 2026-06-22
**Status**: ✅ COMPLETE

## Evidence

### Vitest: 1703/1703 PASS (94 test files)
```
Test Files  94 passed (94)
Tests       1703 passed (1703)
Duration    22.93s
```

### pgTAP: 140/140 PASS (3 test files, against fresh database)
```
rls_runtime_proof.sql           20 tests PASS
26a41_crud_scope_closure.sql    80 tests PASS
26a4_runtime_rls_behavioral.sql 40 tests PASS
```

### Database: 254 tables, 56 migrations clean
```
supabase db reset → All 56 migrations applied successfully
```

## Fixes in This Release

### 1. productionHardening.test.ts — Mock Chain Fix
- **Root cause**: `createChainable()` returned a thenable object but `.then()` resolved before `.single()` was called for error cases
- **Fix**: Replaced `createChainable(chainResult)` with nested chain mock that returns error directly from `.single()`
- **Impact**: 1 test fixed (securityAuditService insert failure path)

### 2. release26a51 G5 — Scope + Param Fix
- **Root cause 1**: `T0` referenced from wrong `describe` scope (defined in chat_messages block, used in anti-footgun block)
- **Root cause 2**: `{ company_id: 'eq.X' }` passed as `data` (4th arg) instead of `params` (5th arg)
- **Fix**: Define `T0 = USERS[0]` locally; pass filter as `params` with `undefined` for `data`
- **Impact**: 1 test fixed

### 3. release26a52 — Param Ordering Fix
- **Root cause**: Same as 26a51 — all `api('GET', ...)` calls passed `{ company_id: ... }` as request body (`data`) instead of URL query params (`params`). For GET requests, the body is ignored, so no `company_id` filter was sent. RLS returned user's own company data (9 rows) instead of blocking cross-tenant access (0 rows).
- **Root cause confirmed**: Standalone Node.js diagnostic proved cross-tenant blocking works correctly (0 rows). The test itself had the param bug.
- **Fix**: Changed all `api('GET', table, token, { company_id: ... })` to `api('GET', table, token, undefined, { company_id: ... })`
- **Impact**: 2 tests fixed, 5 other tests corrected for accuracy

### 4. Migration 000057 — Observability RLS
- Added RLS policies for: `audit_log_retention`, `idempotency_keys`, `dead_letter_queue`, `usage_metrics`, `tenant_quotas`, `cost_attribution`

## Commits
```
feat(26B.1D): fix test bugs — param ordering + mock chain + scope reference
feat(26B.1D): full green baseline — 1703/1703 vitest + 140/140 pgTAP
```

## Gate B Readiness
With 26B.1D complete, all pre-Gate-B remediation tasks are done:
- 26B.0: Baseline truth ✅
- 26B.1A: Migration dependency repair ✅
- 26B.1B: Deterministic profile provisioning ✅
- 26B.1C: productionHardening mock fix ✅
- 26B.1D: Full green baseline ✅

**Next**: Release 26B.2 (Deterministic Data Factory) → Release 26B.3–26B.10 → Gate B closure
