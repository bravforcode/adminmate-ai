# Data Compliance & Privacy Audit Report (PDPA/GDPR)

**Date:** 2026-06-12  
**Auditor:** Security & Compliance Expert  
**Scope:** Full-stack data compliance — PDPA (Thailand) / GDPR (EU)  
**Version:** 1.0

---

## Executive Summary

**Overall Rating: ⚠️ MODERATE RISK — 14 findings (3 CRITICAL, 6 HIGH, 3 MEDIUM, 2 LOW)**

The application has a **solid foundation** for compliance (RLS multi-tenancy, consent table schema, audit logging infrastructure), but contains **critical gaps** in consent validity, data deletion completeness, PII leakage via telemetry, and missing enforcement mechanisms that would violate PDPA Sections 23-26 (Consent), 30-32 (Data Subject Rights), and 37 (Security Measures) as well as GDPR Articles 5, 6, 7, 17, 20, 32, and 33.

---

## Finding Inventory

| # | Severity | Category | Summary |
|---|----------|----------|---------|
| F1 | **CRITICAL** | Consent | PDPAConsentBanner silently inserts consent with empty email, no timestamp/withdrawal UI |
| F2 | **CRITICAL** | Deletion (Right to Erasure) | deleteUserData does NOT delete; anonymization is reversible, misses key tables |
| F3 | **CRITICAL** | Sentry/PII Leakage | No beforeSend hook — full error context including PII may be sent to Sentry |
| F4 | **HIGH** | Data Anonymization | `anonymize_candidate_data` function is reversible (full_name set to static Thai text) |
| F5 | **HIGH** | Consent Withdrawal | No `consent_withdrawn_at` handling in PDPAPage — withdrawal UI missing |
| F6 | **HIGH** | Audit Log Tampering | No append-only enforcement on `audit_logs` — UPDATE/DELETE not blocked |
| F7 | **HIGH** | Signature Data Security | `signature_data` stored as plain TEXT — no encryption of biometric signature |
| F8 | **HIGH** | Email PII | `onboardingEmailService` sends PII via Edge Function with no encryption guarantee |
| F9 | **HIGH** | Data Export | "Export My Data" uses client-side `downloadJSON` — exposes full JSON in browser memory |
| F10 | **MEDIUM** | Data Retention | No automated enforcement of retention policies (2yr CV, 7yr employee, 1yr chat) |
| F11 | **MEDIUM** | PII in Models/DB | `candidates` table stores `line_user_id` and `whatsapp_phone` — excess PII for HR context |
| F12 | **MEDIUM** | Cross-border Transfer | No documented assessment or safeguards for data leaving Thailand |
| F13 | **LOW** | Error Handler PII | Client-side `errorHandler.ts` logs `userAgent`, `url` to localStorage and edge function |
| F14 | **LOW** | Token Storage | Auth token in `localStorage` — vulnerable to XSS (mitigated by PKCE but still noted) |

---

## Detailed Findings

### F1 — CRITICAL: Consent Banner Silent Acceptance (PDPA §23-24 / GDPR Art.7)

**File:** `src/components/compliance/PDPAConsentBanner.tsx:15-22`

```
handleAccept:
  - inserts into pdpa_consents with data_subject_email: ''
  - purposes: ['recruitment_processing']  (hardcoded)
  - consent_form_version: '1.0'          (hardcoded)
  - No granular consent checkbox — single button "Accept All"
  - No link to privacy policy
  - No record of what the user was told at time of consent
```

**Violations:**
- **PDPA §23**: Consent must be freely given, specific, and informed. Empty `data_subject_email` violates specificity.
- **PDPA §24**: Withdrawal of consent must be as easy as giving it. No withdrawal mechanism in this component.
- **GDPR Art.7**: Conditions for consent — consent must be demonstrable. Empty email makes it impossible to prove who consented.
- **PDPA §26**: Sensitive data requires explicit consent. Hardcoded purposes don't allow user choice.

**Remediation:**
1. Always populate `data_subject_email` from authenticated user session
2. Implement granular purposes with checkboxes (not single "Accept All")
3. Store the consent form text/version actually shown to the user
4. Add privacy policy link in the banner
5. Add withdrawal button alongside the accept button
6. Record `ip_address` and `user_agent` on every consent record

