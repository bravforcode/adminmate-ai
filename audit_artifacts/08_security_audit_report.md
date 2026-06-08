# AdminMate AI — Comprehensive Security Audit Report

**Date:** 2026-06-08  
**Scope:** Full codebase — edge functions, client services, auth, RLS policies, storage  
**Auditor:** Security Agent (Ruflow/Project Gracia)

---

## Executive Summary

The AdminMate AI codebase has a **generally solid security posture** in its latest hardened RLS migration, shared utilities (auth verification, rate limiting, input validation), and error sanitization. However, there are several critical and high-severity issues that must be addressed before production deployment, including a dangerous intermediate migration that opens all RLS, missing webhook signature verification on WhatsApp, hardcoded demo credentials, and wildcard CORS.

| Severity | Count |
|----------|-------|
| **CRITICAL** | 4 |
| **HIGH** | 7 |
| **MEDIUM** | 9 |

---

## CRITICAL Findings (Must Fix)

### C-1: RLS Completely Removed in Intermediate Migration

**File:** `supabase/migrations/20240102000003_open_all_rls.sql`, lines 16-82  
**Issue:** This migration drops ALL company-scoped RLS policies and replaces them with `USING (true)` and `WITH CHECK (true)` for every table (jobs, candidates, applications, documents, interviews, offers, onboarding, cv_documents, chat_messages, notifications). This means **any authenticated user can read, modify, and delete ANY company's data**.

**Attack scenario:** User from Company A can query/update/delete all candidates, jobs, offers, and PII belonging to Company B.

**Mitigation:** While `20240102000004_hardened_rls.sql` fixes this, if migrations are applied out of order or the intermediate state is deployed, the vulnerability is live. Ensure the hardened migration is ALWAYS the final applied state. **Better yet, delete or rewrite the open_all_rls migration.**

**Recommendation:** Add a CI check that validates no migration creates `USING (true)` policies. Delete the `open_all_rls` migration or mark it as deprecated with a prominent warning.

---

### C-2: WhatsApp Webhook Has No Signature Verification

**File:** `supabase/functions/whatsapp-webhook/index.ts`, lines 10-85  
**Issue:** Unlike the LINE webhook (which properly validates `x-line-signature` using HMAC-SHA256), the WhatsApp webhook performs **zero signature verification**. Anyone can POST fake webhook payloads to this endpoint.

**Attack scenario:** An attacker can forge WhatsApp messages to:
- Inject arbitrary messages into the candidate messaging system
- Trigger AI responses (mate-ai-chat) without authorization
- Manipulate conversation history and application statuses

**Recommendation:** Implement Meta's `x-hub-signature-256` HMAC validation:
```ts
import { createHmac } from 'node:crypto'
const signature = req.headers.get('x-hub-signature-256')
const secret = Deno.env.get('WHATSAPP_APP_SECRET') || ''
if (secret && signature) {
  const hmac = createHmac('sha256', secret)
  hmac.update(body)
  if (`sha256=${hmac.digest('hex')}` !== signature) {
    return new Response('Forbidden', { status: 401 })
  }
} else if (secret && !signature) {
  return new Response('Forbidden', { status: 401 })
}
```

---

### C-3: Hardcoded Demo Credentials in Source Code

**Files:**
- `src/components/LoginView.tsx`, lines 71-79 — hardcoded `demo@adminmate.ai` / `demo123` and `applicant@adminmate.ai` / `demo123`
- `src/hooks/useAuth.ts`, line 122 — hardcoded fallback `testlogin99@gmail.com` / `Test123456!`
- `src/components/LoginView.tsx`, line 431 — credentials displayed in page footer

**Issue:** Production login form contains hardcoded credentials visible in the UI and source code. If this code ships to production, any user can log in with these credentials.

**Attack scenario:** Attacker reads source (or views page source) → logs in with demo credentials → gains full HR access.

**Recommendation:**
1. Gate all demo/autofill logic behind `VITE_DEMO_MODE === 'true'`
2. Remove hardcoded credentials from `useAuth.ts` fallback — throw an error instead
3. Never display credentials in production UI

