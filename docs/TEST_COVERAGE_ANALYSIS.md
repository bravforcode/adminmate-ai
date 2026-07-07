# Test Coverage Analysis Report

**Date:** 2026-06-23
**Tool:** Vitest v2.1.9 with V8 coverage provider
**Project:** AdminMate AI

---

## Executive Summary

| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| Statements | 38.25% (18,135/47,406) | 85% | FAIL |
| Branches | 80.01% (3,299/4,123) | 80% | PASS |
| Functions | 48.82% (458/938) | 85% | FAIL |
| Lines | 38.25% (18,135/47,406) | 85% | FAIL |

**Key Finding:** The test suite has **1,777 Vitest tests** across 102 test files, but most tests validate business logic rules against mocked implementations rather than exercising the actual `src/` service code. This creates a misleading coverage picture where test files themselves show ~100% coverage while the source code they should be testing remains largely uncovered.

---

## 1. Test Inventory

### 1.1 Test Distribution

| Category | Files | Tests | Coverage (src/) |
|----------|-------|-------|-----------------|
| Unit tests (`tests/unit/`) | 76 | ~1,500+ | Mocked - low src/ coverage |
| Integration tests (`tests/integration/`) | 5 | ~100+ | Supabase-dependent |
| Chaos tests (`tests/chaos/`) | 5 | ~56 | Mocked - low src/ coverage |
| E2E tests (`tests/e2e/`) | 5 specs | 5 | Playwright (not in Vitest) |
| pgTAP tests (DB) | N/A | 140+ | Database-level (separate runner) |
| Edge Function tests (`supabase/functions/`) | 10 | ~169 | Edge function mocks |
| In-source tests (`src/**/*.test.*`) | 5 | ~45 | Direct src coverage |

### 1.2 Test Pass Rate

```
Test Files:  2 failed | 100 passed (102)
Tests:       1 failed | 1,754 passed | 22 skipped (1,777)
```

**Failed Tests:**
1. `tests/unit/security/privilegedPathAudit.test.ts` - 2 SECURITY DEFINER functions missing `SET search_path = public` (real security violation found!)
2. `tests/integration/release26a52.deterministic-rls.test.ts` - HTTP 409 conflict (Supabase setup issue)

---

## 2. Source Code Coverage by Area

### 2.1 Pages (0% Coverage - CRITICAL)

**52 page files, ~5,000 statements, 0% covered.**

| Directory | Files | Statements | Coverage |
|-----------|-------|------------|----------|
| `src/pages/` (root) | 16 | 3,986 | 0% |
| `src/pages/auth/` | 6 | 491 | 0% |
| `src/pages/documents/` | 1 | 135 | 0% |
| `src/pages/hiring/` | 2 | 289 | 0% |
| `src/pages/onboarding/` | 2 | 116 | 0% |
| `src/pages/portal/` | 2 | 444 | 0% |
| `src/pages/public/` | 5 | 757 | 0% |
| `src/pages/recruitment/` | 7 | 537 | 0% |
| `src/pages/settings/` | 12 | 2,555 | 0% |

**Impact:** No component-level tests for any page. E2E tests (5 specs) cover only critical login/dashboard paths.

### 2.2 Components

| Directory | Stmts | Funcs | Coverage | Tests Exist? |
|-----------|-------|-------|----------|--------------|
| `components/ai/` | 298 | 2 | 0% | No |
| `components/auth/` | 826 | 19 | 46.7% | Yes (LoginForm, MFAChallenge) |
| `components/brand/` | 60 | 1 | 0% | No |
| `components/candidates/` | 199 | 4 | 0% | No |
| `components/chat/` | 236 | 2 | 0% | No |
| `components/common/` | 204 | 9 | 54.9% | Partial |
| `components/compliance/` | 159 | 1 | 0% | No |
| `components/documents/` | 192 | 2 | 0% | No |
| `components/interviews/` | 269 | 4 | 0% | No |
| `components/jobs/` | 200 | 7 | 64.5% | Partial (JobForm) |
| `components/layout/` | 664 | 19 | 17.0% | No |
| `components/offers/` | 73 | 1 | 0% | No |
| `components/onboarding/` | 316 | 3 | 0% | No |
| `components/pdf/` | 141 | 3 | 100% | Yes (ThaiFont) |
| `components/pipeline/` | 370 | 4 | 0% | No |
| `components/reports/` | 188 | 1 | 0% | No |
| `components/search/` | 220 | 1 | 0% | No |
| `components/settings/` | 87 | 1 | 0% | No |
| `components/shared/` | 527 | 10 | 0% | No |
| `components/ui/` | 877 | 20 | 12.3% | No |

