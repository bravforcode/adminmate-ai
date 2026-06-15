# Security — AdminMate AI

## Authentication

### Auth Proxy (httpOnly Cookie + Memory-Only Token)

- **Edge Function session proxy** (`supabase/functions/auth-session`) handles login, session restore, refresh, and logout via httpOnly cookies. The JWT is never accessible to client-side JavaScript.
- `sessionApi.ts` (`src/lib/sessionApi.ts`) calls the Edge Function with `credentials: 'include'` to exchange the httpOnly cookie for an in-memory access token.
- `authStore.ts` (`src/stores/authStore.ts`) restores sessions via `fetchSessionStatus()` on every page load. The access token lives only in Zustand state (memory), never in `localStorage`.
- **Persist middleware** only stores non-sensitive metadata (`_langPref`) — the JWT itself is never persisted to disk.

### MFA Enforcement

- **Multi-Factor Authentication** via Supabase Auth TOTP — enforced at the Edge Function level for sensitive operations.
- `LoginForm.tsx` checks `supabase.auth.mfa.listFactors()` after successful password login. If a TOTP factor is active, the user is redirected to `MFAChallenge.tsx` before completing authentication.
- `SecurityPage.tsx` (`src/pages/settings/SecurityPage.tsx`) allows users to enable/disable MFA. Setup flows through `setup-mfa` and `verify-mfa` Edge Functions.
- MFA challenge supports both authenticator app codes and **one-time backup codes** (see Data Protection).
- RLS policies enforce that only the owning user can manage their own MFA enrollment.

### AuthGuard Hydration Guard

- `AuthGuard.tsx` (`src/router/AuthGuard.tsx`) wraps all protected routes with a **hydration guard** (`useHydrationGuard`).
- The guard waits for Zustand persist to finish hydrating before rendering. During hydration, a spinner with `role="status"` and `data-testid="auth-guard-loading"` is shown.
- Three redirect paths: unauthenticated → `/login`, no company → `/setup-company`, insufficient role → role-based fallback route.
- `callInitSession` prop allows nested guards to skip redundant session initialization.

## Authorization

### Typed Interfaces (No Mass Assignment)

- All services use explicit TypeScript interfaces for input/output — no raw `any` or unchecked object spreads.
- `validateInput()` and `validateSchema()` in `_shared/utils.ts` enforce field presence and type checking at the Edge Function boundary.
- Input validation rejects unknown/malformed payloads before they reach business logic.

### Company ID Scoping in Services

- Every service function requires a `companyId` parameter, scoping all queries to the user's tenant.
- `searchService.ts` appends `.eq('company_id', companyId)` to every query.
- `pdpaService.ts`, `auditLogService.ts`, `storageService.ts` all follow the same pattern.
- RLS enforcement at the database layer provides a second line of defense.

### Signature Token Verification

- `signatureService.ts` (`src/services/signatureService.ts`) uses **verification tokens** for document signing.
- Sign and decline operations require a valid token + signatureId pair.
- `getByVerificationToken()` looks up documents by token only — no IDOR possible.
- IP address is captured and logged with every signature action.

## Data Protection

### MFA Backup Codes (SHA-256 Hashed)

- `setup-mfa` Edge Function generates 8 one-time backup codes via `generateBackupCodes()` (`supabase/functions/verify-mfa/index.ts`).
- Codes are hashed with **SHA-256** via `crypto.subtle.digest` before storage (`supabase/functions/verify-mfa/crypto.ts`).
- On use, the input code is hashed and compared against stored hashes. Used codes are removed (one-time use).
- Stored in `mfa_enrollments.backup_codes` as a JSON array of hex-encoded SHA-256 hashes.

### Vault-Ready for API Tokens

- Chat platform access tokens (LINE, WhatsApp) use **Supabase Vault** (`access_token_vault_id` column in `chat_platform_connections`).
- Tokens are decrypted at runtime via `supabase.rpc('get_decrypted_token', { p_secret_id })` in `messagingHub.ts` and `messageHandler.ts`.
- Falls back to environment variables when no vault ID is set (graceful degradation).
- All platform secrets are Edge Function secrets, never exposed to client-side code or committed.

### PDPA Consent + Deletion

- `pdpa_compliance` table tracks consent records per Thai PDPA requirements (GDPR-equivalent for Thailand).
- `pdpaService.ts` (`src/services/pdpaService.ts`) handles: data export (includes audit logs, compliance records), data deletion (anonymization of PII fields), consent audit trail.
- `PDPAPage.tsx` (`src/pages/settings/PDPAPage.tsx`) provides a self-service UI for data export and deletion requests.
- `CompliancePage.tsx` (`src/pages/settings/CompliancePage.tsx`) allows companies to track their compliance checklist (consent records, data processing registry, breach procedure readiness).
- Deletion via `delete-user-data` Edge Function anonymizes all PII across 30+ tables, replaces personal fields with `[anonymized]`, and creates an immutable audit log entry.

