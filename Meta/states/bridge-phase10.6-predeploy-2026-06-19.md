# Phase 10.6 — Pre-Deploy Runtime Verification

**Date:** 2026-06-19
**Agent:** bridge
**Triggered by:** Phase 10.5 completion — need runtime verification before deploy
**Status:** ⚠️ CONDITIONAL PASS — local verification complete, runtime tests require manual execution

---

## What Passed Locally (Automated)

| Check | Status | Evidence |
|-------|--------|----------|
| TypeScript | ✅ 0 errors | `npx tsc --noEmit` |
| Build | ✅ Passes | `npm run build` 10.04s |
| ESLint | ✅ 0 errors | 17 pre-existing warnings |
| Migration file ready | ✅ Exists | `20240619000001_login_rate_limit_text_key.sql` |
| Migration correctness | ✅ Verified | Table, function, index, RLS, GRANT all present |
| Sentry no-op | ✅ Verified | `if (!SENTRY_DSN) return` on line 52 |
| Edge error fuzz (static) | ✅ 0 leaks | No `error.message`/`err.message` in any JSON response |
| Rate limit code path | ✅ Complete | `login.ts` → `check_login_rate_limit` → `login_rate_limits` table |
| OAuth flow analysis | ✅ Traced | Primary flow works; `SameSite=Strict` risk documented |

---

## Manual Runtime Tests (REQUIRED Before Deploy)

These tests require live Supabase + Vercel preview. Execute in order.

### Step 1: Apply Migration to Staging

```bash
# Link to staging project
supabase link --project-ref <STAGING_PROJECT_REF>

# Push the new migration
supabase db push

# Verify table exists
# Run in Supabase SQL Editor:
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'login_rate_limits'
);

# Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'check_login_rate_limit';

# Verify RLS blocks anon
SET role TO anon;
SELECT * FROM login_rate_limits;  -- Should error or return 0 rows
RESET role;

# Verify service_role can execute
SELECT check_login_rate_limit('test-hash', 'login_attempt', 5, 900);
```

**Expected:** Table exists, function exists, anon blocked, service_role works.

### Step 2: Set SENTRY_DSN

```bash
# Set via Supabase CLI (do NOT print the value)
supabase secrets set SENTRY_DSN=<your-sentry-dsn>

# Verify no-op when DSN missing (test on a function without SENTRY_DSN set)
# Should complete without crash — just no Sentry capture
```

### Step 3: OAuth + Cookie Runtime Test

**Test in Chrome (not incognito first):**

1. Navigate to `/login`
2. Click "Login with Google"
3. Complete Google OAuth
4. **Verify:** Redirected to `/dashboard` (not stuck on login page)
5. **Verify:** `__Host-sb-auth-refresh` cookie is set (DevTools → Application → Cookies)
6. **Verify:** Cookie has `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`

**Test email verification:**

7. Register a new account with email
8. Check email for verification link
9. Click the link from email client (or copy-paste in new tab)
10. **If redirected to login page:** `SameSite=Strict` is breaking cross-site navigation
    - **Fix:** Change `SameSite=Strict` → `SameSite=Lax` in `cookies.ts`
    - **Keep:** `__Host-` prefix (still works with `Lax`)
    - **Document:** Why `Lax` was chosen (email verification compatibility)

**Test password reset:**

11. Click "Forgot Password"
12. Enter email, submit
13. Click reset link from email
14. **If link doesn't work or redirects to login:** Same `SameSite` issue

**Test session restore:**

15. Login, close browser tab
16. Reopen app in new tab
17. **Verify:** Session restored automatically (cookie-based)

**Test incognito:**

18. Open incognito window
19. Navigate to app
20. **Verify:** Redirected to login (no session)

### Step 4: CSP Runtime Test on Vercel Preview

Deploy preview: push branch to trigger Vercel preview deployment.

1. Open preview URL in Chrome
2. Open DevTools → Console tab
3. Navigate to these pages and check for CSP violations:

| Page | Check |
|------|-------|
| `/` | Fonts load, images load |
| `/login` | Google OAuth button loads, styles apply |
| `/dashboard` | Supabase Realtime connects (check Network tab for `wss://`) |
| `/settings/billing` | Stripe.js loads (if test mode available) |

