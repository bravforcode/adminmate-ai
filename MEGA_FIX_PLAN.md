# AdminMate AI — Mega Fix Plan
## Comprehensive Bug Fix & Upgrade Roadmap

**Date:** 2026-06-28  
**Branch:** feat/mega-improvement-plan  
**Current State:** 1962 passed, 14 failed (integration-only), 22 skipped, 2 todo  
**TypeScript:** Clean  
**Files changed vs main:** 86 files, +5794/-462 lines

---

## Executive Summary

The mega audit found 93 findings. Phase 0-4 addressed the critical and high items. The verification sprint caught 6 additional bugs the audit missed (PND1 deduction rate, double-counted allowance, bracket boundary, floating-point rounding, SSO view security, migration column names). This plan covers everything remaining.

**Risk Level:** 🟠 HIGH → targeting 🟢 LOW after completion

---

## P0 — CRITICAL (Fix Today)

### Bug 1: whatsapp-webhook timingSafeEqual breaks test mock
- **What:** Our timingSafeEqual change in _shared/utils.ts broke the whatsapp-webhook test mock. The test mocks `createHmac` but the function now uses a different comparison path.
- **File:** supabase/functions/whatsapp-webhook/index.test.ts (3 failures)
- **Root cause:** Test mocks `createHmac` from `node:crypto` but `timingSafeEqual` in utils.ts uses a different code path that the mock doesn't intercept.
- **Fix:** Update the test mock to also mock the timingSafeEqual function, or restructure the test to use the actual crypto module.
- **Effort:** S
- **Acceptance:** All 3 whatsapp-webhook tests pass.

### Bug 2: release26a51 integration test failures (11 tests)
- **What:** Cross-tenant UPDATE/DELETE tests return 500 instead of 200/403.
- **File:** tests/integration/release26a51.rest-crud-privacy.integration.test.ts
- **Root cause:** These tests require a running Supabase instance with proper auth setup. The 500 errors indicate the test setup (user creation, token generation) isn't working against the local instance.
- **Fix:** Verify Supabase local is running, check test setup creates valid auth tokens, ensure RLS policies match test expectations.
- **Effort:** M
- **Acceptance:** All 49 tests pass when Supabase is running.

### Bug 3: release26a52 integration test failures
- **What:** Profile update returns HTTP 500.
- **File:** tests/integration/release26a52.deterministic-rls.test.ts
- **Root cause:** Similar to Bug 2 — test setup fails against local Supabase.
- **Fix:** Same approach as Bug 2.
- **Effort:** M
- **Acceptance:** All 22 tests pass when Supabase is running.

---

## P1 — HIGH (This Sprint)

### Bug 4: 64+ console.error calls bypass structured logger
- **What:** Services use raw `console.error()` instead of the project's structured Logger (src/lib/logger.ts) which has PII redaction, correlation IDs, and remote forwarding.
- **Files:** 20+ service files in src/services/
- **Impact:** Errors lost in production, PII may leak via console, no correlation between related errors.
- **Fix:** Replace all `console.error()` with `logger.error()`. The Logger already exists and handles everything.
- **Effort:** L (but mechanical — find/replace pattern)
- **Acceptance:** Zero `console.error` calls in src/services/. All errors go through Logger.

### Bug 5: 100+ select('*') instances
- **What:** Services fetch all columns when the UI only needs a subset. Wastes bandwidth, violates PDPA data minimization, increases parse time.
- **Files:** 100+ locations across src/services/
- **Impact:** Performance (5-15MB transfers on list pages), PDPA compliance risk (over-fetching PII), memory pressure on mobile.
- **Fix:** Prioritize by table:
  1. **PII tables first:** employees, candidates, user_profiles, payroll_run_items
  2. **High-traffic tables:** jobs, applications, documents, offers
  3. **Everything else:** replace with explicit column lists
- **Effort:** L (mechanical, can be parallelized)
- **Acceptance:** Zero `select('*')` on PII/high-traffic tables. ESLint rule catches new violations.

### Bug 6: Allowance gap not surfaced in payroll UI
- **What:** Married employees with dependents get personal-allowance-only math silently. No warning in the payroll run UI.
- **File:** src/pages/ (payroll-related pages)
- **Impact:** Employees with spouse/child allowances are over-withheld by ~20K THB/year without anyone noticing.
- **Fix:** Add a warning banner in the payroll run summary: "X employees have dependents on file. Spouse/child/parent allowances not yet auto-calculated. Manual review recommended before approval."
- **Effort:** S
- **Acceptance:** Warning visible when employees with dependents exist in the run.

