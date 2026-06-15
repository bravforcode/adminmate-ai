# Infrastructure & Configuration Security Audit

**Project:** AdminMate AI
**Date:** 2026-06-12
**Scope:** package.json, vite.config.ts, vercel.json, tsconfig.json, eslint.config.mjs, playwright.config.ts, vitest.config.ts, supabase/config.toml, .env.example, .env.local, metadata.json, index.html, src/main.tsx, supabase Edge Functions

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| HIGH     | 5 |
| MEDIUM   | 5 |
| LOW      | 6 |

---

## CRITICAL FINDINGS

### C-01: Missing Content Security Policy (CSP) Header

**File:** `vercel.json:15-23`
**Risk:** Any XSS vulnerability in the app can be exploited with no CSP mitigation. An attacker who achieves script injection can exfiltrate auth tokens, session data, and PII.

The `vercel.json` headers block sets `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, and `Permissions-Policy` but **omits Content-Security-Policy entirely**.

**Remediation:** Add a strict CSP header:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://o450000.ingest.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
}
```

> **Note:** The inline `<script>` in `index.html:17-25` (dark mode toggle) requires either `'unsafe-inline'` or a nonce/hash. Prefer nonce-based CSP.

---

### C-02: Missing HTTP Strict-Transport-Security (HSTS) Header

**File:** `vercel.json:15-23`
**Risk:** Without HSTS, an active MITM attacker can downgrade users from HTTPS to HTTP, intercepting all traffic including auth tokens and API requests.

The `vercel.json` headers contain no `Strict-Transport-Security` header.

**Remediation:** Add:
```json
{
  "key": "Strict-Transport-Security",
  "value": "max-age=63072000; includeSubDomains; preload"
}
```

---

### C-03: supabase/config.toml — Minimal Configuration With No Security Settings

**File:** `supabase/config.toml` (11 lines total)
**Risk:** The database, API, auth, and runtime operate with default unhardened settings, exposing the project to abuse.

The config file only sets project_id, ports, `enable_signup = true`, and edge runtime. Missing entirely:
- JWT expiry configuration
- Auth rate limiting
- SMTP/email verification settings
- Session management (refresh token rotation, reuse interval)
- CORS restrictions on the API
- Webhook secrets
- DB connection pool limits

**Remediation:** Add full configuration:
```toml
[auth]
enable_signup = true
# JWT
[auth.jwt]
exp = 3600  # 1 hour

[auth.sessions]
timebox = 86400  # 24 hours
inactivity_timeout = 1800  # 30 min

[auth.email]
enable_confirmations = true
secure_email_change = true

[auth.rate_limit]
# Per-IP
[auth.rate_limit.email_send]
enabled = true
max_requests = 3
window_size = 60  # seconds

[auth.rate_limit.token_refresh]
enabled = true
max_requests = 10
window_size = 60

[api.cors]
enabled = true
origins = ["https://adminmate.ai", "https://www.adminmate.ai", "http://localhost:5173"]

[webhook]
enabled = false
```

---

### C-04: Real Supabase Credentials in .env.local on Disk

**File:** `.env.local:1-2`
**Risk:** While `.gitignore` properly excludes `.env.local`, the file contains live production-level credentials: a real Supabase project URL and a valid JWT anon key. Anyone with local filesystem access (or via tooling that reads `.env.local`) can use the anon key.

