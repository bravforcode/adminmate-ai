# Security — AdminMate AI

## Authentication

- **PKCE flow** (OAuth 2.0 with Proof Key for Code Exchange) via Supabase Auth — the most secure OAuth flow for SPAs, resistant to authorization code interception.
- **JWT with auto-refresh** — Supabase JS client handles token refresh automatically before expiry. Sessions persist in `localStorage` via Zustand middleware.
- **Google OAuth provider** — one-click sign-in for Gmail/GSuite users.
- **Session validation** — `AuthGuard` component (`src/router/AuthGuard.tsx`) wraps all protected routes. It checks `authStore.session` and redirects to `/login` if absent. It also checks `authStore.company` and redirects to `/setup-company` for new users.

### Password Policy

Enforced by Supabase Auth defaults:
- Minimum 6 characters
- Rate-limited login attempts (5 per minute per IP)
- Email confirmation required for registration

## Authorization

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

## Data Protection

- **Encryption at rest** — Supabase PostgreSQL uses AES-256 encryption for data at rest.
- **Encryption in transit** — HTTPS enforced by Vercel (frontend) and Supabase (API). HSTS headers set.
- **CV files** — Stored in Supabase Storage private buckets. Access tokens are short-lived signed URLs (5 minutes).
- **PDPA compliance** — `pdpa_compliance` table tracks consent records per Thai PDPA requirements. Users can request data deletion via `/settings/compliance`.
- **Data retention** — The `anonymize_function` (migration `00026`) supports automatic anonymization of personal data for records older than 2 years.

## Edge Function Security

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | JWT verification via `supabase.auth.getUser()` in every client-invoked function header |
| **Cron security** | `CRON_SECRET_KEY` validated in `Authorization` header for `send-document-reminders` |
| **Rate limiting** | Per-company rate limits in `rate_limits` table, enforced in Edge Functions |
| **Usage tracking** | Every Gemini API call logged to `ai_usage_log` with company context |
| **Error sanitization** | `try/catch` wraps all Edge Function logic. Only generic error messages returned to client — raw errors logged server-side only |

## Chat Platform Security

### LINE Webhook

- HMAC-SHA256 signature verification on every incoming webhook.
- Signature is computed from the raw request body + `LINE_CHANNEL_SECRET`.
- Requests with invalid signatures return 403.

### WhatsApp Webhook

- `verify_token` challenge-response for webhook registration.
- All messages validated against `WHATSAPP_VERIFY_TOKEN`.
- Incoming phone numbers matched against `chat_platform_connections` records.

### Token Storage

All platform tokens (`LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`) are stored as Supabase Edge Function secrets (Supabase Vault). They are never exposed to client-side code or committed to the repository.

## Production Checklist

- [ ] All `.env.local` values verified — no placeholder values
- [ ] RLS policies enabled on all 18 tables (verify with `supabase db push --dry-run`)
- [ ] `VITE_SUPABASE_ANON_KEY` is the **anon** key, not the service_role key
- [ ] No secrets in the client bundle (verify with `npm run build && grep -r "GEMINI_API_KEY\|service_role" dist/`)
- [ ] Storage buckets have RLS policies (migration `00025`)
- [ ] `AuthGuard` redirects working for unauthenticated + no-company states
- [ ] PDPA consent flow functional end-to-end
- [ ] Error messages in production are sanitized (no raw Supabase/PostgreSQL errors)
- [ ] LINE webhook signature verification active
- [ ] WhatsApp webhook URL verified and responding
- [ ] `CRON_SECRET_KEY` set to a cryptographically random value
- [ ] Sentry DSN configured for production error tracking
- [ ] CORS configured in Vercel (`vercel.json`)
- [ ] CSP headers configured (nonce-based or strict-dynamic for Vite)
- [ ] Supabase rate limiting enabled on auth endpoints
- [ ] Email templates use Resend verified domain
- [ ] Google OAuth consent screen approved and published