---

### C-4: Edge Functions Use Service Role Key — Bypasses RLS

**Files:** All edge functions (`send-email`, `mate-ai-chat`, `parse-resume`, `screen-resume`, `generate-jd`, `generate-offer-content`, `log-client-error`, `send-document-reminders`, `metrics`, `messaging-hub`)

**Issue:** Every edge function creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY`, which **completely bypasses Row Level Security**. While the functions do check `companyId` ownership manually, the pattern is fragile — a missed check means any authenticated user can access any company's data via edge functions.

**Evidence:**
- `mate-ai-chat` (line 48-51): Fetches company data, documents, and HR contacts for the provided `companyId` without verifying the user belongs to that company
- `screen-resume` (line 51-53): Company ownership check is optional (`if (companyId && ...)`)

**Recommendation:**
1. Create a `SUPABASE_SERVICE_ROLE_KEY` restricted to specific operations where possible
2. For each edge function, **always** verify `user.company_id === requestedCompanyId` before any data access
3. Consider using the user's JWT for RLS-enforcing queries where feasible

---

## HIGH Findings (Should Fix)

### H-1: Wildcard CORS on All Edge Functions

**File:** `supabase/functions/_shared/utils.ts`, lines 3-8  
**Issue:** `Access-Control-Allow-Origin: *` is set on all edge functions. This allows any website to make authenticated requests to your edge functions (if the user has a valid Supabase session cookie/token).

**Attack scenario:** A malicious website can make cross-origin requests to invoke AI features (costing Gemini API credits), send emails, or access data if the user is logged in.

**Recommendation:** Restrict CORS to your actual domain:
```ts
const ALLOWED_ORIGINS = ['https://adminmate.ai', 'https://app.adminmate.ai']
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  // ...
}
```

---

### H-2: Rate Limiting Fails Open

**File:** `supabase/functions/_shared/utils.ts`, lines 97-99  
**Issue:** When the rate limit check itself fails (database error), the function returns `null` (no rate limiting applied). The comment says "failing open" — but this means a database glitch disables all rate limiting.

**Recommendation:** Fail closed for critical operations (auth, AI calls). At minimum, log the failure and consider returning a 503 instead of allowing the request through.

---

### H-3: Notification Table Allows Unrestricted INSERT

**File:** `supabase/migrations/20240101000021_rls_policies.sql`, line 52  
**Issue:** The notification INSERT policy is `WITH CHECK (true)`, meaning **any authenticated user can create notifications for any user_id**. Combined with the open RLS in migration C-1, this allows spam/Phishing attacks.

**Recommendation:** Restrict to:
```sql
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR safe_user_role() IN ('admin', 'system'));
```

---

### H-4: Metrics Endpoint Leaks Cross-Company Data

**File:** `supabase/functions/metrics/index.ts`, lines 50-65  
**Issue:** The metrics endpoint queries `user_profiles`, `companies`, `jobs`, and `candidates` **without company_id filtering**. Any admin/hr user can see total counts across ALL companies.

**Recommendation:** Filter by user's company:
```ts
const { count } = await supabase.from('user_profiles')
  .select('id', { count: 'exact', head: true })
  .eq('company_id', profile.company_id)
