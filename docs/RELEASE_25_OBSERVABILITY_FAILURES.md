# Release 25 — Observability & Test Failure Triage

**Audit Date:** 2026-06-20
**Auditor:** opencode (automated)
**Codebase:** AdminMate AI — `adminmate-ai`

---

## Executive Summary

| Area | Status | Score |
|------|--------|-------|
| **Observability** | ⚠️ PARTIAL | 65/100 |
| **Test Suite** | ⚠️ DEGRADED | 1449/1458 pass (99.4%), **6 files / 9 tests failing** |
| **CI/CD** | ❌ NOT CONFIGURED | No GitHub Actions or pipeline found |
| **Operational Readiness** | ⚠️ PARTIAL | Runbook exists; no backup automation, no formal incident plan |

---

## TASK 1: Observability Readiness

### 1.1 Sentry — ✅ CONFIGURED (with gaps)

| Check | Status | Details |
|-------|--------|---------|
| `@sentry/react` installed | ✅ | `package.json:35` — `@sentry/react: ^10.56.0` |
| `sentry.ts` init | ✅ | `src/lib/sentry.ts:1-37` — lazy-loaded, conditional on `VITE_SENTRY_DSN` |
| `beforeSend` PII scrubbing | ✅ | Scrubs Authorization, Cookie, X-RateLimit-Key headers + user email/username/IP + URL query params |
| ErrorBoundary integration | ✅ | `src/components/common/ErrorBoundary.tsx:2` imports Sentry |
| Server-side Sentry (Edge Functions) | ✅ | `supabase/functions/_shared/sentry.ts` — REST-based capture, no-ops if `SENTRY_DSN` missing |
| DSN in `.env.example` | ✅ | `VITE_SENTRY_DSN=` documented but empty by default |

**Gaps:**
- ⚠️ **No Sentry tunnel configured** — errors go directly to Sentry servers, bypassing network security controls
- ⚠️ **DSN exposed in client bundle** — `VITE_SENTRY_DSN` is public; anyone can send fake errors
- ⚠️ **No `beforeSendBreadcrumb`** — potential PII leak through breadcrumb trail
- ⚠️ **Lazy import race condition** — `src/lib/sentry.ts:4` returns early if DSN missing; if error occurs before import completes, it's not captured
- ⚠️ **`SENTRY_DSN` not set in production env** — no-op by default; must be manually configured per `docs/launch-checklist.md:12`

### 1.2 Structured Logs — ⚠️ PARTIAL

| Check | Status | Details |
|-------|--------|---------|
| Logging framework | ❌ | No winston/pino/bunyan — uses raw `console.*` |
| Structured format | ⚠️ | Edge Functions use structured JSON via `logRequest()` in `supabase/functions/_shared/utils.ts` |
| Frontend production logs | ⚠️ | All `console.*` calls guarded by `if (import.meta.env.DEV)` — **stripped in production** |
| Edge Function structured logs | ✅ | `logRequest()` outputs `{timestamp, level, function, duration_ms, status}` |

**Gap:** No unified structured logging framework for the client side. Production error visibility depends entirely on Sentry.

### 1.3 Audit Logging — ✅ COMPREHENSIVE

| Check | Status | Details |
|-------|--------|---------|
| `audit_logs` table | ✅ | Used across 15+ services |
| Service coverage | ✅ | Auth, attendance, leave, compliance, MFA, AI recruiting, export, delete, onboarding |
| Append-only pattern | ✅ | Audit entries are insert-only; no update/delete operations |
| Sensitive action coverage | ✅ | Login, data export, data deletion, legal holds, whistleblowing, safety incidents |
| Audit log viewer | ✅ | `src/services/auditLogService.ts` — paginated query with filters + CSV export |
| Retention policy | ✅ | Configurable per subscription tier (`src/lib/subscriptions.ts:24`) — Free: 0d, Starter: 90d, Pro: 365d |

**No gaps identified.**

### 1.4 Error Tracking — ✅ CONFIGURED

