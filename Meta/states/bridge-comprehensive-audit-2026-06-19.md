# Bridge: Comprehensive Audit Report
**Date:** 2026-06-19
**Scope:** Full-stack audit — Security, Code Quality, Architecture, Infrastructure, AI, Database, Agent Config  
**Agents Delegated:** auditor, gsd-codebase-mapper, general (×2), researcher  
**Status:** ✅ Complete

---

## 🏆 OVERALL PROJECT HEALTH

| Category | Score | Verdict |
|----------|-------|---------|
| **Security** | C+ | Strong RLS & auth foundations; critical CSP, error leak, rate-limit gaps |
| **Code Quality** | C+ | Functional but significant tech debt (dead code, type escapes, ~7% test coverage) |
| **Architecture** | B | Well-layered (services/hooks/components/pages), but no memo, ESLint minimal |
| **Infrastructure** | C+ | CI/CD exists, Docker missing, Supabase config skeletal, server monitoring absent |
| **Database** | B- | 60+ clean migrations, strong RLS, but schema drift, N+1 query, dual notification table |
| **AI Integration** | B+ | 5 live Gemini functions, good auth/rate-limit, partial prompt injection guards |
| **Messaging (LINE/WA)** | B+ | HMAC, idempotency, multi-tenant, but fail-open when secrets missing |
| **Agent Config** | D | AGENTS.md (8 lines), CLAUDE.md (7 lines) — skeletal |
| **Obsidian Vault** | B | Meta/states functional, no MOC, no tag taxonomy, no cross-links |
| **Testing** | D+ | 7 test files for 94 source modules (~7.4%), 172 E2E tests pass 100% ✅ |

---

## 🔴 CRITICAL FINDINGS (Fix Immediately)

### C-1: CSP Allows `unsafe-inline` + `unsafe-eval` (XSS Mitigation Broken)
- **File:** `vercel.json` line 23
- **Impact:** Nullifies CSP as XSS defense. Any stored XSS in CV data, AI output, candidate names is exploitable
- **Fix:** Remove both, use nonces for inline scripts

### C-2: All Edge Functions Leak Internal Error Messages
- **Files:** `stripe-webhook`, `stripe-checkout`, and raw catch blocks in 18 functions
- **Impact:** Stripe secret key prefixes, stack traces, internal IDs leaked to client
- **Fix:** Replace all `error.message` returns with `sanitizeError(error)`

### C-3: Client-Side Rate Limiting Trivially Bypassable
- **File:** `src/services/authService.ts` — stores in `window.localStorage`
- **Impact:** Brute-force unlimited via incognito/localStorage clear
- **Fix:** Move rate limiting to server-side Edge Function

### C-4: Auth Cookie Missing `__Host-` Prefix + Uses `SameSite=Lax`
- **File:** `supabase/functions/auth-session/cookies.ts`
- **Impact:** Subdomain cookie overwrite, CSRF via top-level GET navigation
- **Fix:** `__Host-` prefix + `SameSite=Strict`

### C-5: `generate-offer-content` Lacks Company Ownership Check
- **Impact:** Any authenticated user can read any offer by ID
- **Fix:** Add company_id verification before fetching offer data

---

## 🟠 HIGH FINDINGS (Fix This Week)

### Security
1. Stripe webhook HMAC comparison non-constant-time
2. LINE webhook fail-open when secret not configured
3. Supabase service_role used in all 18 functions (any compromise = full DB access)
4. `authStore.ts` passes empty `refresh_token` to `setSession()`
5. `pdpaService.getConsentHistory()` UUID-vs-email comparison bug — always returns empty
6. `candidateService.getAll()` N+1 query — loads ALL applications per candidate
7. Notifications dual schema conflict (two different `notifications` table definitions)
8. No server-side Sentry on any Edge Function

### Code Quality
9. `src/lib/api.ts` (227 lines) — **100% dead code**, zero consumers
10. `Record<string, unknown>` in 42+ places — primary type safety escape hatch
11. 16/17 hooks untested, 0/30 pages tested, 0/19 UI components tested
12. 4x duplicate auth/profile fetch logic across `authStore`, `useAuth`, `useSessionRestore`

### AI
13. Prompt injection guards missing in `parse-resume` and `generate-jd`
14. `generate-jd` missing input validation on `location`, `employmentType`, `experienceLevel`

### Database
15. `pdpaService.deleteUserData()` runs client-side — should be SECURITY DEFINER RPC
16. `offers.job_id` FK missing index
17. Dashboard MV refresh on every write (statement-level trigger) — scaling bottleneck

---

## 🟡 MEDIUM FINDINGS (Fix This Sprint)

