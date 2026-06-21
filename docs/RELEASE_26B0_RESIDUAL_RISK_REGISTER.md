# Release 26B.0 — Residual Risk Register

**Generated:** 2026-06-21
**Gate A Scope:** All open risks from 26A series
**Policy:** No release may call itself green while any security/auth/tenant/payroll/document/billing/provider-state test is flaky or unowned.

---

## 1. Pre-Existing Unit/Integration Test Failures (9 tests, 6 files)

### RISK-001: auth-session/index.test.ts — Deno mock mismatch (3 tests)

| Field | Value |
|-------|-------|
| **File** | `supabase/functions/auth-session/index.test.ts` |
| **Tests failing** | 3 |
| **Test names** | Login handler returns 500 instead of 401/200 |
| **Root cause** | `mock_bug` — Deno mock mismatch; test environment mocks do not match actual Deno edge function behavior |
| **User impact** | None — test infrastructure only, no production impact |
| **Security impact** | Low — auth-session is a security-critical path; flaky test masks potential regressions |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | Must be resolved before 26B.1 |
| **Launch impact** | BLOCKS GREEN — auth test flaky |

---

### RISK-002: authService.test.ts — OAuth redirect URL mismatch (1 test)

| Field | Value |
|-------|-------|
| **File** | `tests/unit/services/authService.test.ts` |
| **Tests failing** | 1 |
| **Test name** | Google OAuth redirect URL mismatch (`/auth/callback` vs `/dashboard`) |
| **Root cause** | `mock_bug` — Expected URL path changed after OAuth flow refactoring; test assertion not updated |
| **User impact** | None — test assertion mismatch |
| **Security impact** | Medium — auth redirect URL correctness is security-relevant; stale assertion may hide redirect issues |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | Must be resolved before 26B.1 |
| **Launch impact** | BLOCKS GREEN — auth test flaky |

---

### RISK-003: useSessionRestore.test.tsx — Spy not called (1 test)

| Field | Value |
|-------|-------|
| **File** | `src/hooks/useSessionRestore.test.tsx` |
| **Tests failing** | 1 |
| **Test name** | Session restore hook does not call expected spy |
| **Root cause** | `mock_bug` — Session restore mock not wired correctly; hook behavior may have changed |
| **User impact** | None — test infrastructure only |
| **Security impact** | Medium — session restore is auth-adjacent; untested behavior may leave sessions in inconsistent state |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | Must be resolved before 26B.1 |
| **Launch impact** | BLOCKS GREEN — auth test flaky |

---

### RISK-004: JobForm.test.tsx — Placeholder text changed (1 test)

| Field | Value |
|-------|-------|
| **File** | `tests/unit/components/JobForm.test.tsx` |
| **Tests failing** | 1 |
| **Test name** | Placeholder text assertion (i18n key vs hardcoded string) |
| **Root cause** | `i18n_drift` — Component now uses i18n key `job.placeholder` instead of hardcoded English string |
| **User impact** | None — UI renders correctly with i18n |
| **Security impact** | None — UI component, not security-critical |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | 26B.2 |
| **Launch impact** | LOW — cosmetic test drift |

---

### RISK-005: PDFThaiFont.test.tsx — Button text changed (1 test)

| Field | Value |
|-------|-------|
| **File** | `tests/unit/components/PDFThaiFont.test.tsx` |
| **Tests failing** | 1 |
| **Test name** | Button text assertion (`pdf.download` vs `Download PDF`) |
| **Root cause** | `i18n_drift` — Button now uses i18n key instead of hardcoded English string |
| **User impact** | None — UI renders correctly |
| **Security impact** | None |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | 26B.2 |
| **Launch impact** | LOW — cosmetic test drift |

---

### RISK-006: NotificationBell.test.tsx — Missing Router wrapper (2 tests)

| Field | Value |
|-------|-------|
| **File** | `tests/unit/components/NotificationBell.test.tsx` |
| **Tests failing** | 2 |
| **Test names** | Component renders without crashing; notification count displays |
| **Root cause** | `routing_bug` — Component now requires React Router context; test lacks `<Router>` wrapper |
| **User impact** | None — component works in production with Router |
| **Security impact** | Low — notification system is user-facing but not a direct security boundary |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | 26B.1 |
| **Launch impact** | LOW — missing test wrapper |

---

## 2. Flaky REST API Integration Tests (2 tests)

### RISK-007: release26a52 — G5 cross-tenant timing (1 test)

| Field | Value |
|-------|-------|
| **File** | `tests/integration/release26a52.deterministic-rls.test.ts` |
| **Tests failing** | 1 of 22 |
| **Test name** | `G5: Company B token CANNOT read Company A data (deterministic)` |
| **Root cause** | `timing_bug` — Vitest/Supabase auth flow timing causes intermittent auth token mismatch; passes when tested directly via Node.js HTTP |
| **User impact** | None — cross-tenant blocking proven at 3 layers (pgTAP 220/220, direct HTTP 19/19, REST 21/22) |
| **Security impact** | Low — proven via direct HTTP and pgTAP; vitest flakiness is test-infrastructure issue |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | Must be resolved before 26B.1 |
| **Launch impact** | BLOCKS GREEN — REST test flaky on security-critical cross-tenant boundary |

---

### RISK-008: release26a51 — REST CRUD privacy timing (1 test)