The anon key is a JWT: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pY2tpdnVtdGV5cmV6cHRqZ2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Njk2ODYsImV4cCI6MjA5NjA0NTY4Nn0...` — this exposes the project ref (`nickivumteyrezptjggk`).

**Remediation:**
1. Rotate the Supabase anon key immediately.
2. Use a separate Supabase project for local development or ensure the key has minimal RLS-permissive access.
3. Consider using an encrypted secrets manager or `.env.local.encrypted` workflow.

---

## HIGH FINDINGS

### H-01: Rate Limit Fails Open on Database Error

**File:** `supabase/functions/_shared/utils.ts:100-103`
**Risk:** If the `check_rate_limit` RPC call fails (DB down, permission error, network issue), the function logs the error and **allows the request through** (`return true`). This means rate limiting is disabled during any database degradation.

```typescript
if (error) {
  console.error('Rate limit check failed, failing open:', error)
  return true  // FAILS OPEN
}
```

**Remediation:** Change to fail closed — deny the request when rate limiting cannot be verified:
```typescript
if (error) {
  console.error('Rate limit check failed, denying request:', error)
  return false  // FAIL CLOSED — or throw an error
}
```

---

### H-02: WhatsApp Webhook Uses LINE Channel Secret as Fallback for Signature Verification

**File:** `supabase/functions/whatsapp-webhook/index.ts:51`
**Risk:** If `WHATSAPP_APP_SECRET` is not set, the code falls back to `LINE_CHANNEL_SECRET` for WhatsApp payload verification. These are completely different secrets for different platforms. An attacker who knows the LINE secret (e.g., via LINE webhook testing) could forge WhatsApp webhook payloads.

```typescript
const secret = Deno.env.get('WHATSAPP_APP_SECRET') || Deno.env.get('LINE_CHANNEL_SECRET') || ''
```

**Remediation:** Remove the fallback. Require `WHATSAPP_APP_SECRET` explicitly:
```typescript
const secret = Deno.env.get('WHATSAPP_APP_SECRET')
if (!secret) {
  logRequest({ function: FN, durationMs: Date.now() - start, status: 500, error: 'WHATSAPP_APP_SECRET not configured' })
  return new Response('Server error', { status: 500 })
}
```

---

### H-03: No JWT Expiry or Auth Security Configuration

**File:** `supabase/config.toml` (missing `[auth.jwt]` and `[auth.sessions]`)
**Risk:** Supabase default JWT expiry is 1 hour, but without explicit configuration, this could change between versions. More critically, refresh token rotation, session timeboxing, and inactivity timeouts are not configured, meaning stolen refresh tokens could be reused indefinitely.

**Remediation:** See C-03 remediation. Add `[auth.jwt]`, `[auth.sessions]` with explicit short timeouts.

---

### H-04: Deprecated Wildcard CORS Headers Still in Use

**File:** `supabase/functions/_shared/utils.ts:29-35`
**Risk:** The deprecated `corsHeaders` and `JSON_HEADERS` exports use `Access-Control-Allow-Origin: '*'`. Any Edge Function that still uses these (e.g., `send-email/index.ts:104` in its error handler, `whatsapp-webhook/index.ts:12,131`, `line-webhook/index.ts:13,121`) exposes the endpoint to cross-origin requests from any domain.

```typescript
/** @deprecated Use getCorsHeaders(req) instead. Kept for backward compatibility. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',  // WILDCARD
  ...
}
```

**Remediation:**
1. Remove all uses of deprecated `corsHeaders`/`JSON_HEADERS`.
2. Replace every usage with the origin-validating `getCorsHeaders(req)`.
3. Add lint rule to ban usage of wildcard CORS headers.

---

### H-05: Third-Party Google Fonts CSS Loaded Without Integrity or Crossorigin

**File:** `index.html:13`
**Risk:** The Google Fonts stylesheet is loaded from an external CDN without `integrity` (SRI) or `crossorigin` attributes. If Google Fonts CDN is compromised, malicious CSS could be injected that exfiltrates data or modifies page layout for phishing.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@400;600&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" />
```

**Remediation:** Add SRI hash and crossorigin attribute, or self-host the fonts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="..." crossorigin="anonymous" />
```

Self-hosting is the most secure approach (eliminates the third-party dependency entirely).

---

## MEDIUM FINDINGS

### M-01: Dev Server Exposed on All Network Interfaces

**File:** `package.json:7`
**Risk:** The dev script `vite --port=5173 --host=0.0.0.0` binds to all network interfaces. On shared or corporate networks, other machines on the same LAN can access the dev server. If `VITE_DEMO_MODE=true` (set in `.env.local`), this could expose unauthenticated access.

```json
"dev": "vite --port=5173 --host=0.0.0.0",
```

**Remediation:** Remove `--host=0.0.0.0` or restrict to localhost:
```json
"dev": "vite --port=5173 --host=127.0.0.1",
```

---

### M-02: TypeScript Paths Misconfigured — `@/*` Resolves to Project Root, Not `src/`

**File:** `tsconfig.json:19-22`
**Risk:** The `paths` mapping `"@/*": ["./*"]` resolves `@/` to the project root (e.g., `@/package.json`), not `./src/`. However, Vite's alias correctly maps `@/` to `./src`. This discrepancy means:

- TypeScript will NOT flag imports like `import x from '@/some-file-outside-src'` as errors during type-checking
- A malicious or accidental import could reference files outside `src/` (e.g., configuration files)

```json
"paths": {
  "@/*": ["./*"]    // BUG: should be ["./src/*"]
}
```

**Remediation:** Fix the path mapping:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

---

### M-03: Playwright Captures Videos and Traces on Failure — May Contain Sensitive Data

**File:** `playwright.config.ts:13-14`
**Risk:** `video: 'retain-on-failure'` and `trace: 'retain-on-failure'` record full test sessions including screenshots, network requests/responses, and console logs. If tests exercise features involving PII (employee names, emails, salary data), these artifacts will contain that data.

```typescript
screenshot: 'only-on-failure',
trace: 'retain-on-failure',
video: 'retain-on-failure',
```

**Remediation:**
1. Add `test-results/` and `playwright-report/` to `.gitignore` (already done — verified).
2. Add a CI-only environment variable check to disable traces on production-like data.
3. Add a cleanup script that wipes test artifacts after CI runs.

---

### M-04: Cron Secret Environment Variable Name Mismatch

**File:** `supabase/functions/generate-scheduled-reports/index.ts:24` vs `supabase/functions/.env.example:27`
**Risk:** The function checks `CRON_SECRET` but the example env file documents `CRON_SECRET_KEY`. If deployed with the key from the example, the cron check would always fail (401), silently disabling scheduled report generation.

```typescript
const expectedSecret = Deno.env.get('CRON_SECRET')          // checks CRON_SECRET
// .env.example says: CRON_SECRET_KEY=generate-a-long-random-string  // documents CRON_SECRET_KEY
```

**Remediation:** Align the variable name — either change the function to use `CRON_SECRET_KEY` or update the example to use `CRON_SECRET`.

---

### M-05: Inline Script in index.html Would Break CSP

**File:** `index.html:17-25`
**Risk:** The dark mode detection script is inline. If a strict CSP is implemented (as recommended in C-01), this inline script would be blocked, breaking the dark mode feature.

```html
<script>
  (function() {
    var stored = localStorage.getItem('adminmate-theme');
    var preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && preferDark)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

**Remediation:** Move the dark mode logic to an external JS file (e.g., `dark-mode-init.js`) loaded via `<script src="/dark-mode-init.js">` with the appropriate CSP nonce, or use a CSP nonce/hash for the inline script.

---

## LOW FINDINGS

### L-01: `experimentalDecorators: true` Enabled Unnecessarily

**File:** `tsconfig.json:5`
**Risk:** Experimental decorators are a Stage 2 TC39 proposal. In a modern React + hooks codebase, decorators are not used. This could cause compatibility issues with future TypeScript versions.

**Remediation:** Remove `"experimentalDecorators": true` unless actively used.

---

### L-02: `skipLibCheck: true` Skips Type Checking of Declaration Files

**File:** `tsconfig.json:13`
**Risk:** Type errors in `.d.ts` files from dependencies are skipped. A dependency with incorrect type declarations could hide actual type mismatches.

**Remediation:** Set `"skipLibCheck": false` (or remove it — default is `false`) and fix any resulting type errors.

---

### L-03: `allowJs: true` Allows JavaScript Files in TypeScript Project

**File:** `tsconfig.json:17`
**Risk:** Enables importing `.js` files alongside `.ts` files. This means untyped JS can be mixed with TypeScript code, potentially introducing runtime bugs that type-checking would catch.

**Remediation:** Set `"allowJs": false` unless there are JS files that must be imported.

---

### L-04: Vite Sourcemaps Not Explicitly Disabled for Production

**File:** `vite.config.ts:16-30`
**Risk:** Vite v6 defaults to `sourcemap: false` in production builds. However, this is not explicitly configured. A future configuration change could accidentally enable sourcemaps, exposing the full source code to production visitors.

**Remediation:** Add explicit `sourcemap: false` to the build config:
```typescript
build: {
  sourcemap: false,
  ...
}
```

---

### L-05: Non-Cryptographic Hash Used for Deduplication

**File:** `supabase/functions/_shared/messagingHub.ts:283-290`
**Risk:** The `logSync` method uses a simple djb2-style string hash (not cryptographic) for deduplication of sync log events. Hash collisions are possible, but given the low event volume, this is unlikely to be exploited.

```typescript
let hash = 0
for (let i = 0; i < payloadStr.length; i++) {
  const char = payloadStr.charCodeAt(i)
  hash = ((hash << 5) - hash) + char
  hash |= 0
}
```

**Remediation:** Use a proper hash function (e.g., `new TextEncoder()` + `crypto.subtle.digest('SHA-256')`) or simply use the payload JSON string as a unique constraint in the database.

---

### L-06: Vendor Chunk Name Mismatch — `motion` vs `framer-motion`

**File:** `vite.config.ts:26`
**Risk:** The vendor chunk configuration references `framer-motion`, but the installed dependency is `motion` (v12.x). This means the chunk optimization may not work as intended, and `framer-motion` could be bundled with the main app chunk instead of being code-split.

```typescript
'vendor-motion': ['framer-motion'],  // Package is 'motion', not 'framer-motion'
```

**Remediation:** Change to:
```typescript
'vendor-motion': ['motion'],
```

(Or verify that `motion` re-exports from `framer-motion` — if so, the reference may still work as an alias but is still incorrect.)

---

## ADDITIONAL OBSERVATIONS

### O-01: `VITE_DEMO_MODE=true` in .env.local

**File:** `.env.local:8`
The demo mode flag is enabled. Any feature gated behind this flag should be reviewed to ensure it doesn't bypass authentication or expose admin functions without proper authorization.

### O-02: X-XSS-Protection Header Is Deprecated

**File:** `vercel.json:20`
The `X-XSS-Protection: 1; mode=block` header is deprecated and ignored by modern browsers (Chrome/Edge removed support). It provides no real protection but also no harm. Can be safely removed once CSP is implemented.

### O-03: No Function Timeout/Limit Configuration for Vercel

**File:** `vercel.json`
If this project uses Vercel Serverless/Edge Functions, there is no `functions` block configuring timeouts, memory limits, or max body size. This could lead to resource exhaustion attacks.

### O-04: Console Logging in Test Files

**File:** Various test/source files
Production log messages (`console.log`, `console.warn`, `console.error`) exist in several source files, mostly wrapped in `if (import.meta.env.DEV)` guards. While guarded, these should be reviewed to ensure no sensitive data is ever logged in production Sentry/error logs.

### O-05: No Database Connection Pool Limit in Supabase Config

**File:** `supabase/config.toml`
No `[db]` pool settings configured. Default Supabase pool limits apply, which could be exhausted under heavy load.

---

## Remediation Priority Matrix

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| P0 | C-01: Missing CSP | Medium | Critical — XSS mitigation |
| P0 | C-03: Supabase config minimal | Medium | Critical — no auth hardening |
| P0 | C-04: Real creds in .env.local | Low | Critical — credential exposure |
| P1 | C-02: Missing HSTS | Low | High — MITM vector |
| P1 | H-01: Rate limit fails open | Low | High — DOS bypass |
| P1 | H-02: WhatsApp LINE secret fallback | Low | High — webhook forgery |
| P1 | H-04: Wildcard CORS | Low | High — cross-origin data access |
| P2 | H-03: JWT expiry/Session config | Low | Medium — session hijacking |
| P2 | H-05: Google Fonts no SRI | Low | Medium — CDN compromise |
| P2 | M-02: tsconfig path misconfig | Low | Medium — import outside src |
| P3 | All LOW findings | Variable | Low — defense in depth |

---

## Verification Steps

1. **Deploy CSP** — Add to `vercel.json`, test all pages work, verify via browser DevTools.
2. **Deploy HSTS** — Add to `vercel.json`, test with `curl -I https://adminmate.ai`.
3. **Harden Supabase config** — Run `supabase config set` for all missing values, redeploy.
4. **Rotate credentials** — Rotate Supabase anon key in production; update `.env.local`.
5. **Audit CORS** — Search for remaining `Access-Control-Allow-Origin: '*'` usages and replace.
6. **Run npm audit** — `npm audit --audit-level=high` to check for known dependency CVEs.
7. **Run `npx playwright test --trace on`** — Manually inspect traces for leaked PII.