1. **CORS**: Hardcoded ALLOWED_ORIGINS in `utils.ts` — no env variable support
2. **Vault**: Supabase Vault migration incomplete (`20240105000004-07`)
3. **Data retention**: No TTL cleanup on `audit_logs`, `ai_usage_log`, `webhook_events`
4. **PDPA**: Third-party IP lookup via ipify.org (`PDPAConsentBanner.tsx`)
5. **Passwords**: No brute-force protection on password reset flow
6. **Session**: No idle session timeout
7. **CSV injection**: Incomplete sanitization (`pdpaService.ts`)
8. **Company ID enumeration**: `checkAILimit` returns different errors for "not found" vs "limit exceeded"
9. **Indonesian locale**: Missing entire `chat.json` translation file
10. **ESLint**: Only `typescript-eslint/recommended` — missing react-hooks, a11y, import rules
11. **React.memo**: Zero usage — every component re-renders on parent render
12. **Zod**: In dependencies but unused for runtime API validation
13. **`messaging-hub`**: Unbounded `limit` parameter (no max clamp)
14. **Edge function responses**: Missing `X-Content-Type-Options`, `X-Frame-Options` headers
15. **`rate_limits`**: No UNIQUE constraint on `(company_id, feature)` for conflict handling
16. **`APP_URL`**: Defaults to `localhost:5173` if env var missing in production

---

## 🟢 LOW FINDINGS (Tech Debt)

1. HSTS only on main domain, not preview deployments
2. `select('*')` in `stripe-checkout` returns all company columns unnecessarily
3. `update_updated_at()` trigger function defined twice in migrations
4. `safe_user_company_id()` defined twice (harmless but duplicate)
5. 40+ migration files — RLS evolution chain could be consolidated
6. `companies.subscription_tier` is dual source of truth with `subscriptions` table
7. No `DOWN` migration scripts (acceptable given idempotency)
8. Missing `X-DNS-Prefetch-Control` header
9. `tracesSampleRate: 0.1` has no dynamic sampling config
10. Zero `beforeSendBreadcrumb` in Sentry config — potential PII leak through breadcrumbs

---

## ✅ POSITIVES & STRENGTHS

### Security
- ✅ Well-designed RLS with company-scoped isolation + null-bypass properly fixed
- ✅ All 18 edge functions have server-side rate limiting
- ✅ SSRF guard in `parse-resume` (URL prefix validation)
- ✅ Webhook idempotency for Stripe, LINE, WhatsApp
- ✅ MFA with hash-stored backup codes + audit logging
- ✅ File upload validation (MIME, size, UUID, filename sanitization)
- ✅ 26+ PHASE reports showing rigorous launch process
- ✅ Vercel headers include HSTS (2y, preload), X-Frame-Options DENY, Permissions-Policy

### Architecture
- ✅ Clean separation: services / hooks / components / pages / stores
- ✅ Zustand for UI/auth state, TanStack Query for server state — correct split
- ✅ React Router v7 with lazy loading and AuthGuard pattern
- ✅ DOMPurify on all AI-rendered content
- ✅ i18next with 4 languages (EN/TH/ID/VI) + ZH
- ✅ Error boundary and graceful error states throughout

### Database
- ✅ 60+ idempotent migrations with chronological naming
- ✅ `pg_trgm` GIN index for fuzzy search on candidate names
- ✅ `SKIP LOCKED` in queue processor (deadlock prevention)
- ✅ Materialized view for dashboard with concurrent refresh
- ✅ Comprehensive seed data (5 jobs, 20 candidates, 30 applications, 10 interviews)
- ✅ Audit triggers on 6 critical tables
- ✅ 40+ well-designed indexes including partial + composite covering indexes

### Testing
- ✅ 172 E2E tests passing 100% (auth, security, dark-mode, mobile, a11y, all features)
- ✅ Playwright with 2FA, storageState, parallel workers
- ✅ Chaos tests for database, integration, messaging, webhooks
- ✅ Vitest with 85/85/80 line/function/branch coverage thresholds configured
- ✅ Dedicated E2E regression screenshots captured automatically

### AI & Messaging
- ✅ `mate-ai-chat` has 6-rule critical instruction guard + rate limiting + subscription gating
- ✅ LINE/WhatsApp both have HMAC verification, idempotency, multi-tenant token management
- ✅ Resend email has template allowlist + HTML escaping + input validation
- ✅ Country-specific AI context (THB/VND/IDR salary suggestions, labor law references)

### CI/CD & Deployment
- ✅ 3 GitHub Actions workflows: CI (quality + deploy), CI/CD (full pipeline), Weekly Security Scan
- ✅ Vercel config with security headers, SPA rewrite, immutable asset caching
- ✅ husky pre-commit hooks configured

---

## 🔧 SAVE THE BRIDGE STATE

<bridge_state>
{
  "agent": "bridge",
  "project": "adminmate-ai",
  "audit_date": "2026-06-19",
  "agents_delegated": ["auditor", "gsd-codebase-mapper", "researcher", "general-x2"],
  "status": "comprehensive-audit-complete",
  "critical_count": 5,
  "high_count": 17,
  "medium_count": 16,
  "low_count": 10,
  "total_findings": 48,
  "artifacts_produced": [
    "Meta/states/bridge-comprehensive-audit-2026-06-19.md"
  ],
  "next_actions": [
    "Create opencode.json with project-specific agent roles",
    "Rewrite AGENTS.md with full multi-agent protocol",
    "Rewrite CLAUDE.md with project context, stack, conventions, gotchas",
    "Fix critical CSP and error leak issues",
    "Move rate limiting to server-side",
    "Add prompt injection guards to parse-resume and generate-jd",
    "Fix generate-offer-content ownership check",
    "Add server-side Sentry to edge functions",
    "Remove dead code src/lib/api.ts"
  ]
}
</bridge_state>