| Check | Status | Details |
|-------|--------|---------|
| Client-side error boundary | ✅ | `src/components/common/ErrorBoundary.tsx` — class component with Sentry capture |
| Server-side error capture | ✅ | `supabase/functions/_shared/sentry.ts` — `captureError()` used in critical Edge Functions |
| Error logging Edge Function | ✅ | `supabase/functions/log-client-error/index.ts` — client errors reported to Supabase + rate-limited |
| localStorage fallback | ✅ | Errors buffered to localStorage when offline |

### 1.5 Health Check Endpoint — ✅ EXISTS

| Check | Status | Details |
|-------|--------|---------|
| Edge Function | ✅ | `supabase/functions/health-check/index.ts` — checks DB, Stripe, Gemini |
| Public vs Internal response | ✅ | Public: `{status, timestamp}`; Internal (via `X-Health-Check-Key`): full details with latency |
| DB connectivity check | ✅ | Queries `companies` table |
| API checks | ✅ | Stripe balance, Gemini models endpoint |
| Error handling | ✅ | Distinguishes between "error" and "skipped" for optional services |
| Frontend health page | ✅ | `src/pages/HealthPage.tsx` + e2e test `e2e/13-health.spec.ts` |

### 1.6 Rate Limiting — ✅ COMPREHENSIVE

| Check | Status | Details |
|-------|--------|---------|
| Edge Function rate limits | ✅ | `enforceRateLimit()` on all 15 critical functions (via `check_rate_limit` RPC) |
| Login rate limiting (server) | ✅ | `auth-session/login.ts:9-28` — SHA-256(email+ip) hash, 5 attempts / 15 min window |
| Login rate limiting (client) | ✅ | `src/services/authService.ts:4-8` — localStorage-based UX feedback |
| AI-specific limits | ✅ | `mate_ai_chat: 30/min`, `generate_jd: 10/min`, `parse_resume: 20/min`, `screen_resume: 20/min` |
| Export/deletion limits | ✅ | `export_user_data: 3/hour`, `delete_user_data: 1/hour` |
| Error logging rate limit | ✅ | `log-client-error: 60/min` (authenticated) or IP-based (anonymous) |

**No gaps identified.**

### 1.7 Request Correlation ID — ❌ NOT IMPLEMENTED

| Check | Status | Details |
|-------|--------|---------|
| Correlation ID header | ❌ | No `X-Request-ID` or `X-Correlation-ID` in any request |
| Edge Function request ID | ❌ | No unique request identifier in logs |
| Frontend request tracing | ❌ | No correlation between client actions and server logs |

**Recommendation:** Add `X-Request-ID` (UUID v4) to each request in `safeFetch` and propagate through Edge Functions. Critical for debugging multi-service flows.

### Observability Score Breakdown

| Capability | Weight | Score | Weighted |
|------------|--------|-------|----------|
| Sentry / Error Monitoring | 25% | 80% | 20.0 |
| Structured Logging | 15% | 40% | 6.0 |
| Audit Logging | 15% | 95% | 14.25 |
| Error Tracking | 10% | 85% | 8.5 |
| Health Checks | 10% | 90% | 9.0 |
| Rate Limiting | 15% | 95% | 14.25 |
| Correlation ID | 10% | 0% | 0.0 |
| **Total** | **100%** | | **72.0/100** |

---

## TASK 2: Test Failure Triage

**Test Results:** 1458 total — **1449 passed, 9 failed** (6 test files)

### Failure #1: `src/hooks/useSessionRestore.test.tsx` — `should set session and fetch profile on valid session`

| Field | Value |
|-------|-------|
| **Error** | `expected "spy" to be called with arguments: [ ObjectContaining{…} ]` — `mockSetSession` called 0 times |
| **Classification** | `mock_bug` |
| **Severity** | `medium` |
| **Root Cause** | The test mocks `fetchSessionStatus` returning a valid session with `access_token: 'valid-token'`, but the source code (`src/hooks/useSessionRestore.ts:21`) calls `supabase.auth.setSession()` directly (not via the mock). The mock at line 13 only mocks `setSession` from the supabase mock, but `useSessionRestore.ts` imports `supabase` from `../lib/supabase` — the test mocks `../../lib/supabase` (different relative path). The mock path doesn't match the import path, so the real `supabase` is used and `mockSetSession` is never called. |
| **Owner** | Frontend Team |
| **Action** | `fix` — Align the mock path to match `../lib/supabase` or verify the mock resolves correctly. Alternatively, mock `sessionApi.fetchSessionStatus` to avoid relying on supabase mock. |