4. **Expected:** Zero `Refused to load` or `Refused to connect` CSP errors
5. **If CSP blocks something:** Add the domain to the appropriate CSP directive in `vercel.json`

### Step 5: Rate-Limit Runtime Test

**Prerequisites:** Migration applied (Step 1), app deployed to preview.

1. Open preview URL
2. Go to `/login`
3. Enter a valid email + **wrong password** → click Login
4. Repeat 5 times (total 6 attempts within 15 minutes)
5. **On 6th attempt:** Verify you see "Too many login attempts. Please try again later."
6. **Open DevTools → Application → Local Storage**
7. **Clear localStorage** for the site
8. Try login again with wrong password
9. **Verify:** Still blocked (server-side rate limit, not client-side)
10. **Verify:** Error message is generic — does NOT say "account not found" or "wrong password"
11. **Wait 15 minutes** (or manually delete rows from `login_rate_limits` table)
12. Try login with correct password
13. **Verify:** Login succeeds

### Step 6: Edge Error Fuzz (Against Deployed Functions)

```bash
# Set these to your staging values
SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_ANON_KEY="<anon-key>"

# Test 1: Malformed JSON
curl -X POST "$SUPABASE_URL/functions/v1/mate-ai-chat" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "not json"
# Expected: {"success":false,"error":"Invalid JSON body"} (NOT raw error)

# Test 2: Unauthenticated request
curl -X POST "$SUPABASE_URL/functions/v1/generate-offer-content" \
  -H "Content-Type: application/json" \
  -d '{"offerId":"fake-id"}'
# Expected: {"success":false,"error":"Unauthorized"} (NOT stack trace)

# Test 3: Invalid ID (cross-company test)
# Login as User A, try to access User B's offer ID
# Expected: {"success":false,"error":"Offer not found"} (NOT "offer exists but belongs to another company")

# Test 4: Check Sentry dashboard for captured errors
# Should see sanitized error messages (no emails, no tokens, no UUIDs)
```

---

## Phase 10.6 Final Verdict

| Gate | Verdict | Evidence |
|------|---------|----------|
| **Critical security code remediation** | ✅ PASS | Phase 10 + 10.5 + 10.6 local verification all pass |
| **Static/build/security grep** | ✅ PASS | tsc=0, build=pass, eslint=0, all security greps pass |
| **Migration ready** | ✅ PASS | File exists, correct schema, ready to apply |
| **Private/internal beta** | ⚠️ CONDITIONAL | After: (1) apply migration, (2) set SENTRY_DSN, (3) test OAuth+SameSite |
| **Deploy production** | ⚠️ NOT YET | All 6 manual steps must pass first |
| **Public soft launch** | ❌ NO-GO | Needs: >70% test coverage, load testing, runtime CSP verified |
| **Paid traffic** | ❌ NO-GO | Needs: Stripe live mode, PCI, fraud monitoring |
| **Real payments** | ❌ NO-GO | Needs: full PCI DSS, support pipeline |

---

## Pre-Deploy Checklist (Copy-Paste Ready)

```
PRE-DEPLOY CHECKLIST — Phase 10.6

[ ] 1. Apply migration: supabase db push
[ ] 2. Verify table: SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'login_rate_limits');
[ ] 3. Verify function: SELECT proname FROM pg_proc WHERE proname = 'check_login_rate_limit';
[ ] 4. Set SENTRY_DSN: supabase secrets set SENTRY_DSN=<value>
[ ] 5. Test Google OAuth login → dashboard redirect works
[ ] 6. Test email verification link → works OR downgrade SameSite to Lax
[ ] 7. Test password reset link → works
[ ] 8. Test session restore after browser close
[ ] 9. Verify __Host-sb-auth-refresh cookie attributes (HttpOnly, Secure, SameSite, Path=/)
[ ] 10. Deploy Vercel preview → check console for CSP violations on /, /login, /dashboard
[ ] 11. Test 6 failed logins → server-side block active
[ ] 12. Clear localStorage → still blocked
[ ] 13. Test Edge Function error responses → generic only
[ ] 14. Check Sentry dashboard → errors captured, PII sanitized
[ ] 15. Run: npx tsc --noEmit && npm run build && npx eslint src/
```

**All 15 items must be checked before production deploy.**

---

*Phase 10.6 completed by bridge agent. All local changes are ready. Runtime tests require manual execution against live staging.*
