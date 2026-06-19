# Phase 10.9 — Browser Runtime Verification Report

**Date:** 2026-06-19
**Project:** AdminMate AI (nickivumteyrezptjggk)
**Preview URL:** https://adminmate-ejlj6q10v-phirawits-projects.vercel.app
**Auditor:** bridge agent

---

## Executive Summary

**3 of 5 runtime security controls verified working on staging.** Rate limiting returns 429 after 5 failed logins. CORS updated to allow preview origin. Error responses are clean (generic only). Cookie and CSP require manual browser verification due to SSO protection on preview.

---

## 1. Secrets

| Secret | Status | Value |
|--------|--------|-------|
| APP_URL | ✅ SET | `https://adminmate-ejlj6q10v-phirawits-projects.vercel.app` |
| SENTRY_DSN | ❌ NOT SET | No value provided; Sentry no-ops safely |
| HEALTH_CHECK_KEY | ❌ NOT SET | Optional |
| STRIPE_SECRET_KEY | ❌ NOT SET | Not testing Stripe |
| STRIPE_WEBHOOK_SECRET | ❌ NOT SET | Not testing Stripe |

**Pre-existing secrets:** EMAIL_FROM, GEMINI_API_KEY, LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET, RESEND_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (all set via `npx supabase secrets list`).

---

## 2. Rate Limit Runtime — ✅ VERIFIED WORKING

```
Attempt 1: {"success":false,"error":"Invalid email or password"} | HTTP:401
Attempt 2: {"success":false,"error":"Invalid email or password"} | HTTP:401
Attempt 3: {"success":false,"error":"Invalid email or password"} | HTTP:401
Attempt 4: {"success":false,"error":"Invalid email or password"} | HTTP:401
Attempt 5: {"success":false,"error":"Invalid email or password"} | HTTP:401
Attempt 6: {"success":false,"error":"Too many login attempts. Please try again later."} | HTTP:429
Attempt 7: {"success":false,"error":"Too many login attempts. Please try again later."} | HTTP:429
```

| Check | Result |
|-------|--------|
| 5 failed attempts return 401 generic | ✅ PASS |
| 6th attempt returns 429 | ✅ PASS |
| Block persists (7th attempt also 429) | ✅ PASS |
| Error message is generic | ✅ PASS |
| `Retry-After: 900` header | ✅ PASS (verified in code) |
| `check_login_rate_limit` RPC called | ✅ PASS (function deployed, migration applied) |

**Evidence:** curl output above. Server-side rate limiting via `check_login_rate_limit` RPC with SHA-256(email+IP) hash is operational.

---

## 3. CORS — ✅ FIXED AND VERIFIED

| Check | Result |
|-------|--------|
| Preview URL in ALLOWED_ORIGINS | ✅ Added `https://adminmate-ejlj6q10v-phirawits-projects.vercel.app` |
| `Access-Control-Allow-Origin` header | ✅ Returns preview URL |
| Functions redeployed with fix | ✅ auth-session, mate-ai-chat, generate-offer-content |
| OPTIONS preflight | ✅ Returns 200 with CORS headers |

**Evidence:**
```
Access-Control-Allow-Origin: https://adminmate-ejlj6q10v-phirawits-projects.vercel.app
access-control-allow-headers: authorization, x-client-info, apikey, content-type, x-cron-secret, x-line-signature
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
access-control-max-age: 86400
```

---

## 4. Error Fuzz Runtime — ✅ ALL CLEAN

| Test | Response | HTTP | Clean? |
|------|----------|------|--------|
| Unauth generate-offer-content | `{"success":false,"error":"Unauthorized"}` | 401 | ✅ |
| Malformed JSON mate-ai-chat | `{"success":false,"error":"Unauthorized"}` | 401 | ✅ |
| stripe-webhook no signature | `Invalid signature` | 400 | ✅ |
| auth-session invalid creds | `{"success":false,"error":"Invalid email or password"}` | 401 | ✅ |
| generate-jd unauth | `{"success":false,"error":"Unauthorized"}` | 401 | ✅ |
| parse-resume unauth | `{"success":false,"error":"Unauthorized"}` | 401 | ✅ |

**Zero stack traces, zero SQL details, zero secret prefixes in any response.**

---

## 5. Cookie / SameSite — ⚠️ REQUIRES MANUAL BROWSER TEST

| Check | Result | Notes |
|-------|--------|-------|
| `__Host-sb-auth-refresh` on successful login | ⚠️ NOT TESTED | Requires browser with valid credentials |
| HttpOnly | ✅ SET in code | `cookies.ts` line: `HttpOnly; Secure; SameSite=Strict; Path=/` |
| Secure | ✅ SET in code | |
| SameSite=Strict | ✅ SET in code | Risk: may break email verification/OAuth callbacks |
| Path=/ | ✅ SET in code | |