---

### F2 — CRITICAL: Right to Erasure is NOT a True Deletion (PDPA §33 / GDPR Art.17)

**Files:**
- `supabase/functions/delete-user-data/index.ts:58-100`
- `src/services/pdpaService.ts:62-107`

**What the code does (anonymization, not deletion):**
1. Replaces PII with `'Deleted User'` / `deleted_<hash>@anonymized.local`
2. Sets `phone`, `location`, `linkedin_url`, `portfolio_url` to `null`
3. Replaces chat content with `'[Message deleted]'`
4. Sets consent `consent_given: false`

**What is NOT anonymized/deleted:**
- `cv_documents` table — parsed CV content (`parsed_content`) still contains full PII
- `documents` table — uploaded documents remain intact
- `applications` table — `candidate_email`, `candidate_name`, `ai_analysis` still have PII
- `offers` table — candidate salary, offers remain
- `interviews` table — feedback, interviewer data remains
- `notifications` table — not touched
- `onboarding_tasks` — not touched
- `audit_logs` — old_values/new_values in JSONB still contain PII

**The `candidates` UPDATE on line 80 of delete-user-data is BUGGY:**
```typescript
.eq('email', profile?.role ? '' : '')  // filters by empty string → never matches
```
This means candidates records are NEVER actually anonymized.

**Anonymization is reversible:**
- `hashedEmail = SHA-256(userId).slice(0, 16)` — the same userId always produces the same hash, allowing re-identification by anyone who has userId access
- `deletedEmail = deleted_<hash>@anonymized.local` — fixed pattern, easily correlated
- Chat messages replaced with `'[Message deleted]'` — same for all users, but the rows still exist under the same `user_id`

**Violations:**
- **PDPA §33**: Data subject has the right to request deletion — the law requires deletion, not reversible anonymization with retained records
- **GDPR Art.17(1)(a)**: Right to erasure — data must be erased, not merely pseudonymized
- **GDPR Art.17(2)**: Controller must inform third parties of the erasure request

**Remediation:**
1. Fix the candidates WHERE clause bug on line 80
2. Add `cv_documents`, `applications`, `offers`, `interviews`, `notifications`, `onboarding_tasks` to the anonymization scope
3. Add `audit_logs.old_values` and `audit_logs.new_values` PII redaction
4. Replace hashed email with true deletion from user-centric tables
5. Add a hard DELETE from `user_profiles` + `auth.users` for GDPR Art.17 compliance
6. Use `crypto.randomUUID()` instead of `SHA-256(userId)` for anonymized identifiers

---

### F3 — CRITICAL: Sentry Configuration Allows PII Leakage (GDPR Art.32 / PDPA §37)

**File:** `src/lib/sentry.ts:1-14`

```typescript
m.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  // NO beforeSend hook!
  // NO denyUrls / allowUrls!
  // NO attachStacktrace: false!
})
```

**What leaks to Sentry:**
- All uncaught exceptions with full stack traces (may include variables with PII)
- All API call failures with request/response bodies
- User's URL path with potential PII in query parameters
- Browser console errors that may include PII

**No data scrubbing is configured:**
- No `beforeSend` callback to redact PII
- No `blacklistUrls` / `denyUrls` for sensitive endpoints
- No `attachStacktrace: false` for manual error captures

**Additionally, `errorHandler.ts:88-97` sends errors to `log-client-error` edge function with raw message, stack, userAgent, URL — all potentially containing PII — and stores them in `activity_log` table accessible to company users with admin role.**

**Violations:**
- **GDPR Art.32**: Security of processing — must implement pseudonymization and encryption of personal data
- **GDPR Art.5(1)(c)**: Data minimization — only data necessary for processing should be collected
- **PDPA §37**: Data controller must implement appropriate security measures
- **Sentry DPA requirement**: Without `beforeSend` scrubbing, the Data Processing Agreement with Sentry may not be sufficient