### 2.3 Services (src/services/)

| Service | Stmts | Funcs | Coverage | Has Unit Test? | Issue |
|---------|-------|-------|----------|----------------|-------|
| `ai/` | 113 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `analytics/` | 240 | 12 | 91.3% | Yes | Good |
| `api/` | 320 | 18 | 64.7% | Partial | Gap in API layer |
| `assets/` | 142 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `attendance/` | 378 | 2 | 0% | Yes (mocked) | Test doesn't import src |
| `benefits/` | 212 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `billing/` | 92 | 7 | 80.4% | Yes | Good |
| `capability/` | 68 | 4 | 100% | Yes | Excellent |
| `compensation/` | 158 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `compliance/` | 341 | 2 | 0% | Yes (mocked) | Test doesn't import src |
| `config/` | 321 | 10 | 72.6% | Partial | Needs more |
| `contractor/` | 161 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `engagement/` | 168 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `expenses/` | 188 | 1 | 0% | No | No test at all |
| `flags/` | 164 | 1 | 0% | No | No test at all |
| `helpdesk/` | 193 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `hris/` | 377 | 3 | 0% | Yes (mocked) | Test doesn't import src |
| `importExport/` | 478 | 17 | 18.8% | Yes (mocked) | Low coverage |
| `infrastructure/` | 146 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `integration/` | 224 | 12 | 98.2% | Yes | Excellent |
| `learning/` | 147 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `messaging/` | 298 | 3 | 0% | Partial | Gap |
| `messaging/providers/` | 199 | 9 | 16.1% | Partial | Low |
| `mobility/` | 335 | 6 | 35.8% | Yes (mocked) | Partial |
| `monitoring/` | 85 | 6 | 100% | Yes | Excellent |
| `notification/` | 118 | 8 | 100% | Yes | Excellent |
| `offboarding/` | 479 | 5 | 0% | Yes (mocked) | Test doesn't import src |
| `onboarding/` | 631 | 9 | 2.9% | Yes (mocked) | Nearly zero |
| `payroll/` | 530 | 4 | 0% | Yes (mocked) | Test doesn't import src |
| `performance/` | 122 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `platform/` | 113 | 4 | 100% | Yes | Excellent |
| `quality/` | 648 | 15 | 99.8% | Yes | Excellent |
| `queue/` | 83 | 5 | 100% | Yes | Excellent |
| `scheduling/` | 229 | 1 | 0% | Yes (mocked) | Test doesn't import src |
| `search/` | 105 | 16 | 100% | Yes | Excellent |
| `security/` | 548 | 16 | 70.6% | Partial | Needs improvement |

### 2.4 Hooks (src/hooks/)

| Hook | Coverage | Tests? |
|------|----------|--------|
| `useApplications.ts` | 0% | No |
| `useAuth.ts` | 0% | No |
| `useCandidates.ts` | 0% | No |
| `useCandidatesWithApplications.ts` | 0% | No |
| `useChat.ts` | 0% | No |
| `useCompanyQuery.ts` | 0% | No |
| `useDashboard.ts` | 0% | No |
| `useDocuments.ts` | 0% | No |
| `useInterviews.ts` | 0% | No |
| `useJobs.ts` | 0% | No |
| `useMediaQuery.ts` | 0% | No |
| `useOffers.ts` | 0% | No |
| `useOnboarding.ts` | 0% | No |
| `useSessionRestore.ts` | Partial | Yes |
| `useSignatures.ts` | 0% | No |

**Overall hooks coverage: 25.23%** (mostly from `useSessionRestore` test)

### 2.5 Lib (src/lib/)