| Field | Value |
|-------|-------|
| **File** | `tests/integration/release26a51.rest-crud-privacy.integration.test.ts` |
| **Tests failing** | 1 of 49 |
| **Test name** | Cross-tenant CRUD privacy check (timing-dependent) |
| **Root cause** | `timing_bug` — Vitest auth flow timing; same root cause as RISK-007 |
| **User impact** | None — proven elsewhere |
| **Security impact** | Low — same mitigation as RISK-007 |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | Must be resolved before 26B.1 |
| **Launch impact** | BLOCKS GREEN — REST test flaky on security boundary |

---

## 3. P1 Security Findings (26A.6)

### RISK-009: SECURITY DEFINER functions missing `search_path` (6 functions)

| Field | Value |
|-------|-------|
| **Finding** | 6 SECURITY DEFINER functions lack `SET search_path = public` |
| **Functions affected** | `get_public_job()`, `check_usage_limit()`, `is_platform_admin()`, `has_support_access()`, `check_module_entitlement()`, `revoke_expired_support_grants()` |
| **Root cause** | `security_gap` — Functions created without hardened search_path |
| **User impact** | Potential privilege escalation if attacker creates malicious objects in schema search path |
| **Security impact** | CRITICAL — CWE-732 (Incorrect Permission Assignment); PostgreSQL privilege escalation vector |
| **CWE** | CWE-732 |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | Must be resolved before 26B.1 |
| **Launch impact** | BLOCKS GREEN — security/auth test category; CRITICAL finding |

---

### RISK-010: Views missing `security_invoker` (4 views)

| Field | Value |
|-------|-------|
| **Finding** | 4 analytics views default to `security_definer` behavior |
| **Views affected** | `v_message_stats_daily`, `v_active_conversations`, `v_queue_health`, `v_platform_health` |
| **Root cause** | `security_gap` — Views created without `SECURITY INVOKER` clause |
| **User impact** | Views may expose cross-company data when queried by authenticated users |
| **Security impact** | CRITICAL — Views run as owner (superuser) instead of invoking user; bypasses RLS |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | Must be resolved before 26B.1 |
| **Launch impact** | BLOCKS GREEN — security test category; tenant isolation boundary |

---

### RISK-011: Migration drift risk (43 files)

| Field | Value |
|-------|-------|
| **Finding** | 43 historical migration files edited during 26A remediation |
| **Files affected** | `000060`–`000105` (all 26A enterprise feature migrations) + 4 new 26A files |
| **Root cause** | `migration_drift` — Files modified in-place after initial creation; remote may have old versions |
| **User impact** | `supabase db reset` may apply corrected local versions diverging from remote |
| **Security impact** | HIGH — RLS policy corrections in these migrations; drift means remote may lack tenant isolation fixes |
| **Mitigation** | Forward-fix migration (`000053_migration_reconciliation.sql`) exists |
| **Owner** | TBD |
| **Due date** | TBD |
| **Expiry** | Must be resolved before production deploy |
| **Launch impact** | BLOCKS GREEN — tenant/payroll/document categories; drift may revert security fixes |

---

## 4. Summary Dashboard

| Category | Risk Count | Open | Fixed | Launch Blockers |
|----------|-----------|------|-------|-----------------|
| **Unit/Integration test failures** | 6 | 6 | 0 | 4 (auth/tenant/security) |
| **Flaky REST tests** | 2 | 2 | 0 | 2 (security boundary) |
| **P1 Security findings** | 3 | 3 | 0 | 3 (security/tenant) |
| **TOTAL** | **11** | **11** | **0** | **9** |

---

## 5. Launch Impact Matrix

| Risk | Security | Auth | Tenant | Payroll | Document | Billing | Provider-State | Blocks GREEN? |
|------|----------|------|--------|---------|----------|---------|---------------|---------------|
| RISK-001 | ⚠️ | ✅ | — | — | — | — | — | ✅ YES |
| RISK-002 | ⚠️ | ✅ | — | — | — | — | — | ✅ YES |
| RISK-003 | ⚠️ | ✅ | — | — | — | — | — | ✅ YES |
| RISK-004 | — | — | — | — | — | — | — | ❌ No |
| RISK-005 | — | — | — | — | — | — | — | ❌ No |
| RISK-006 | — | ⚠️ | — | — | — | — | — | ❌ No |
| RISK-007 | ✅ | — | ✅ | — | — | — | — | ✅ YES |
| RISK-008 | ✅ | — | ✅ | — | — | — | — | ✅ YES |
| RISK-009 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ YES |
| RISK-010 | ✅ | — | ✅ | — | — | — | — | ✅ YES |
| RISK-011 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ YES |

---

## 6. Policy Declaration

```
RELEASE GREEN POLICY — Release 26B.0

No release may declare itself GREEN while ANY of the following is true:

1. Any security test is flaky or unowned
2. Any auth test is flaky or unowned
3. Any tenant-isolation test is flaky or unowned
4. Any payroll test is flaky or unowned
5. Any document test is flaky or unowned
6. Any billing test is flaky or unowned
7. Any provider-state test is flaky or unowned
8. Any P1 security finding is unowned
9. Any CRITICAL security finding is open without mitigation

This policy is immutable for the 26B release train.
```

---

*Generated by OpenCode AI — Release 26B.0 Residual Risk Register*