```

---

### H-5: No File Upload Validation

**File:** `src/services/storageService.ts`, lines 4-24  
**Issue:** `uploadCV`, `uploadLogo`, and `uploadAvatar` accept any `File` object without validating:
- File type (could upload `.exe`, `.svg` with XSS, `.html`)
- File size (no limit)
- File content (no virus scanning)

**Recommendation:** Add client and server-side validation:
```ts
const ALLOWED_CV_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_CV_SIZE = 10 * 1024 * 1024 // 10MB
if (!ALLOWED_CV_TYPES.includes(file.type) || file.size > MAX_CV_SIZE) {
  throw new Error('Invalid file type or size')
}
```
Also add storage bucket policies to restrict allowed MIME types.

---

### H-6: Client-Side Rate Limiting Is Bypassable

**File:** `src/utils/rateLimit.ts`  
**Issue:** Login rate limiting uses `localStorage` which can be trivially cleared by an attacker. The server-side Supabase auth has its own rate limiting, but the client-side lockout provides false security.

**Recommendation:** Rely primarily on server-side rate limiting. If using client-side, also implement server-side brute-force protection (Supabase already has some via `auth.failures`).

---

### H-7: parse-resume Fetches Arbitrary URLs (Potential SSRF)

**File:** `supabase/functions/parse-resume/index.ts`, lines 57-62  
**Issue:** The function fetches `cvDoc.file_url` directly. If an attacker can control the `file_url` value in the database (e.g., via the open RLS from C-1), they can make the edge function fetch internal network resources (SSRF).

**Recommendation:** Validate that `file_url` is a Supabase Storage URL or from an allowed domain:
```ts
const allowedHosts = ['storage.googleapis.com', 'nickivumteyrezptjggk.supabase.co']
const url = new URL(cvDoc.file_url)
if (!allowedHosts.includes(url.hostname)) {
  return errorResponse('Invalid file URL', 400, corsHeaders)
}
```

---

## MEDIUM Findings (Nice to Fix)

### M-1: AI Response Parsing Uses Unsafe Regex

**Files:** `parse-resume/index.ts` line 80, `screen-resume/index.ts` line 70, `generate-jd/index.ts` line 76, `generate-offer-content/index.ts` line 80  
**Issue:** All AI functions extract JSON using `text.match(/\{[\s\S]*\}/)`. This greedy match could capture malformed JSON or be exploited if the AI output is manipulated.

**Recommendation:** Use a more robust JSON extraction (e.g., find first `{` and last `}`) and wrap in try/catch with proper error handling.

---

### M-2: No CSRF Protection on Webhook Endpoints

**Files:** `line-webhook/index.ts`, `whatsapp-webhook/index.ts`  
**Issue:** While these use Bearer tokens / signature verification (LINE), there's no CSRF protection on the `send-document-reminders` endpoint which uses a cron secret header.

**Recommendation:** Use a cryptographically random `CRON_SECRET_KEY` and validate timing to prevent replay attacks.

---

### M-3: Auth Store Persists User Data to localStorage

**File:** `src/stores/authStore.ts`, lines 164-167  
**Issue:** The auth store persists `user`, `profile`, and `company` to `localStorage` via Zustand's `persist` middleware. While Supabase handles token security, the persisted profile data (including `role`, `company_id`, `email`) is accessible to any XSS attack.

**Recommendation:** Consider using `sessionStorage` for sensitive data, or encrypt the persisted state.

---

### M-4: `safe_user_company_id()` Returns NULL for Users Without Company

**File:** `supabase/migrations/20240102000004_hardened_rls.sql`, lines 28-29  
**Issue:** The hardened RLS policies include `OR safe_user_company_id() IS NULL` as a fallback. This means users WITHOUT a company can read data from ALL companies (the SELECT returns everything since NULL doesn't match any company_id, but the OR clause makes it return all rows).

**Recommendation:** Remove the `OR safe_user_company_id() IS NULL` clause from SELECT policies. Users without a company should see empty results, not all data.

---

### M-5: `dangerouslySetInnerHTML` Not Used (Good) — But No CSP

**Issue:** While no `dangerouslySetInnerHTML` or `innerHTML` usage was found (good), there's no Content Security Policy (CSP) headers configured in `vercel.json` or `index.html`.

**Recommendation:** Add CSP headers to prevent XSS if a vulnerability is found:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.supabase.co data:; connect-src 'self' https://*.supabase.co https://api.resend.com
```

---

### M-6: LoginView.tsx Bypasses Supabase Auth

**File:** `src/components/LoginView.tsx`, lines 59-67  
**Issue:** The legacy `LoginView.tsx` component uses `setTimeout` to simulate login and calls `onLoginSuccess` directly without going through Supabase auth. If this component is still reachable in production, it provides a complete auth bypass.