| File | Coverage | Tests? |
|------|----------|--------|
| `api.ts` | Variable | No direct test |
| `authStorage.ts` | Covered | Yes |
| `chatIntents.ts` | 0% | No |
| `errorHandler.ts` | Variable | No direct test |
| `i18n.ts` | Variable | No direct test |
| `logger.ts` | Covered | Yes |
| `navigation.ts` | 0% | No |
| `performance.ts` | Variable | No direct test |
| `query-client.ts` | 0% | No |
| `sentry.ts` | Covered | Yes |
| `sessionApi.ts` | Covered | Yes |
| `subscriptions.ts` | 0% | No |
| `supabase.ts` | Partial | No direct test |
| `utils.ts` | Partial | Partial |

**Overall lib coverage: 33.51%**

### 2.6 Utils (src/utils/)

| File | Coverage | Tests? |
|------|----------|--------|
| `authErrors.ts` | 0% | No |
| `constants.ts` | 0% | No |
| `csvParser.ts` | 0% | No |
| `currency.ts` | Covered | Yes |
| `date.ts` | Covered | Yes |
| `icalGenerator.ts` | 0% | No |
| `passwordStrength.ts` | 0% | No |
| `rateLimit.ts` | 0% | No |
| `reportGenerator.ts` | 0% | No |
| `validators.ts` | Covered | Yes |

**Overall utils coverage: 15.76%**

### 2.7 Stores (src/stores/)

| Store | Coverage | Tests? |
|-------|----------|--------|
| `authStore.ts` | Partial | Yes |
| `uiStore.ts` | 0% | No |

**Overall stores coverage: 23.31%**

### 2.8 Router (src/router/)

| File | Coverage | Tests? |
|------|----------|--------|
| `AuthGuard.tsx` | Partial | Yes |
| `index.tsx` | 0% | No |

**Overall router coverage: 8.98%**

---

## 3. Critical Gaps Identified

### 3.1 Security-Critical Gaps (P0)

| Gap | Risk | Evidence |
|-----|------|----------|
| SECURITY DEFINER functions missing `SET search_path` | SQL injection | `get_pilot_readiness_checklist()`, `validate_pilot_prerequisites()` in `20240620000064_pilot_readiness.sql` |
| No auth flow integration tests | Session hijack | `src/services/authService.ts` tested via mocks only |
| RLS drift detection untested in src | Data leak | `src/services/security/` at 70.6% |
| No route guard tests for protected routes | Unauthorized access | `src/router/index.tsx` at 0% |

### 3.2 Business-Critical Gaps (P1)

| Gap | Impact | Affected Lines |
|-----|--------|----------------|
| All 52 pages have 0% coverage | Regression risk | ~5,000 statements |
| Payroll service untested in src | Incorrect payslips | 530 statements |
| Attendance/Leave service untested in src | Incorrect attendance | 378 statements |
| Benefits service untested in src | Incorrect benefits | 212 statements |
| Compliance service untested in src | Legal violations | 341 statements |
| Offboarding service untested in src | Data cleanup failures | 479 statements |

### 3.3 Architectural Gap

**Root Cause:** Unit tests in `tests/unit/` use mock implementations that validate business rule logic but **never import the actual `src/services/` files**. This means:
- Tests pass = mocks are correct
- But src/ code could drift from mock behavior
- Coverage only measures test code, not production code

**Evidence:** `tests/unit/payroll/` has 100% coverage but `src/services/payroll/` has 0% coverage.

---

## 4. Test Quality Observations

### 4.1 Well-Tested Areas (src/ coverage > 80%)

| Area | Coverage | Notes |
|------|----------|-------|
| `services/capability/` | 100% | Fully tested |
| `services/monitoring/` | 100% | Fully tested |
| `services/notification/` | 100% | Fully tested |
| `services/platform/` | 100% | Fully tested |
| `services/quality/` | 99.8% | Near-perfect |
| `services/queue/` | 100% | Fully tested |
| `services/search/` | 100% | Fully tested |
| `services/analytics/` | 91.3% | Good |
| `services/integration/` | 98.2% | Excellent |
| `services/billing/` | 80.4% | Meets threshold |
| `components/pdf/` | 100% | Fully tested |

### 4.2 Zero-Coverage Services (src/)

These services have **unit tests but 0% source coverage** because tests mock the Supabase client:

1. `src/services/payroll/` (530 stmts)
2. `src/services/offboarding/` (479 stmts)
3. `src/services/onboarding/` (631 stmts)
4. `src/services/compliance/` (341 stmts)
5. `src/services/attendance/` (378 stmts)
6. `src/services/hris/` (377 stmts)
7. `src/services/messaging/` (298 stmts)
8. `src/services/scheduling/` (229 stmts)
9. `src/services/benefits/` (212 stmts)
10. `src/services/helpdesk/` (193 stmts)

---

## 5. Recommendations

### 5.1 Immediate (P0)

1. **Fix SECURITY DEFINER violations** in `20240620000064_pilot_readiness.sql`
   - Add `SET search_path = public` to `get_pilot_readiness_checklist()` and `validate_pilot_prerequisites()`

2. **Update vitest.config.ts** to restrict coverage to `src/` only:
   ```ts
   coverage: {
     include: ['src/**'],
     exclude: ['node_modules/', 'src/types/', '**/*.d.ts', '**/*.test.*'],
     // ...
   }
   ```

3. **Add integration tests** for critical auth paths (login, session refresh, logout)

### 5.2 Short-Term (P1)

4. **Convert mock-based tests to import real services** for:
   - `src/services/payroll/` - payroll calculations
   - `src/services/attendance/` - attendance/leave logic
   - `src/services/compliance/` - compliance workflows

5. **Add component tests** for critical pages:
   - `DashboardPage.tsx`
   - `LoginForm.tsx` (expand existing)
   - Settings pages (largest untested block: 2,555 stmts)

6. **Add hook tests** for:
   - `useAuth.ts` (authentication state)
   - `useDashboard.ts` (data fetching)
   - `useCompanyQuery.ts` (tenant isolation)

### 5.3 Long-Term (P2)

7. **Achieve 85%+ src/ coverage** on all service directories
8. **Add Playwright E2E tests** for critical user flows (currently only 5 specs)
9. **Add component tests** for all shared UI components (`src/components/ui/`)

---

## 6. Test Infrastructure

### 6.1 Configuration

```ts
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov', 'html'],
  exclude: ['node_modules/', 'src/types/', 'supabase/', '**/*.d.ts'],
  thresholds: {
    lines: 85,
    functions: 85,
    branches: 80,
  },
}
```

### 6.2 Missing Configuration

- `include: ['src/**']` - Currently missing, causing test files to be included in coverage
- `all: true` - Not set, so only imported files are counted
- Per-file thresholds - No granular thresholds for critical services

---

## 7. Appendix: Full Coverage by Directory

```
Directory                           Stmts    Branch   Funcs    Lines
---------------------------------------------------------------
src/ (all)                          38.25%   80.01%   48.82%   38.25%
src/components/ai/                  0%       0%       0%       0%
src/components/auth/                46.73%   70.76%   47.36%   46.73%
src/components/brand/               0%       0%       0%       0%
src/components/candidates/          0%       0%       0%       0%
src/components/chat/                0%       0%       0%       0%
src/components/common/              54.9%    56.25%   55.55%   54.9%
src/components/compliance/          0%       0%       0%       0%
src/components/documents/           0%       0%       0%       0%
src/components/interviews/          0%       0%       0%       0%
src/components/jobs/                64.5%    28.57%   14.28%   64.5%
src/components/layout/              17.01%   42.85%   10.52%   17.01%
src/components/offers/              0%       0%       0%       0%
src/components/onboarding/          0%       0%       0%       0%
src/components/pdf/                 100%     42.85%   100%     100%
src/components/pipeline/            0%       0%       0%       0%
src/components/reports/             0%       0%       0%       0%
src/components/search/              0%       0%       0%       0%
src/components/settings/            0%       0%       0%       0%
src/components/shared/              0%       0%       0%       0%
src/components/ui/                  12.31%   28.94%   10%      12.31%
src/hooks/                          25.23%   60.97%   30%      25.23%
src/lib/                            33.51%   74.5%    78.04%   33.51%
src/pages/ (all)                    0%       0%       0%       0%
src/router/                         8.98%    85%      40%      8.98%
src/services/ (all)                 39.81%   63.63%   60.93%   39.81%
src/stores/                         23.31%   64.7%    57.89%   23.31%
src/utils/                          15.76%   42.85%   60%      15.76%
```

---

*Generated by test coverage analysis on 2026-06-23*
*Coverage tool: Vitest v2.1.9 + V8*