**Remediation:**
1. Add `beforeSend(event)` hook to redact:
   - `event.request.headers` (Authorization, Cookie)
   - `event.user.email`, `event.user.username`
   - `event.exception.values[].stacktrace.frames[].vars` (variable values)
   - Query string parameters that could contain PII
2. Add `denyUrls: [/\/auth\//, /\/pdpa\//, /\/compliance\//]`
3. Add `attachStacktrace: false` for manual error captures
4. In `errorHandler.ts`, sanitize the payload before `sendToEndpoint`:
   - Strip user email from error messages
   - Redact URL query parameters
   - Limit stack trace depth to 10 frames

---

### F4 — HIGH: Reversible Anonymization in SQL Function (PDPA §33 / GDPR Art.17)

**File:** `supabase/migrations/20240101000026_anonymize_function.sql:1-9`

```sql
UPDATE candidates SET
  full_name = 'ลบข้อมูลแล้ว',       -- Thai for "data deleted" — static, not truly anonymous
  full_name_th = 'ลบข้อมูลแล้ว',
  email = CONCAT('anon_', LEFT(MD5(id::TEXT), 8), '@deleted.local'),  -- MD5(id) is deterministic
  ...
WHERE email = p_email AND company_id = p_company_id;
```

**Problems:**
1. **MD5(id)** is deterministic — anyone with the candidate ID (stored in many related tables) can re-derive `anon_<hash>@deleted.local` and re-identify the user
2. **Static `'ลบข้อมูลแล้ว'`** — all anonymized candidates have the same name, but it's a fixed string rather than a random token
3. Only **candidates** table is handled — all other tables with candidate PII are untouched
4. Called from `CompliancePage.tsx:54` via RPC but the `delete-user-data` Edge Function uses its own inline logic — there are **two competing anonymization implementations** that don't match

**Violations:**
- **PDPA §33**: Effective erasure requires irreversible anonymization
- **GDPR Art.17(1)**: Pseudonymization ≠ erasure
- **GDPR Recital 26**: Anonymization must be irreversible

**Remediation:**
1. Use `gen_random_uuid()` for anonymous identifiers, not `MD5(id)`
2. Extend the function to cover all PII tables (applications, offers, interviews, cv_documents, etc.)
3. Remove old_values in audit_logs that reference anonymized records
4. Ensure the function and `delete-user-data` Edge Function use the same logic

---

### F5 — HIGH: No Consent Withdrawal UI (PDPA §24 / GDPR Art.7(3))