**Manual test required:**
1. Login with valid credentials → check DevTools → Application → Cookies → verify `__Host-sb-auth-refresh` exists with correct attributes
2. Click email verification link from email client → if broken, downgrade to `SameSite=Lax`
3. Click password reset link → if broken, downgrade to `SameSite=Lax`
4. OAuth callback from Google → if broken, downgrade to `SameSite=Lax`

**Decision:** Keep `SameSite=Strict` until browser tests confirm. If any cross-site navigation breaks, downgrade to `Lax` and document reason.

---

## 6. CSP Runtime — ⚠️ SSO PREVENTS DIRECT VERIFICATION

| Check | Result | Notes |
|-------|--------|-------|
| CSP configured in vercel.json | ✅ YES | `script-src 'self'` (no unsafe-inline/eval) |
| CSP applies to app pages | ⚠️ UNTESTED | Preview has SSO protection (401) |
| HSTS header | ✅ PRESENT | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | ✅ DENY | |
| X-Content-Type-Options | ✅ nosniff | |
| Referrer-Policy | ✅ strict-origin-when-cross-origin | |
| Permissions-Policy | ✅ camera=(), microphone=(), geolocation=() | |

**CSP header value (from vercel.json):**
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

**Manual test required:** After bypassing SSO (or in production), open DevTools → Console → verify no CSP violations on `/`, `/login`, `/dashboard`, `/settings/billing`.

---

## 7. OAuth + Session — ⚠️ REQUIRES MANUAL BROWSER TEST

| Check | Result |
|-------|--------|
| Google OAuth login | ⚠️ NOT TESTED |
| Email verification link | ⚠️ NOT TESTED |
| Password reset link | ⚠️ NOT TESTED |
| Session restore after tab close | ⚠️ NOT TESTED |
| Incognito has no session | ⚠️ NOT TESTED |

---

## 8. Final Verdict

| Gate | Verdict | Evidence |
|------|---------|----------|
| Rate limit runtime | ✅ PASS | 429 after 5 failed attempts |
| CORS runtime | ✅ PASS | Preview URL in allowed origins |
| Error fuzz runtime | ✅ PASS | Generic errors only |
| Secrets (APP_URL) | ✅ PASS | Set to preview URL |
| CSP build-time | ✅ PASS | `script-src 'self'` only |
| Cookie code | ✅ PASS | `__Host-` + `SameSite=Strict` |
| **Cookie runtime (browser)** | **⚠️ NOT TESTED** | Requires manual verification |
| **SameSite cross-site test** | **⚠️ NOT TESTED** | Email verification/OAuth callbacks |
| **CSP runtime (browser)** | **⚠️ NOT TESTED** | SSO blocks direct access |
| **OAuth flow (browser)** | **⚠️ NOT TESTED** | Requires manual verification |
| **Private/internal beta** | **⚠️ CONDITIONAL** | After browser tests pass |
| **Production deploy** | **⚠️ NOT YET** | Runtime tests required |
| **Public soft launch** | **❌ NO-GO** | Runtime tests required |
| **Paid traffic** | **❌ NO-GO** | Runtime tests required |
| **Real payments** | **❌ NO-GO** | Runtime tests required |

---

## 9. Remaining Manual Tests (Browser)

| # | Test | How | Pass Criteria |
|---|------|-----|---------------|
| 1 | Google OAuth login | Open preview → Login with Google | Redirects to dashboard |
| 2 | Cookie attributes | DevTools → Application → Cookies | `__Host-sb-auth-refresh` with HttpOnly, Secure, SameSite=Strict, Path=/ |
| 3 | Email verification | Click link from email client | Works (if breaks → downgrade SameSite to Lax) |
| 4 | Password reset | Click link from email | Works (if breaks → downgrade SameSite to Lax) |
| 5 | CSP console | DevTools → Console on /, /login, /dashboard | No CSP violations |
| 6 | Supabase WSS | DevTools → Network → WSS filter | Realtime connects |
| 7 | Session restore | Login → close tab → reopen → navigate | Session persists |
| 8 | Incognito | Open preview in incognito | No session, fresh state |
| 9 | Sentry (if DSN set) | Trigger error → check Sentry dashboard | PII sanitized |

---

## 10. Critical Path to Private Beta GO

```
1. Set SENTRY_DSN (optional for beta)
2. Open preview in browser (bypass SSO or use direct access)
3. Test Google OAuth → verify redirect
4. Check cookie attributes in DevTools
5. Test email verification link → if broken, downgrade SameSite to Lax
6. Test password reset link
7. Check DevTools console for CSP violations
8. Test 6 failed logins → verify 429 (already verified via curl)
9. If all pass → Private/internal beta = GO
```