**Recommendation:** Remove this component or ensure it's only used in demo/development mode.

---

### M-7: Storage Policies Not Implemented in SQL

**File:** `supabase/storage_policies.sql`, `supabase/migrations/20240101000028_security_hardening.sql` lines 12-17  
**Issue:** Storage bucket policies are only documented in comments, not actually created as SQL. The `storage_policies.sql` file contains only comments. If these policies weren't applied via the Supabase Dashboard, storage buckets may be unprotected.

**Recommendation:** Create actual SQL migration for storage policies:
```sql
-- cv-uploads: authenticated users can SELECT their company files
CREATE POLICY "cv_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cv-uploads' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles WHERE id = auth.uid()
  ));
```

---

### M-8: messageHandler.ts Uses User Input in `.or()` Query

**File:** `supabase/functions/_shared/messageHandler.ts`, line 42  
**Issue:** The query `.or(\`line_user_id.eq.${msg.platformUserId},whatsapp_phone.eq.${msg.platformUserId}\`)` directly interpolates `platformUserId` into the query. While Supabase parameterizes this, a crafted `platformUserId` containing `.or` or other Supabase query operators could potentially manipulate the query.

**Recommendation:** Use separate `.eq()` queries with `OR` logic instead of string interpolation in `.or()`.

---

### M-9: No Account Lockout After Failed Server-Side Attempts

**Issue:** While Supabase has built-in rate limiting on auth attempts, there's no application-level account lockout after repeated failed logins. An attacker with a valid email list could attempt passwords without triggering a lockout.

**Recommendation:** Implement server-side account lockout after N failed attempts, or use Supabase's `auth.failures` configuration to increase wait times.

---

## Positive Findings (What's Done Well)

1. **Error sanitization** (`errorHandler.ts`) — All database errors are mapped to safe user-facing messages; raw errors are never exposed to clients.
2. **Input validation** — Edge functions validate required fields, string lengths, and types before processing.
3. **Rate limiting** — All edge functions have rate limiting via `enforceRateLimit`.
4. **Auth verification** — All protected edge functions call `verifyAuth` and check for JWT tokens.
5. **HTML escaping in emails** (`escapeHtml` in `send-email`) — Prevents email template injection/XSS.
6. **X-Forwarded-For handling** — IP extraction from trusted headers for rate limiting.
7. **Payload size limits** — `log-client-error` and webhooks enforce `MAX_BODY_BYTES`.
8. **Hardened RLS** (migration 4) — Company-scoped, role-based access for all tables.
9. **PKCE auth flow** — Using `flowType: 'pkce'` in Supabase client config.
10. **No hardcoded secrets** — API keys are loaded from environment variables, not source code.

---

## Prioritized Remediation Plan

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| P0 | C-1: Open RLS migration | Low | Critical data exposure |
| P0 | C-2: WhatsApp signature verification | Low | Webhook spoofing |
| P0 | C-3: Remove hardcoded credentials | Low | Unauthorized access |
| P0 | C-4: Validate companyId in edge functions | Medium | Cross-tenant data access |
| P1 | H-1: Restrict CORS origins | Low | Cross-origin attacks |
| P1 | H-4: Filter metrics by company | Low | Data leakage |
| P1 | H-5: File upload validation | Medium | Malicious file upload |
| P1 | H-7: SSRF protection in parse-resume | Medium | Server-side request forgery |
| P1 | M-4: Remove IS NULL fallback in RLS | Low | Data leakage to new users |
| P2 | H-2: Fail closed on rate limit errors | Low | Rate limit bypass |
| P2 | H-3: Restrict notification INSERT | Low | Spam/phishing |
| P2 | M-5: Add CSP headers | Medium | XSS mitigation |
| P2 | M-6: Remove legacy LoginView | Low | Auth bypass |
| P2 | M-7: Implement storage policies | Medium | Unprotected storage |
| P3 | All remaining M findings | Various | Defense in depth |

---

*Report generated by Security Agent — Ruflow/Project Gracia*
