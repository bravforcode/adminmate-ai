# Backend, Database & Security Audit

**Audit Date:** 2026-06-03  
**Project:** AdminMate AI  
**Auditor:** Senior Security Reviewer + Backend Architect  

---

## Supabase Configuration

### Environment Variables
| File | Status | Notes |
|------|--------|-------|
| `.env.local` | **PRESENT** | Contains valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. 7 vars total. Anon key is publicly visible (expected for client-side). |
| `.env.example` | **PRESENT** | Documents all needed vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_APP_NAME`, `GEMINI_API_KEY` (commented, for Edge Functions), `VITE_ENABLE_LINE/VITE_ENABLE_WHATSAPP/VITE_ENABLE_ZALO`, `VITE_SENTRY_DSN`. **Missing**: No `VITE_GEMINI_MODEL` documented (referenced in `src/lib/ai-config.ts`). |

### Supabase Client Initialization (`src/lib/supabase.ts`)
- **PKCE flow**: `flowType: 'pkce'` - **ENABLED** ✓
- **Auto-refresh token**: `autoRefreshToken: true` - **ENABLED** ✓
- **Session persistence**: `persistSession: true` - **ENABLED** ✓
- **URL detection**: `detectSessionInUrl: true` - **ENABLED** ✓
- **Realtime**: Configured with `eventsPerSecond: 10` ✓
- **Fallback**: Falls back to `http://localhost:54321` and `'mock-anon-key'` if env vars missing. Acceptable for dev, but in production this would cause silent failures masked by a `console.warn`.