**Files:**
- `src/pages/settings/PDPAPage.tsx:176-211`
- `supabase/migrations/20240101000019_pdpa_compliance.sql` (schema has `consent_withdrawn_at` field but it's never used)

**The `pdpa_consents` table has `consent_withdrawn_at` but:**
- No UI to withdraw consent exists on PDPAPage
- The `pdpaService` has no `withdrawConsent()` method
- The Consent History display shows past consents but no "Revoke" button
- `PDPAConsentBanner` only has an "Accept" button, not a withdrawal option

**Violations:**
- **PDPA §24**: Withdrawal of consent must be as easy as giving it
- **GDPR Art.7(3)**: The data subject has the right to withdraw consent at any time
- **GDPR Art.19**: Obligation to notify third parties of withdrawal

**Remediation:**
1. Add a `withdrawConsent(consentId: string)` method to `pdpaService`
2. Add "Revoke Consent" button to each consent record in PDPAPage
3. Create a "Consent Management" section with active/revoked states
4. When consent is withdrawn, trigger downstream data processing halts
5. Log withdrawal to audit log

---

### F6 — HIGH: Audit Log Tampering Not Prevented (PDPA §37 / GDPR Art.30)

**Files:**
- `supabase/migrations/20240101000014_audit_logs.sql:1-13`
- `supabase/migrations/20240101000021_rls_policies.sql:55-56`
- `supabase/migrations/20240101000027_fix_missing_rls.sql:24-25`

**The `audit_logs` table:**
- Has RLS policies only for SELECT and INSERT
- **No trigger or policy prevents UPDATE or DELETE** — a compromised admin account can tamper with history
- The audit_trigger_fn in `error_sanitization_audit.sql` only handles INSERT (capturing mutations), but doesn't protect the audit_log table itself
- `old_values` and `new_values` JSONB columns contain full record snapshots with PII — and there's no retention/cleanup

**Violations:**
- **PDPA §37**: Security measures must include maintaining records that cannot be altered
- **GDPR Art.30(4)**: Records of processing activities must be maintained — implies immutability
- **GDPR Art.5(1)(f)**: Integrity and confidentiality principle — audit trails must be tamper-proof

**Remediation:**
1. Add a database trigger that BLOCKS UPDATE and DELETE on `audit_logs` (append-only)
2. For edge cases requiring cleanup, use a SECURITY DEFINER function restricted to service_role
3. Implement PII redaction for `old_values`/`new_values` after retention period
4. Add `SET session_replication_role = 'replica'` bypass protection

---

### F7 — HIGH: Digital Signature Data Stored in Plain Text (PDPA §37 / GDPR Art.32)

**Files:**
- `src/services/signatureService.ts:36-51`
- `supabase/migrations/20240104000005_document_signatures.sql:1-53`

**The `document_signatures` table stores:**
- `signature_data TEXT` — the actual signature image/coordinates stored as a base64-encoded string in plain text
- `signer_name`, `signer_email` — PII in plain text
- `verification_token` — MD5-based (not crypto-random): `md5(random()::text || clock_timestamp()::text)`

**Problems:**
1. **Electronic signatures under PDPA §7-11**: The law requires reliable methods to identify the signer — plain base64 with no encryption does not meet this standard
2. **Signature data is PII** (biometric if it's a drawn signature) and must be encrypted at rest
3. `verification_token` uses `md5()` which is not cryptographically secure for this purpose
4. No chain-of-custody hashing — document content isn't hashed and stored alongside the signature

**Violations:**
- **PDPA §37**: Must implement encryption for sensitive data
- **GDPR Art.32**: Appropriate technical measures, including encryption of personal data
- **PDPA §7-11 (Electronic Transactions Act)**: Electronic signatures must be reliable

**Remediation:**
1. Add `pgcrypto` encryption for `signature_data`: `pgp_sym_encrypt(signature_data, encryption_key)`
2. Replace `md5()` with `gen_random_uuid()` for `verification_token`
3. Add a `document_hash` column that stores SHA-256 of the signed document content
4. Add `signature_format` column to distinguish between drawn, typed, and digital certificate signatures
5. Create a separate encryption key stored in Supabase Vault (not the DB)

---

### F8 — HIGH: Email Communications Transmit PII Without Encryption Assurance (PDPA §37 / GDPR Art.32)

**File:** `src/services/onboardingEmailService.ts:13-22`

```typescript
async function invokeSendEmail(to: string, template: string, data: Record<string, unknown>) {
  const res = await supabase.functions.invoke(FN, {
    body: { to, template, data },
  })
```

**What's transmitted:**
- Recipient email address (`to`)
- `fullName`, `startDate` — PII sent to Resend (3rd-party US-based service)
- No TLS enforcement verification before sending
- No encryption at rest for sent emails in the email service provider
- No audit trail of what PII was sent via email

**Cross-border issue:** Resend is US-based. Sending Thai PII to the US without:
- Adequacy decision (Thailand has no EU adequacy, US has Data Privacy Framework)
- Standard Contractual Clauses
- Binding Corporate Rules
- Explicit data subject consent for cross-border transfer

**Violations:**
- **PDPA §28**: Cross-border transfer requires adequate protection standards
- **GDPR Art.46**: Transfers require appropriate safeguards
- **GDPR Art.32**: Encryption during transmission
- **PDPA §37**: Security measures for data transmission

**Remediation:**
1. Verify Resend's data processing location and DPA
2. Add a `PII_EMAIL_CONTENT` flag to audit log when emails with PII are sent
3. Implement email content encryption or use end-to-end encrypted email service
4. Add data processing agreement review for Resend
5. Consider Thailand-based email provider for compliance with PDPA §28

---

### F9 — HIGH: Data Export Exposes Full PII in Browser Memory (PDPA §30 / GDPR Art.20)

**File:** `src/services/pdpaService.ts:144-151`

```typescript
downloadJSON(data: UserDataExport, filename = 'pdpa-data-export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
```

**Problems:**
1. Entire data export (containing ALL PII — chat messages, applications, documents, audit logs) is serialized to a Blob in browser memory
2. Data is sent over Supabase REST API unencrypted (beyond HTTPS) — the Supabase client uses the anon key
3. No password protection on the downloaded JSON
4. No expiration on the export data — once downloaded, the file lives on the user's device indefinitely
5. No export audit logged on the client side — only the Edge Function logs the export

**Violations:**
- **PDPA §30**: Right to access data — data must be provided in a commonly used, machine-readable format
- **GDPR Art.20**: Right to data portability — format should be structured, commonly used, and machine-readable. JSON is acceptable, but security of the transfer must be ensured
- **GDPR Art.32**: Security of personal data during transfer

**Remediation:**
1. Add password encryption to the export file (e.g., ZIP with AES-256)
2. Implement server-side export URL that expires (pre-signed URL with 1-hour TTL)
3. Log data export events in the audit log with the record count
4. Add a warning banner about securing the downloaded file
5. Send large exports via email rather than browser download

---

### F10 — MEDIUM: Data Retention Not Enforced (PDPA §37 / GDPR Art.5(1)(e))

**File:** `src/pages/settings/CompliancePage.tsx:102-107`

```typescript
<div className="flex justify-between py-2 border-b border-outline-variant">
  <span className="text-on-surface-variant">CV Data</span><span>2 years after application</span>
</div>
<div className="flex justify-between py-2">
  <span className="text-on-surface-variant">Employee Data</span><span>7 years after termination</span>
</div>
```

**The retention policy is displayed but NEVER enforced:**
- No cron job or scheduled function purges data after the stated periods
- `anonymize_function.sql` is not called automatically
- No `deleted_at` or `expires_at` columns on retention-relevant tables
- No automated workflow to trigger anonymization of expired records
- The `anonymize_candidate_data` function requires manual invocation with specific email

**Violations:**
- **PDPA §37**: Must have measures to ensure data is not kept longer than necessary
- **GDPR Art.5(1)(e)**: Storage limitation — data must be kept no longer than necessary
- **PDPA §26**: Sensitive data retention must be explicitly justified

**Remediation:**
1. Create a cron-triggered Edge Function `apply-retention-policy` that runs weekly
2. Add `expires_at` TIMESTAMPTZ columns to tables containing PII
3. Implement automatic anonymization/deletion when `expires_at < NOW()`
4. Log all retention-driven deletions to audit log
5. Add configurable retention periods per company/industry (Thai labor law requires 2 years for CVs, 7-10 years for payroll)

---

### F11 — MEDIUM: Excessive PII Collection — LINE/WhatsApp IDs (PDPA §26 / GDPR Art.5(1)(c))

**File:** `supabase/migrations/20240101000005_candidates.sql:15-16`

```sql
line_user_id VARCHAR(255),
whatsapp_phone VARCHAR(50),
```

**These are stored without:**
- Explicit consent from the candidate for collecting chat platform identifiers
- Notice that chat platform IDs are being stored
- Data minimization justification — why does a candidate record need LINE user ID?
- Separate retention policy for platform messaging data
- Security controls — `line_user_id` could be used to deanonymize candidates if the LINE database is breached

**Additionally, `full_name_th` and `preferred_language` in the candidates table collect ethnicity-revealing data (name in Thai script) — potentially sensitive under PDPA §26.**

**Violations:**
- **PDPA §26**: Sensitive data requires explicit consent; language/ethnicity indicators may qualify
- **GDPR Art.5(1)(c)**: Data minimization principle
- **GDPR Art.9**: Special categories of personal data (ethnic origin if name indicates ethnicity)

**Remediation:**
1. Separate chat platform IDs into a dedicated `candidate_platform_connections` table with own consent
2. Add consent check before storing LINE/WhatsApp identifiers
3. Evaluate whether `full_name_th` is necessary for business purpose
4. Add explicit consent checkbox for chat platform data collection

---

### F12 — MEDIUM: No Cross-Border Transfer Assessment (PDPA §28 / GDPR Art.44-49)

**Infrastructure analysis:**
- Supabase: US-based (AWS US regions) — PII stored on US servers
- Sentry: US-based — error telemetry includes PII
- Resend: US-based — email content contains PII
- Google Gemini: US-based — AI prompts may contain PII
- Vercel: US-based — static assets served from CDN, but no PII (frontend only)

**No documented:**
- Cross-border data transfer impact assessment
- Adequacy determination for Thailand → US transfers
- Standard Contractual Clauses signed with sub-processors
- Data subject notification about cross-border transfers
- List of all sub-processors and their processing locations

**Violations:**
- **PDPA §28**: Cross-border transfer requires:
  - Adequate protection standards in destination country, OR
  - Data subject consent (with notice of inadequate protection), OR
  - Contractual safeguards (SCCs)
- **GDPR Art.44-49**: Transfers require adequacy decision, SCCs, BCRs, or explicit consent

**Remediation:**
1. Map all data flows to sub-processors and their jurisdictions
2. Verify Supabase (US), Sentry (US), Resend (US), Google (US) have adequate DPAs
3. Where Thailand PDPA applies, obtain explicit consent for cross-border transfer
4. Review Supabase's data residency options (Supabase offers EU regions)
5. Document the cross-border transfer mechanism in the privacy policy

---

### F13 — LOW: Error Handler PII in LocalStorage (PDPA §37 / GDPR Art.32)

**File:** `src/lib/errorHandler.ts:103-115`

```typescript
function persistLocally(payload: AppErrorPayload) {
  const buf = JSON.parse(localStorage.getItem('adminmate:client-errors') || '[]')
  buf.push(payload)
  localStorage.setItem('adminmate:client-errors', JSON.stringify(buf.slice(-50)))
}
```

**Stores in browser localStorage:**
- Full error messages that may contain PII from API responses
- URL of the page where the error occurred (may contain PII in path/query)
- `userAgent` string
- Timestamp

**Additionally, `sendToEndpoint` (line 78-101) sends this to Supabase `activity_log` table where company admins can see the raw error data.**

**Violations:**
- **PDPA §37**: Security measures include limiting data stored locally
- **GDPR Art.32**: Pseudonymization of personal data in error logs

**Remediation:**
1. Sanitize `message` and `url` before storing to localStorage (strip email patterns, query params)
2. Implement localStorage data expiration (auto-clear after 24 hours)
3. Limit stack trace depth in persisted data
4. Add a startup check to purge old error buffers

---

### F14 — LOW: Auth Token in localStorage (PDPA §37 / GDPR Art.32)

**File:** `src/lib/supabase.ts:13-20`

```typescript
export const SUPABASE_AUTH_OPTIONS = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'pkce' as const,
  storageKey: 'adminmate-auth-token',
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
}
```

**Notable:**
- PKCE flow mitigates token interception risk
- But `localStorage` is readable by any JavaScript on the same origin (XSS vulnerability)
- No `httpOnly` or `SameSite` cookie option (not possible with Supabase client)
- Token persists in localStorage even after browser close until explicitly logged out

**This is a common pattern and the risk is LOW due to PKCE, but should be noted.**

**Remediation:**
1. Use `sessionStorage` as fallback for non-remember-me logins
2. Implement token encryption before storing to localStorage
3. Add idle session timeout (auto-logout after 30 minutes of inactivity)
4. Clear localStorage on tab/window close for sensitive environments

---

## Compliance Checklist Summary

### PDPA (Thailand) — Required vs. Implemented

| PDPA Section | Requirement | Status | Finding |
|---|---|---|---|
| §23 | Consent must be specific, informed, freely given | ❌ FAIL | F1 |
| §24 | Withdrawal as easy as giving consent | ❌ FAIL | F5 |
| §26 | Sensitive data explicit consent | ⚠️ PARTIAL | F1, F11 |
| §28 | Cross-border transfer safeguards | ❌ FAIL | F12 |
| §30 | Right of access | ⚠️ PARTIAL | F9 |
| §31 | Right to rectification | ✅ OK | |
| §32 | Right to restrict processing | ⚠️ PARTIAL | F5 |
| §33 | Right to erasure | ❌ FAIL | F2, F4 |
| §34 | Right to data portability | ⚠️ PARTIAL | F9 |
| §37 | Security measures (encryption, access control) | ❌ FAIL | F3, F6, F7, F13 |
| §41 | Data breach notification | ⚠️ NOT TESTED | |
| §42 | DPO appointment | ⚠️ PARTIAL | |

### GDPR (EU) — Required vs. Implemented

| GDPR Article | Requirement | Status | Finding |
|---|---|---|---|
| Art.5(1)(a) | Lawfulness, fairness, transparency | ⚠️ PARTIAL | F1 |
| Art.5(1)(c) | Data minimization | ❌ FAIL | F11 |
| Art.5(1)(e) | Storage limitation | ❌ FAIL | F10 |
| Art.5(1)(f) | Integrity and confidentiality | ❌ FAIL | F6, F7 |
| Art.6 | Lawfulness of processing | ⚠️ PARTIAL | F1 |
| Art.7 | Conditions for consent | ❌ FAIL | F1, F5 |
| Art.17 | Right to erasure | ❌ FAIL | F2, F4 |
| Art.20 | Data portability | ⚠️ PARTIAL | F9 |
| Art.25 | Data protection by design/default | ⚠️ PARTIAL | F3, F10 |
| Art.30 | Records of processing activities | ⚠️ PARTIAL | F6 |
| Art.32 | Security of processing | ❌ FAIL | F3, F7, F13, F14 |
| Art.33 | Personal data breach notification | ⚠️ NOT TESTED | |
| Art.44-49 | Cross-border data transfers | ❌ FAIL | F12 |

---

## Infrastructure Weaknesses

### 1. Supabase Service Role Key Usage
The `export-user-data` and `delete-user-data` Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` which bypasses all RLS policies. While these functions do authorization checks, any bug in the auth check logic could expose ALL users' data. Consider using the user's own JWT + RLS where possible.

### 2. Activity Log vs Audit Log Duplication
There are TWO logging tables: `audit_logs` (from migration 00014) and `activity_log` (from migration 02000006). Both store similar data but with different schemas. This creates confusion about which is the authoritative audit trail.

### 3. CSP Headers
The launch checklist mentions CSP (Content Security Policy) headers but no implementation was found. Without CSP, XSS risks that could compromise localStorage tokens and PII are unmitigated.

### 4. Rate Limiting on Sensitive Endpoints
- Export: 3 per hour per user — adequate
- Deletion: 1 per hour per user — adequate but client-side retries could bypass this
- No rate limiting on PDPAPage `/settings` API calls

---

## Recommended Remediation Priority

### Immediate (Week 1-2)
1. **F3**: Add Sentry `beforeSend` hook with PII scrubbing
2. **F1**: Fix PDPAConsentBanner — add email, granular purposes, withdrawal
3. **F2**: Fix delete-user-data — fix candidates WHERE clause, add missing tables, add true deletion option

### Short-term (Week 3-4)
4. **F6**: Add append-only trigger to audit_logs
5. **F7**: Encrypt signature_data in document_signatures table
6. **F5**: Add consent withdrawal UI to PDPAPage
7. **F4**: Replace MD5-based anonymization with crypto-random identifiers

### Medium-term (Month 2)
8. **F10**: Implement cron-based retention policy enforcement
9. **F12**: Complete cross-border transfer assessment and documentation
10. **F8**: Add email PII audit logging and encryption verification
11. **F9**: Add password protection or pre-signed URL for data exports

### Ongoing
12. **F11**: Review all PII fields for data minimization compliance
13. **F13**: Implement error log sanitization
14. **F14**: XSS prevention and token security hardening
15. Regular privacy impact assessments (PIA) every 6 months

---

## Scoring Methodology

| Criteria | Weight |
|----------|--------|
| PII data exposure | 30% |
| Legal/regulatory violation | 25% |
| Remediation complexity | 20% |
| User rights impact | 15% |
| Auditability | 10% |

**Overall Score: 54/100 — MODERATE RISK**

---

*End of Report. Review cycle: Recommended quarterly or upon any significant feature change involving personal data processing.*