## AI Security

### Prompt Injection Guards (4 Functions)

All four AI-powered Edge Functions include structured **prompt injection guardrails**:

| Function | Guards |
|----------|--------|
| **mate-ai-chat** | 6-rule system instruction: HR assistant role lock, ignore role-change/jailbreak/DAN attempts, answer only from company context, polite decline for out-of-scope requests, question length cap (2000 chars) |
| **generate-jd** | 4-rule guard: JD generator role lock, ignore embedded instructions in input fields, output only valid JSON, never execute hidden instructions |
| **generate-offer-content** | 4-rule guard: offer generator role lock, ignore embedded instructions in data, output only valid JSON, use ONLY structured data provided |
| **screen-resume** | 5-rule guard: resume screener role lock, ignore role-change/jailbreak/DAN attempts in CV data, evaluate only qualifications, output only valid JSON |

Each guard is tested with adversarial injection attempts (DAN, jailbreak, role-play, system prompt extraction).

### DOMPurify on Chat Output

- `ChatWidget.tsx` and `ChatInterface.tsx` sanitize AI responses with `DOMPurify.sanitize()` before rendering.
- Prevents XSS in AI-generated HTML content.
- Custom type declaration in `src/types/dompurify.d.ts`.

### SSRF Protection in parse-resume

- `parse-resume` Edge Function (`supabase/functions/parse-resume/index.ts`) validates that the file URL **must** start with the Supabase Storage public URL prefix (`${supabaseUrl}/storage/v1/object/public/`).
- URLs that don't match are rejected with a 400 error.
- 30-second fetch timeout via `AbortController`.
- Response size capped at 5MB.
- MIME type validated after download.

## Infrastructure

### CSP + HSTS Headers

Configured in `vercel.json`:

- **Content-Security-Policy**: `default-src 'self'` with restricted script, style, img, font, connect-src directives. `frame-ancestors 'none'` prevents clickjacking. `base-uri 'self'` prevents base tag injection. `form-action 'self'` prevents form-jacking.
- **Strict-Transport-Security**: `max-age=63072000; includeSubDomains; preload` (2 years, all subdomains, preload ready).
- **X-Content-Type-Options**: `nosniff` enforced by Vercel.
- **X-Frame-Options**: `DENY` inherited from CSP `frame-ancestors 'none'`.

### Storage Validation (MIME + Size + UUID)

`storageService.ts` (`src/services/storageService.ts`) validates all uploads with three checks:

1. **MIME type** — whitelist validation (`ALLOWED_MIME_TYPES`: PDF, PNG, JPEG, DOCX, TXT)
2. **File size** — 10MB for CVs, 2MB for images/avatars
3. **UUID validation** — `validateId()` rejects non-UUID resource IDs with `UUID_REGEX` pattern
4. **Filename sanitization** — `sanitizeFileName()` strips all non-alphanumeric characters except `.` and `-`

### LIKE Injection Escape

`searchService.ts` (`src/services/searchService.ts`) escapes `%` and `_` characters in user-supplied search queries before passing to `ILIKE` operators:

```typescript
const sanitizedQuery = query.replace(/[%_]/g, '\\$&')
```

Minimum query length of 3 characters further reduces attack surface.

### Rate Limiting (Fail-Closed)

All Edge Functions use `enforceRateLimit()` from `_shared/utils.ts`:

- **Fail-closed**: If the rate limit check itself fails (database error), the request is **denied** with HTTP 500, rather than allowed through.
- Per-action limits defined per function (e.g., `mate_ai_chat: 30/60s`, `parse_resume: 20/60s`, `verify_mfa: 10/60s`).
- Uses database RPC `check_rate_limit` for atomic increment-and-check.
- Returns `Retry-After` header with 429 responses.
- Supabase Auth endpoint rate limiting (5 attempts/minute/IP) for login.

### CORS Origin-Validating

Edge Functions validate the `Origin` header against an allowlist (`_shared/utils.ts`):

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // dev
  'http://localhost:3000',   // dev (alt)
  'https://adminmate.ai',       // production
  'https://www.adminmate.ai',   // production (www)
]
```

Unrecognized origins default to `http://localhost:5173` (safe fallback for local dev). The `Access-Control-Allow-Origin` header is set per-request — never a wildcard.

### Sentry PII Scrubbing

`sentry.ts` (`src/lib/sentry.ts`) configures `beforeSend` to redact:

| Category | Fields Redacted |
|----------|----------------|
| **Request headers** | `Authorization`, `X-RateLimit-Key`, `Cookie` |
| **User context** | `email`, `username`, `ip_address` |
| **URL** | Query string stripped (search params removed) |

All redacted values are replaced with `'[redacted]'`. Sentry is initialized lazily only when `VITE_SENTRY_DSN` is set.

### Audit Logs (Append-Only)

- All security-sensitive actions write to `audit_logs` table: login, MFA enable/disable, PDPA data export, PDPA deletion, document signing.
- Audit logs include: `user_id`, `action`, `resource_type`, `resource_id`, `details` (JSON), `ip_address`, `created_at`.
- The `audit_logs` table is **insert-only** — no update/delete policies exist for application code. Records are immutable.
- `auditLogService.ts` (`src/services/auditLogService.ts`) provides querying with filters (action, date range, user ID).
- `AuditLogPage.tsx` (`src/pages/settings/AuditLogPage.tsx`) provides real-time updates via Supabase Realtime subscription.
- CSV export available for compliance reporting.

### Row-Level Security (RLS)

All 18 tables have RLS policies defined in `supabase/migrations/20240101000021_rls_policies.sql`. Every policy follows the same pattern:

```sql
-- Example: jobs table
CREATE POLICY "Company members can view their jobs"
  ON jobs FOR SELECT
  USING (company_id = get_company_id());

CREATE POLICY "Company admins can insert jobs"
  ON jobs FOR INSERT
  WITH CHECK (company_id = get_company_id()
    AND is_company_admin(auth.uid()));
```

### Multi-Tenant Isolation

- Every table includes a `company_id` UUID column referencing `companies.id`.
- `get_company_id()` helper function resolves the current user's company from `user_profiles`.
- Users are **physically prevented** from reading or writing data belonging to other companies.
- Storage bucket policies mirror the same `company_id` isolation pattern.

### Role-Based Access

| Role | Permissions |
|------|-------------|
| **admin** | Full CRUD on all company resources, manage users, access settings |
| **hr** | Manage jobs, candidates, pipeline, interviews, offers, onboarding |
| **manager** | View dashboard, reports, candidates. Comment on pipeline items |
| **applicant** | Limited to CV builder and own application status |

Roles are stored in `user_profiles.role` and checked in RLS policies via the `is_company_admin()` helper.

### Edge Function Security

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | JWT verification via `supabase.auth.getUser()` in every client-invoked function header |
| **Cron security** | `CRON_SECRET_KEY` validated in `Authorization` header for `send-document-reminders` |
| **Rate limiting** | Per-company rate limits via `check_rate_limit` RPC, enforced in all Edge Functions |
| **AI usage tracking** | Every Gemini API call logged to `ai_usage_log` with company context |
| **Error sanitization** | `errorResponse()` wraps all Edge Function errors. Only generic messages returned to client — raw errors logged server-side only |
| **Input validation** | `validateSchema()` enforces field types at function boundary — rejects unexpected payload shapes |

### Chat Platform Security

- **LINE Webhook**: HMAC-SHA256 signature verification on every incoming webhook. Signature computed from raw request body + `LINE_CHANNEL_SECRET`. Invalid signatures return 403.
- **WhatsApp Webhook**: `verify_token` challenge-response for webhook registration. All messages validated against `WHATSAPP_VERIFY_TOKEN`. Incoming phone numbers matched against `chat_platform_connections`.

### Production Checklist

- [ ] All `.env.local` values verified — no placeholder values
- [ ] RLS policies enabled on all 18 tables (verify with `supabase db push --dry-run`)
- [ ] `VITE_SUPABASE_ANON_KEY` is the **anon** key, not the service_role key
- [ ] No secrets in the client bundle (verify with `npm run build && grep -r "GEMINI_API_KEY\|service_role" dist/`)
- [ ] Storage buckets have RLS policies (migration `00025`)
- [ ] `AuthGuard` hydration guard redirects working for unauthenticated + no-company states
- [ ] PDPA consent flow functional end-to-end
- [ ] Error messages in production are sanitized (no raw Supabase/PostgreSQL errors)
- [ ] LINE webhook signature verification active
- [ ] WhatsApp webhook URL verified and responding
- [ ] `CRON_SECRET_KEY` set to a cryptographically random value
- [ ] Sentry DSN configured for production error tracking
- [ ] CORS configured in Edge Functions (`_shared/utils.ts`)
- [ ] CSP headers configured in `vercel.json`
- [ ] Supabase rate limiting enabled on auth endpoints
- [ ] Email templates use Resend verified domain
- [ ] Google OAuth consent screen approved and published