### Hardcoded Supabase URLs
- **No hardcoded URLs in src/** - all matches are in `node_modules/` (Supabase SDK documentation) or `.env.local`.
- The actual project ref `nickivumteyrezptjggk` is only in `.env.local` (gitignored).
- `.env.example` uses placeholder `your-project.supabase.co`.

---

## Database Schema Audit

### Table Inventory (26 migration files)

| # | Migration | Table(s) | company_id | RLS | CASCADE on co. delete | Status |
|---|-----------|----------|------------|-----|----------------------|--------|
| 01 | extensions | - | N/A | N/A | N/A | ✓ uuid-ossp, pgcrypto, pg_trgm |
| 02 | companies | `companies` | N/A (IS the company) | In #21 | N/A | ✓ |
| 03 | user_profiles | `user_profiles` | ✓ ON DELETE SET NULL | In #21 | SET NULL | ✓ |
| 04 | jobs | `jobs` | ✓ | In #21 | ✓ | created_by FK no ON DELETE |
| 05 | candidates | `candidates` | ✓ | In #21 | ✓ | ✓ |
| 06 | cv_documents | `cv_documents` | ✓ | In #21 | ✓ | ✓ |
| 07 | applications | `applications` | ✓ | In #21 | ✓ | UNIQUE(job_id, candidate_id) ✓ |
| 08 | interviews | `interviews` | ✓ | In #21 | ✓ | ✓ |
| 09 | offers | `offers` | ✓ | In #21 | ✓ | job_id FK: **NO ON DELETE** |
| 10 | documents | `documents` | ✓ | In #21 | ✓ | ✓ |
| 11 | onboarding | `onboarding_checklists`, `onboarding_tasks` | ✓ | In #21 | ✓ | offer_id FK: no ON DELETE on checklists |
| 12 | chat_messages | `chat_messages` | ✓ | In #21 | ✓ | ✓ |
| 13 | notifications | `notifications` | ✓ (nullable) | In #21 | ✓ | Insert policy is `WITH CHECK (true)` |
| 14 | audit_logs | `audit_logs` | ✓ (nullable) | In #21 | ✓ | **No INSERT policy** |
| 15 | chat_platform_connections | `chat_platform_connections` | ✓ | In #21 | ✓ | Stores `access_token` as plain TEXT |
| 16 | ai_usage_log | `ai_usage_log` | ✓ | **MISSING** | **NO CASCADE** | Blocking company delete |
| 17 | rate_limits | `rate_limits` | ✓ | **MISSING** | **NO CASCADE** | Blocking company delete |
| 18 | subscriptions | `subscriptions` | ✓ UNIQUE | **MISSING** | **NO CASCADE** | Blocking company delete |
| 19 | pdpa_compliance | `pdpa_consents`, `data_deletion_requests` | ✓ | **MISSING** | **NO CASCADE** | Blocking company delete |
| 20 | - | RLS functions | N/A | N/A | N/A | 3 helper functions |
| 21 | - | RLS policies | 15 tables | 15 enabled | N/A | See analysis below |
| 22 | - | Indexes | 24 indexes | N/A | N/A | ✓ |
| 23 | - | Triggers | 3 triggers | N/A | N/A | ✓ |
| 24 | - | Analytics functions | 3 functions | N/A | N/A | ✓ |
| 25 | - | Storage buckets | 5 buckets | **NO RLS** | N/A | Storage bucket policies missing |
| 26 | - | Anonymize function | 1 function | N/A | N/A | PDPA compliant ✓ |

### RLS Policy Deep-Dive (`20240101000021_rls_policies.sql`)

**Tables with RLS ENABLED (15):** companies, user_profiles, jobs, candidates, cv_documents, applications, interviews, offers, documents, onboarding_checklists, onboarding_tasks, chat_messages, notifications, audit_logs, chat_platform_connections

**Tables WITHOUT RLS (5):** ai_usage_log, rate_limits, subscriptions, pdpa_consents, data_deletion_requests — **CRITICAL GAP**

**Policy-by-policy analysis:**

| Table | SELECT | INSERT | UPDATE | DELETE | Issues |
|-------|--------|--------|--------|--------|--------|
| companies | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| user_profiles | by company | via ALL (admin/hr) | own record OR admin/hr | via ALL (admin/hr) | OK |
| jobs | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| candidates | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| cv_documents | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| applications | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| interviews | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| offers | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| documents | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| onboarding_checklists | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| onboarding_tasks | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |
| chat_messages | own messages | own user_id | none | none | No UPDATE/DELETE — messages are immutable by design? |
| **notifications** | own user_id | **WITH CHECK (true)** | own user_id | none | **CRITICAL: anyone can insert for any user** |
| audit_logs | by company | **NONE** | **NONE** | **NONE** | **Cannot write audit trail** |
| chat_platform_connections | by company | via ALL (admin/hr) | via ALL (admin/hr) | via ALL (admin/hr) | OK |

### RLS Helper Functions (`20240101000020_rls_functions.sql`)

Three `SECURITY DEFINER` functions, all `STABLE`:
1. **`get_user_company_id()`** — Returns `company_id` where `id = auth.uid()` AND `is_active = true`. Returns NULL if user is inactive or has no company. **Potential issue**: A new user with no company_id returns NULL, which means they can read nothing (could break onboarding flow).
2. **`is_admin_or_hr()`** — Roles: `['admin', 'hr']`. Also checks `is_active = true`.
3. **`is_company_admin()`** — Returns true only if role = `'admin'` and `is_active = true`. **Never used in any RLS policy** — all policies use `is_admin_or_hr()` instead. Dead code.

### Foreign Key ON DELETE Behavior

| Relationship | ON DELETE | Risk |
|-------------|-----------|------|
| jobs -> companies | CASCADE | OK |
| jobs -> user_profiles (created_by) | **NO ACTION** | Blocks user deletion if they created jobs |
| offers -> jobs | **NO ACTION** | Offee orphaned if job deleted; blocks job delete if offers exist |
| offers -> applications | CASCADE | Deleting application deletes offer ✓ |
| offers -> candidates | CASCADE | Deleting candidate deletes offer ✓ |
| onboarding_checklists -> offers | **NO ACTION** | Blocks offer deletion |
| onboarding_tasks -> user_profiles (completed_by) | **NO ACTION** | Blocks user deletion |
| ai_usage_log -> companies | **NO ACTION** | Blocks company deletion |
| rate_limits -> companies | **NO ACTION** | Blocks company deletion |
| pdpa_consents -> companies | **NO ACTION** | Blocks company deletion |
| pdpa_consents -> candidates | **NO ACTION** | Blocks candidate deletion |
| data_deletion_requests -> companies | **NO ACTION** | Blocks company deletion |
| subscriptions -> companies | **NO ACTION** | Blocks company deletion |

**Conclusion**: Company deletion will fail due to orphaned rows in ai_usage_log, rate_limits, pdpa_consents, data_deletion_requests, and subscriptions. This cascade blockage creates an inconsistent state where some data is deleted (via CASCADE on core tables) but other data blocks the transaction.

### Triggers (`20240101000023_triggers.sql`)

1. **`handle_new_user()`** — Creates user_profiles on `auth.users` INSERT. `SECURITY DEFINER`. Role defaults to `'hr'`. Full name defaults to email prefix. **Good**: uses `ON CONFLICT DO NOTHING` for idempotency. ✓
2. **`update_updated_at()`** — Updates timestamp on 13 tables. Uses dynamic SQL loop. ✓
3. **`update_job_filled_count()`** — Tracks hired count on `applications` status change. `SECURITY DEFINER`. Handles INSERT and UPDATE for hire/unhire. ✓

### Missing Indexes (Not Found in migration #22)

- `offers(company_id)` — missing
- `offers(candidate_id)` — missing
- `interviews(company_id)` — missing
- `chat_platform_connections(platform, is_active)` — missing for webhook lookups
- `candidates(line_user_id)`, `candidates(whatsapp_phone)` — missing for chat platform matching
- `pdpa_consents(candidate_id)`, `pdpa_consents(employee_id)` — missing

---

## Edge Functions Security Review

### Function-by-Function Analysis

| Function | Auth | Input Validation | Rate Limit | CORS | Secrets Handling | Risk |
|----------|------|-----------------|------------|------|------------------|------|
| `generate-jd` | ✓ Bearer JWT | Via body | ✓ 10/hr via `checkRateLimit` | ✓ | `Deno.env` only | Low |
| `parse-resume` | **✗ NONE** | Via body (companyId from request) | ✗ | ✓ | `Deno.env` only | **CRITICAL** |
| `screen-resume` | **✗ NONE** | Via body (companyId from request) | ✗ | ✓ | `Deno.env` only | **CRITICAL** |
| `generate-offer-content` | **✗ NONE** | Via body | ✗ | ✓ | `Deno.env` only | **CRITICAL** |
| `send-document-reminders` | **✗ NONE** | Via body (docId) | ✗ | ✓ | `Deno.env` only | **CRITICAL** |
| `mate-ai-chat` | ✓ Bearer JWT | companyId from body (not verified against user) | ✗ | ✓ (but 401 omits CORS) | `Deno.env` only | **HIGH** |
| `line-webhook` | ✗ HMAC sig | SHA256 signature + body | ✗ | ✗ | `Deno.env` only | Medium |
| `whatsapp-webhook` | ✗ verify_token (GET) | None for POST | ✗ | ✗ | `Deno.env` only | **HIGH** |
| `send-email` | **✗ NONE** | Via body | ✗ | ✓ | `Deno.env` only | **HIGH** |

### Detailed Findings

**CRITICAL — `parse-resume` (no auth):**
- Line 10: Accepts `cvDocumentId`, `candidateId`, `companyId` directly from request body with zero authentication.
- Any unauthenticated caller can read any CV document, update any candidate record, and consume AI credits.
- Accesses `GEMINI_API_KEY` and makes paid API calls.

**CRITICAL — `screen-resume` (no auth):**
- Line 10: Accepts `applicationId`, `jobId`, `cvDocumentId`, `companyId` from request body with zero auth.
- Reads job + CV details, consumes Gemini API, writes analysis results to application record.
- Cross-company data access trivially exploitable.

**CRITICAL — `generate-offer-content` (no auth):**
- Line 10: Accepts `offerId`, `language` from body. No auth.
- Reads offer + company + candidate data from DB, uses Gemini API, writes results.
- Exposes sensitive offer/salary data to anyone.

**CRITICAL — `send-document-reminders` (no auth):**
- Line 9: Accepts `docId` from body. No auth.
- Can read any document, send notifications impersonating any user.
- If no docId is passed, iterates **ALL** pending documents across all companies and sends reminders.
- This is a **mass-notification spam vector**.

**HIGH — `mate-ai-chat`:**
- Line 10: Authenticates user ✓
- Line 13: **Accepts `companyId` from request body** — a user could pass another company's ID and access their HR policies, company info, and HR contact data.
- The function retrieves company-specific data based on the **body-provided** `companyId`, not the authenticated user's `company_id`.
- 401 response on line 11 **omits CORS headers** (inconsistent with other functions).

**HIGH — `whatsapp-webhook`:**
- POST handler has **no signature validation** at all. Only GET verifies `hub.verify_token`.
- Any attacker who discovers the webhook URL can send fake messages through AdminMate to real WhatsApp users.

**HIGH — `send-email`:**
- No authentication. Anyone can call this and send emails from the configured sender.
- Uses Resend API key from `Deno.env` — could be abused for phishing/spam.

**Medium — `line-webhook`:**
- Has HMAC-SHA256 signature verification but **falls through if `LINE_CHANNEL_SECRET` is not set** (line 12: `if (secret && signature)`).
- CORS headers are not returned at all — uses bare `new Response('ok')` on error.
- Same `companyId` resolution issue: picks first active LINE connection, or falls back to `DEFAULT_COMPANY_ID` env var.

### Shared Utilities (`_shared/utils.ts`)
- CORS origin: `'*'` (permissive but acceptable for public API endpoints) — OK
- `verifyAuth()`: Extracts Bearer token, calls `supabase.auth.getUser()` — **correct implementation** ✓
- `checkRateLimit()`: Queries `ai_usage_log` table — reads from a table **without RLS**, which is acceptable only because it runs with SERVICE_ROLE_KEY.
- `validateInput()`: Basic field presence check, no type validation or sanitization. Only checks if keys exist on the object.

### Secrets Management in Edge Functions
All secrets are accessed via `Deno.env.get()` — **no hardcoded secrets found** in any edge function ✓.

Required secrets:
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — used by all functions (except `send-email`)
- `GEMINI_API_KEY` — used by generate-jd, parse-resume, screen-resume, generate-offer-content, mate-ai-chat
- `RESEND_API_KEY` — used by send-email
- `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` — used by line-webhook
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` — used by whatsapp-webhook
- `DEFAULT_COMPANY_ID` — used by line-webhook, whatsapp-webhook as fallback
- `EMAIL_FROM` — used by send-email

---

## Auth System Review

### PKCE Flow (`src/lib/supabase.ts` + `src/services/authService.ts`)
- PKCE is enabled at the client level ✓
- `signInWithPassword` with PKCE is handled by the Supabase SDK ✓
- OAuth (Google) redirects to `/dashboard` ✓
- Password reset redirects to `/reset-password` ✓

### Session Management (`src/stores/authStore.ts`)
- Session (user, profile, company) persisted via **zustand `persist` middleware** with `localStorage` key `'adminmate-auth'`
- **Risk**: localStorage is vulnerable to XSS — an attacker who achieves script injection can extract the full session
- No session expiry check on the client side — relies entirely on Supabase `autoRefreshToken`
- `partialize` stores user object, profile, and company — the Supabase `User` object includes JWT access token metadata

### AuthGuard (`src/router/AuthGuard.tsx`)
- Three-level protection: authenticated → has company → has right role ✓
- Unauthenticated → redirect to `/login` with `state.from` for return navigation ✓
- No company → redirect to `/setup-company` ✓
- Wrong role → redirect to `/dashboard` (silent, could confuse users)
- All protected routes are behind `<AuthGuard>` with default `requireCompany=true` ✓

### Role-Based Access
- Role check: `isAdminOrHR()` allows `['admin', 'hr']` ✓
- The `is_company_admin()` database function exists but is **never used in any RLS policy** — only `is_admin_or_hr()` is used
- **No role segregation between admin and hr** — both have identical ALL access on all tables
- The frontend `AuthGuard` supports `requiredRoles` prop but **no route uses it** — all protected routes are open to both admin and hr
- `'Owner'` role exists in `src/types.ts` but is never referenced in authStore or AuthGuard

### Registration Flow (`src/hooks/useAuth.ts` + `src/services/authService.ts`)
- Email/password sign-up with `emailRedirectTo: /login` ✓
- `handle_new_user()` trigger creates user_profiles with role default `'hr'` ✓
- No email confirmation enforcement visible in the codebase — depends on Supabase project settings

---

## Data Integrity

### Key Constraints

| Constraint | Present? | Notes |
|-----------|----------|-------|
| applications UNIQUE(job_id, candidate_id) | ✓ | Prevents duplicate applications |
| rate_limits UNIQUE(company_id, feature) | ✓ | One rate record per company per feature |
| subscriptions UNIQUE(company_id) | ✓ | One subscription per company |

### Relationship Integrity

**offers → applications**: 
- offer.application_id has ON DELETE CASCADE ✓
- offer.candidate_id has ON DELETE CASCADE ✓
- offer.job_id has **NO DELETE behavior** — if a job is deleted, offers for that job become orphaned. **No foreign key constraint to block deletion** means data inconsistency.

**documents → entity links**:
- All three entity FKs (candidate_id, employee_id, offer_id) use ON DELETE SET NULL ✓
- document.company_id uses ON DELETE CASCADE ✓

**onboarding → offers**:
- onboarding_checklists.offer_id has no ON DELETE — blocks offer deletion, or creates dangling reference if offer is deleted via CASCADE from application deletion

### Cascade Delete Analysis

If a company is deleted:
1. **CASCADED (automatic):** companies itself, user_profiles.company_id set to NULL, jobs, candidates, cv_documents, applications, interviews, offers, documents, onboarding_checklists, onboarding_tasks, chat_messages, notifications, audit_logs, chat_platform_connections
2. **BLOCKED (orphaned rows):** ai_usage_log, rate_limits, pdpa_consents, data_deletion_requests, subscriptions

**Result:** Company deletion transaction **will fail** unless these 5 tables are manually cleaned first. This is a significant operational issue.

---

## Secret & Credential Risk Scan

### Source Code Grep Results

**`src/` directory — grep for `password|secret|api_key|GEMINI_API_KEY|SERVICE_ROLE_KEY|RESEND_API_KEY`**:
- No hardcoded credentials found in any `.ts` or `.tsx` file ✓
- No JWT tokens, Bearer strings, or API keys hardcoded in source ✓
- `src/lib/ai-config.ts` references only `import.meta.env` values ✓
- `src/lib/sentry.ts` references only `import.meta.env.VITE_SENTRY_DSN` ✓
- The Supabase project ref (`nickivumteyrezptjggk`) is **only in `.env.local`** (gitignored) ✓

**Edge Functions (`supabase/functions/`):**
- All secrets via `Deno.env.get()` — **no hardcoded secrets** ✓

### Plaintext Token Storage
- **`chat_platform_connections.access_token`** — LINE/WhatsApp access tokens stored as plain TEXT in database. Anyone with DB read access (admin/hr role) can extract these tokens and impersonate the company's chat platforms. Should be encrypted at rest or stored in Supabase Vault.

### .gitignore Coverage
```
.env
.env.local
.env.*.local
```
- `.env.local` and `.env` are properly gitignored ✓
- Pattern `.env.*.local` covers staging/development variants ✓

### Test Files
- `tests/unit/utils/validators.test.ts` — tests password/email schemas with synthetic data only ✓
- `tests/unit/stores/authStore.test.ts` — no real credentials ✓
- `tests/unit/services/*.test.ts` — no real credentials ✓
- `tests/setup.ts` — no credentials ✓

### Git History
- Repository is **not a git repo** (`Is a directory a git repo: no`) — no git history risk assessment possible. If git is initialized with current `.env.local`, the anon key would be committed.

---

## Critical Issues Found

### ISSUE-C01: Four Edge Functions Skip Auth Verification
**Files:** `supabase/functions/parse-resume/index.ts`, `screen-resume/index.ts`, `generate-offer-content/index.ts`, `send-document-reminders/index.ts`  
**Impact:** Any unauthenticated caller can read/write database records, consume AI credits (Gemini API calls costing money), modify application data, generate offers, and trigger mass notifications across all companies.  
**Fix:** Add `verifyAuth(req, supabase)` at the top of each function and derive `companyId` from the authenticated user's profile, never from the request body.

### ISSUE-C02: Five Tables Missing RLS
**Tables:** `ai_usage_log`, `rate_limits`, `subscriptions`, `pdpa_consents`, `data_deletion_requests`  
**Impact:** These tables are completely unprotected. Any authenticated client can read/modify all rows across all companies. This exposes AI usage data, rate limits, subscription tiers, PDPA consent records, and data deletion requests.  
**Fix:** Enable RLS on all 5 tables and add SELECT/INSERT/UPDATE policies scoped to `company_id = get_user_company_id()`.

### ISSUE-C03: Audit Logs Cannot Be Written
**Table:** `audit_logs` (migration #14 + RLS policy)  
**Impact:** RLS policy only has a SELECT policy. No INSERT policy exists, meaning the audit trail can never be populated via client-side inserts. Edge functions using SERVICE_ROLE_KEY bypass RLS, but the application services have no mechanism to write audit entries.  
**Fix:** Add an INSERT policy: `CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (company_id = get_user_company_id());`

### ISSUE-C04: Notification Insert Policy is Unsafe
**Table:** `notifications` (migration #13, RLS policy line 52)  
**Current policy:** `CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);`  
**Impact:** Any authenticated user can insert notifications for **any user_id** in any company. This enables notification spam, social engineering, and phishing of other users.  
**Fix:** Change to `WITH CHECK (user_id = auth.uid())` for self-service, or `WITH CHECK (company_id = get_user_company_id() AND is_admin_or_hr())` for admin-sent notifications.

### ISSUE-C05: mate-ai-chat Uses Request Body companyId
**File:** `supabase/functions/mate-ai-chat/index.ts:13`  
**Impact:** Although the function verifies auth, it uses `companyId` from the request body to fetch company-specific data. A user could pass another company's ID and access their HR policies, company data, and HR contacts.  
**Fix:** Derive `companyId` from `supabase.from('user_profiles').select('company_id').eq('id', user.id)`.

---

## High Issues Found

### ISSUE-H01: send-email Has No Auth
**File:** `supabase/functions/send-email/index.ts`  
**Impact:** Anyone can send emails from the configured Resend sender. This is a spam/phishing vector that could get the sending domain blacklisted.  
**Fix:** Add `verifyAuth()` and restrict to admin/hr users.

### ISSUE-H02: whatsapp-webhook Lacks POST Signature Validation
**File:** `supabase/functions/whatsapp-webhook/index.ts`  
**Impact:** No HMAC validation on incoming messages — the endpoint can be spoofed to inject fake messages.  
**Fix:** Implement `x-hub-signature-256` validation using the WhatsApp app secret.

### ISSUE-H03: Chat Platform Access Tokens Stored in Plaintext
**Table:** `chat_platform_connections.access_token` (TEXT column)  
**Impact:** LINE and WhatsApp API access tokens are stored as plain text. Anyone with DB read access can extract and use these tokens externally.  
**Fix:** Use Supabase Vault for encryption at rest, or at minimum encrypt this column with `pgcrypto`.

### ISSUE-H04: Company Deletion Blocks Due to Orphaned FKs
**Tables:** `ai_usage_log`, `rate_limits`, `pdpa_consents`, `data_deletion_requests`, `subscriptions`  
**Impact:** These 5 tables have `REFERENCES companies(id)` without `ON DELETE CASCADE`. A company cannot be deleted if rows exist in these tables.  
**Fix:** Add `ON DELETE CASCADE` to all 5 foreign keys, or create a cleanup trigger.

### ISSUE-H05: offers.job_id Has No ON DELETE
**Table:** `offers.job_id UUID NOT NULL REFERENCES jobs(id)` — no ON DELETE clause  
**Impact:** Deleting a job with existing offers either fails or leaves offers with dangling job references (database-dependent).  
**Fix:** Add `ON DELETE CASCADE` or `ON DELETE SET NULL` with nullable column.

### ISSUE-H06: Auth State Stored in localStorage
**File:** `src/stores/authStore.ts` — uses zustand `persist` middleware  
**Impact:** The full Supabase User object (including JWT metadata) and user profile/company data are stored in localStorage, accessible to any XSS payload.  
**Fix:** Consider using `sessionStorage` for sensitive session data, or implement Content Security Policy headers to mitigate XSS risk.

---

## Medium Issues Found

### ISSUE-M01: No Storage Bucket RLS Policies
**File:** `supabase/migrations/20240101000025_storage_buckets.sql`  
**Impact:** Buckets are created without storage policies. cv-uploads is private but generated-docs may need per-company access control.  
**Fix:** Add storage RLS policies for each bucket scoped to company.

### ISSUE-M02: is_company_admin() is Dead Code
**File:** `supabase/migrations/20240101000020_rls_functions.sql:11-14`  
**Impact:** The `is_company_admin()` function exists but is never called in any RLS policy. All write policies use `is_admin_or_hr()`. This means there is no actual distinction between admin and hr at the database level.  
**Fix:** Either remove the dead function or use it to restrict admin-only operations (e.g., company settings changes, subscription management).

### ISSUE-M03: line-webhook Skips Verification if Secret is Missing
**File:** `supabase/functions/line-webhook/index.ts:12`  
**Impact:** `if (secret && signature)` means if `LINE_CHANNEL_SECRET` env var is not set, signature verification is silently skipped.  
**Fix:** Always require the secret for production; only skip in development mode.

### ISSUE-M04: No Rate Limiting on 4 of 5 AI Edge Functions
**Impact:** Only `generate-jd` implements rate limiting. `parse-resume`, `screen-resume`, `generate-offer-content`, `mate-ai-chat` have no rate limits despite all calling the paid Gemini API.  
**Fix:** Add `checkRateLimit()` to all AI-using functions.

### ISSUE-M05: No Email Verification Enforcement
**Impact:** The `authService.signUp()` flow does not enforce email verification on the client side. Whether email verification is required depends on Supabase project settings — which cannot be audited from code alone. If disabled, anyone can sign up with any email.  
**Fix:** Explicitly set `emailRedirectTo` or enforce verification in Supabase dashboard.

### ISSUE-M06: Missing Indexes on Lookup Columns
**Files:** Multiple migrations  
**Impact:** `candidates.line_user_id`, `candidates.whatsapp_phone`, `offers.company_id`, `offers.candidate_id`, `interviews.company_id`, `chat_platform_connections(platform, is_active)` have no indexes. These are used in webhook message routing and could cause performance degradation at scale.  
**Fix:** Add targeted indexes in a new migration.

### ISSUE-M07: mate-ai-chat 401 Response Omits CORS Headers
**File:** `supabase/functions/mate-ai-chat/index.ts:11`  
**Impact:** `return new Response('Unauthorized', { status: 401 })` — no CORS headers. Inconsistent with other functions that include `headers: corsHeaders` in error responses.  
**Fix:** Add `headers: corsHeaders` to the 401 response.

### ISSUE-M08: Optional Template Keys in send-email
**File:** `supabase/functions/send-email/index.ts:11-24`  
**Impact:** Email templates hardcoded with `any` type — no validation that `d.appUrl`, `d.name`, `d.title`, etc. are provided. Missing fields will appear as `undefined` in sent emails.  
**Fix:** Add proper TypeScript types and validate template data before constructing HTML.

### ISSUE-M09: No Error Sanitization in Edge Functions
**Impact:** All edge functions return `error.message` directly to the client. Internal error messages (DB errors, API errors) may leak schema details, table names, or infrastructure information.  
**Fix:** Log detailed errors server-side; return generic error messages to clients.

### ISSUE-M10: AuthGuard Roles Never Actually Used
**File:** `src/router/index.tsx` — no route passes `requiredRoles` prop to AuthGuard  
**Impact:** The `requiredRoles` feature in AuthGuard exists but is unused. All authenticated users with a company get access to all protected routes regardless of role.  
**Fix:** Add `requiredRoles={['admin']}` to settings/compliance routes or implement fine-grained role-based routing.

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| **CRITICAL** | 5 | Unauthenticated edge functions, missing RLS on 5 tables, unsafe notification policy, audit log unwritable, cross-company data exposure in chat |
| **HIGH** | 6 | Email spam vector, WhatsApp webhook spoofing, plaintext tokens, broken cascade deletes, localStorage session risk |
| **MEDIUM** | 10 | Missing storage policies, dead code, missing indexes, error sanitization, rate limiting gaps, CORS inconsistency, unused role routing |

**Overall Security Posture:** The database schema is well-structured with proper multi-tenancy via `company_id`. The RLS functions are correctly implemented as SECURITY DEFINER. However, **5 edge functions out of 9 are unauthenticated**, and **5 database tables lack RLS entirely** — these are the most urgent fixes. The auth system (PKCE, session handling, AuthGuard) is solid on the frontend side. The cascade delete chain breaks on 5 tables, which would prevent company deletion in production.