### Bug 7: Old-vs-new payroll calculation diff
- **What:** The new RPC (payroll_calculate_run) hasn't been diffed against the old sequential code on real data.
- **Impact:** Transcription bugs could silently change payroll output.
- **Fix:** Run both old and new code paths on anonymized production data, diff the outputs. This is a deployment-time validation step.
- **Effort:** M
- **Acceptance:** Diff report shows zero differences (or documented, explained differences).

### Bug 8: WhatsApp webhook mock needs updating for timingSafeEqual
- **What:** The test mock structure doesn't account for the new timingSafeEqual import path.
- **File:** supabase/functions/whatsapp-webhook/index.test.ts
- **Fix:** Mock the entire _shared/utils module or restructure to use actual crypto.
- **Effort:** S
- **Acceptance:** Tests pass with the new timingSafeEqual implementation.

---

## P2 — MEDIUM (Next Sprint)

### Task 9: Add load testing baseline
- **What:** No load tests exist. Need baseline for top 5 endpoints.
- **Fix:** Create k6 scripts for: auth, search, dashboard, AI chat, document upload. Run against local Supabase. Record p50/p95/p99.
- **Effort:** M
- **Acceptance:** k6 script exists, baseline recorded, budget set (p95 < 500ms at 50 concurrent users).

### Task 10: Create ADR directory
- **What:** Architecture decisions scattered across 100+ release docs.
- **Fix:** Create docs/adr/ with standard ADR template. Document top 10 decisions.
- **Effort:** M
- **Acceptance:** docs/adr/ exists with 10+ ADRs covering major decisions.

### Task 11: Add CONTRIBUTING.md
- **What:** No contributor guide.
- **Fix:** Create CONTRIBUTING.md with PR workflow, branch naming, test requirements.
- **Effort:** S
- **Acceptance:** File exists with clear contribution guidelines.

### Task 12: Bundle analysis
- **What:** No visibility into bundle size impact of dependencies.
- **Fix:** Add vite-plugin-visualizer, run analysis, document findings.
- **Effort:** S
- **Acceptance:** Bundle analysis report exists, big offenders identified.

---

## P3 — LOW (Backlog)

### Task 13: Extract getDefaultRoute to shared utility
- **What:** Duplicate function in 3 locations.
- **Fix:** Extract to src/lib/navigation.ts.
- **Effort:** XS

### Task 14: Fix UI store language default mismatch
- **What:** uiStore defaults to 'th', authStore defaults to 'en'.
- **Fix:** Unify language state.
- **Effort:** XS

### Task 15: Add missing input length validation on edge functions
- **What:** Some edge functions don't validate request body size.
- **Fix:** Add Content-Length validation to POST handlers.
- **Effort:** XS

### Task 16: Schedule rate limit cleanup
- **What:** cleanup_rate_limits functions exist but no cron job runs them.
- **Fix:** Add pg_cron job for hourly cleanup.
- **Effort:** XS

### Task 17: Fix development host binding
- **What:** Dev server binds to 0.0.0.0 exposing to network.
- **Fix:** Change to --host=localhost in package.json dev script.
- **Effort:** XS

---

## Verification Checklist

After each fix, verify:
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` — no new failures
- [ ] `npx eslint src/` — no new warnings (if eslint configured)
- [ ] Manual smoke test of affected feature

---

## Dependencies Between Tasks

```
Bug 1 (whatsapp mock) → independent
Bug 2+3 (integration tests) → need Supabase running
Bug 4 (console.error) → independent, can parallelize
Bug 5 (select(*)) → independent, can parallelize
Bug 6 (allowance UI) → depends on Bug 7 completion
Bug 7 (payroll diff) → needs real data, independent
Bug 8 (whatsapp mock) → same as Bug 1
Task 9 (load tests) → independent
Task 10 (ADRs) → independent
Task 11 (CONTRIBUTING) → independent
```

---

## Estimated Timeline

| Week | Focus | Items |
|------|-------|-------|
| **Week 1** | P0 critical fixes | Bugs 1-3, Bug 8 |
| **Week 2** | P1 high — logger + select(*) | Bugs 4-5 (start) |
| **Week 3** | P1 high — finish + UI | Bugs 5-7 |
| **Week 4** | P2 medium | Tasks 9-12 |
| **Backlog** | P3 low | Tasks 13-17 |