### Failure #2: `supabase/functions/auth-session/index.test.ts` — `login handler > should return 401 when authentication fails`

| Field | Value |
|-------|-------|
| **Error** | `expected 500 to be 401` |
| **Classification** | `mock_bug` |
| **Severity** | `high` |
| **Root Cause** | The test imports `handleLogin` from `./login` and mocks `@supabase/supabase-js@2`, but the `login.ts` module also imports from `../_shared/utils.ts` (`getJsonHeaders`, `validateInput`, `logRequest`) and `../_shared/sentry.ts` (`captureError`). These shared modules are NOT mocked, causing the `createClient()` call in `login.ts:35` to use the mocked Supabase client while `Deno.env.get()` calls fail (Deno env mock is incomplete). The `createClient()` call throws because `Deno.env.get('SUPABASE_URL')` returns undefined → the error handler catches and returns 500. |
| **Owner** | Backend Team |
| **Action** | `fix` — Ensure the test mocks `Deno.env.get` to return valid values for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` before `handleLogin` runs. The existing mock at line 3-6 only covers the test file scope — the `login.ts` module creates its own client inside the function. |

### Failure #3: `supabase/functions/auth-session/index.test.ts` — `login handler > should return 200 with access token on success`

| Field | Value |
|-------|-------|
| **Error** | `expected 500 to be 200` |
| **Classification** | `mock_bug` |
| **Severity** | `high` |
| **Root Cause** | Same root cause as Failure #2 — `Deno.env.get` not accessible to `login.ts`. |
| **Owner** | Backend Team |
| **Action** | `fix` — Same fix as Failure #2. |

### Failure #4: `supabase/functions/auth-session/index.test.ts` — `login handler > should not expose refresh token in response body`

| Field | Value |
|-------|-------|
| **Error** | `Cannot read properties of undefined (reading 'refresh_token')` |
| **Classification** | `mock_bug` |
| **Severity** | `medium` |
| **Root Cause** | Cascading failure from #2/#3 — `handleLogin` returns 500, so `body.data` is undefined. Once #2 is fixed, this test should pass. |
| **Owner** | Backend Team |
| **Action** | `fix` — Fixed by fixing #2. |

### Failure #5: `tests/unit/services/authService.test.ts` — `signInWithGoogle > calls supabase OAuth with google provider`

| Field | Value |
|-------|-------|
| **Error** | Expected `redirectTo: 'http://localhost/dashboard'` but got `redirectTo: 'http://localhost/auth/callback'` |
| **Classification** | `feature_bug` |
| **Severity** | `low` |
| **Root Cause** | The test expects the old redirect URL (`/dashboard`), but the source code (`src/services/authService.ts:111`) was updated to use `/auth/callback` (correct — OAuth callbacks should go to a callback route, not the dashboard). The test is stale. |
| **Owner** | Frontend Team |
| **Action** | `fix` — Update the test assertion to expect `'http://localhost/auth/callback'`. |

### Failure #6: `tests/unit/components/JobForm.test.tsx` — `renders step 1 with title and department inputs`

| Field | Value |
|-------|-------|
| **Error** | `Unable to find an element with the placeholder text of: Senior Frontend Developer` |
| **Classification** | `mock_bug` |
| **Severity** | `medium` |
| **Root Cause** | The test looks for placeholder `'Senior Frontend Developer'` but the actual `JobForm` component uses `placeholder={t('jobs.title_placeholder')}` which renders the i18n key string `'jobs.title_placeholder'` (not the English text). The `react-i18next` mock returns the key as-is (`(k: string) => k`), so the placeholder is literally `'jobs.title_placeholder'`. |
| **Owner** | Frontend Team |
| **Action** | `fix` — Change `screen.getByPlaceholderText('Senior Frontend Developer')` to `screen.getByPlaceholderText('jobs.title_placeholder')` or mock the translation function to return the expected English text. |

### Failure #7-8: `tests/unit/components/NotificationBell.test.tsx` — both tests

| Field | Value |
|-------|-------|
| **Error** | `useNavigate() may be used only in the context of a <Router> component.` |
| **Classification** | `mock_bug` |
| **Severity** | `medium` |
| **Root Cause** | `NotificationBell` calls `useNavigate()` from `react-router-dom` (line 13 of the component), but the test renders it without a `<Router>` or `<MemoryRouter>` wrapper. The test mocks `uiStore` but not the router context. |
| **Owner** | Frontend Team |
| **Action** | `fix` — Wrap the rendered `<NotificationBell />` in `<MemoryRouter>` in the test, or mock `react-router-dom`'s `useNavigate`. |

### Failure #9: `tests/unit/components/PDFThaiFont.test.tsx` — `generates PDF with Thai text without crash`

| Field | Value |
|-------|-------|
| **Error** | `Unable to find an element with the text: Download PDF` |
| **Classification** | `mock_bug` |
| **Severity** | `low` |
| **Root Cause** | The test looks for text `'Download PDF'` but the component uses `t('pdf.download')` which, with the i18n mock returning keys, renders as `'pdf.download'`. Same pattern as the JobForm failure. |
| **Owner** | Frontend Team |
| **Action** | `fix` — Change `screen.getByText('Download PDF')` to `screen.getByText('pdf.download')`. |

### Test Failure Summary

| # | Test File | Classification | Severity | Action | Owner |
|---|-----------|---------------|----------|--------|-------|
| 1 | `useSessionRestore.test.tsx` | mock_bug | medium | fix | Frontend |
| 2 | `auth-session/index.test.ts` | mock_bug | high | fix | Backend |
| 3 | `auth-session/index.test.ts` | mock_bug | high | fix | Backend |
| 4 | `auth-session/index.test.ts` | mock_bug | medium | fix (cascade) | Backend |
| 5 | `authService.test.ts` | feature_bug | low | fix (update assertion) | Frontend |
| 6 | `JobForm.test.tsx` | mock_bug | medium | fix | Frontend |
| 7 | `NotificationBell.test.tsx` | mock_bug | medium | fix | Frontend |
| 8 | `NotificationBell.test.tsx` | mock_bug | medium | fix | Frontend |
| 9 | `PDFThaiFont.test.tsx` | mock_bug | low | fix | Frontend |

### Classification Breakdown

| Classification | Count | Description |
|---------------|-------|-------------|
| `mock_bug` | 8 | Test mocks don't match actual module structure/paths |
| `feature_bug` | 1 | Source code changed but test wasn't updated |
| `auth_bug` | 0 | — |
| `session_bug` | 0 | — |
| `test_only` | 0 | — |

**Key Pattern:** 8 of 9 failures are `mock_bug` — test mocks are misconfigured. The actual application code is likely correct. This suggests tests were written before certain implementation changes and not updated.

---

## TASK 3: Operational Readiness

### 3.1 CI/CD Pipeline — ❌ NOT CONFIGURED

| Check | Status | Details |
|-------|--------|---------|
| GitHub Actions | ❌ | No `.github/workflows/` directory found |
| GitLab CI | ❌ | No `.gitlab-ci.yml` found |
| Vercel auto-deploy | ⚠️ | `vercel.json` exists but no CI pipeline triggers it |
| Build verification | ❌ | No automated `npm run build` or `npm run test` in pipeline |
| Pre-commit hooks | ❌ | No `.husky/` or `lint-staged` configuration found |

**Risk:** All deployments are manual (`vercel --prod`). No automated quality gates before production deployment.

### 3.2 Deployment Runbook — ✅ EXISTS

| Check | Status | Details |
|-------|--------|---------|
| Runbook document | ✅ | `docs/runbook.md` — 287 lines covering deploy, rollback, secret rotation, incident response |
| Staging deploy | ✅ | `vercel` command documented |
| Production deploy | ✅ | `vercel --prod` documented |
| Edge Function deploy | ✅ | `supabase functions deploy` documented |
| Secret rotation | ✅ | Step-by-step for Gemini, Resend, LINE, WhatsApp, CRON_SECRET |
| Failed function investigation | ✅ | 4-step process with common failure modes table |

### 3.3 Rollback Procedure — ✅ DOCUMENTED

| Check | Status | Details |
|-------|--------|---------|
| Frontend rollback | ✅ | `vercel rollback` — last 10 deployments available |
| Backend rollback | ✅ | Reverse migration + `supabase db push` |
| Edge Function rollback | ✅ | `git checkout <hash>` + redeploy |
| Rollback criteria | ✅ | Documented in `PHASE-5G-BETA-LAUNCH-RUNBOOK.md` — data loss or >50% perf degradation |

### 3.4 Backup Policy — ⚠️ PARTIALLY DOCUMENTED

| Check | Status | Details |
|-------|--------|---------|
| Backup procedure | ✅ | `docs/runbook.md:193-236` — Dashboard backup + pg_dump + pg_restore |
| Automated backup | ⚠️ | Depends on Supabase plan (Pro: daily auto, Free: manual only) |
| Backup schedule | ⚠️ | Listed in launch checklist (`docs/launch-checklist.md:179`) but not enforced |
| Backup testing | ❌ | No documented backup restore verification process |
| Backup retention | ❌ | No documented retention policy |

### 3.5 Incident Response Plan — ⚠️ PARTIAL

| Check | Status | Details |
|-------|--------|---------|
| Sev classification | ✅ | 3 severity levels defined in `docs/runbook.md:266-287` |
| Sev 1 (App down) | ✅ | Check Vercel, check Supabase, rollback, notify users |
| Sev 2 (AI non-functional) | ✅ | Check quota, check API status, verify key, degrade gracefully |
| Sev 3 (Email failure) | ✅ | Check Resend dashboard, verify key, check DNS |
| On-call rotation | ❌ | Not established (`docs/launch-checklist.md:181` is unchecked) |
| Communication template | ❌ | No pre-written user notification templates |
| Post-incident review | ❌ | No documented process |

---

## Recommendations

### P0 — Before Release 25

1. **Fix all 9 test failures** — primarily mock path/dependency issues (8/9) and one stale assertion (1/9). Estimated effort: 2-4 hours.
2. **Set `SENTRY_DSN` in production env** — without it, Sentry is a no-op.
3. **Add `X-Request-ID` correlation** — critical for debugging multi-service auth flows.

### P1 — Within 2 weeks of launch

4. **Configure CI/CD pipeline** — at minimum: lint → type-check → test → build on every PR.
5. **Add Sentry tunnel** — proxy error reports through a server endpoint to avoid DSN exposure.
6. **Add `beforeSendBreadcrumb`** — prevent PII leakage through breadcrumb trail.
7. **Establish on-call rotation** — even if single-person, document the escalation path.

### P2 — Within 1 month

8. **Implement structured logging** — adopt pino/winston for client-side logging.
9. **Automate backup verification** — weekly restore-to-staging test.
10. **Create incident communication templates** — pre-approved messages for LINE/email broadcasts.

---

## Files Reference

| File | Purpose |
|------|---------|
| `docs/runbook.md` | Deployment, rollback, incident response |
| `docs/launch-checklist.md` | Pre-launch verification checklist |
| `docs/security.md` | Security baseline including Sentry config |
| `src/lib/sentry.ts` | Sentry initialization with PII scrubbing |
| `src/services/auditLogService.ts` | Audit log query/export service |
| `supabase/functions/health-check/index.ts` | Health check endpoint |
| `supabase/functions/_shared/utils.ts` | Rate limiting + structured logging |
| `supabase/functions/_shared/sentry.ts` | Server-side Sentry capture |
