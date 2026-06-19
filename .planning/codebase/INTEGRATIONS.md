# External Integrations

**Analysis Date:** 2026-06-19

## APIs & External Services

**Supabase (Primary Backend):**
- Used for: Auth, database (PostgreSQL), storage, realtime subscriptions, Edge Functions
- SDK: `@supabase/supabase-js` v2.46
- Auth: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (anonymous key, RLS-secured)
- Pattern: Direct browser client with PKCE flow; `authStorage.ts` in-memory shim for token storage
- Concern: `autoRefreshToken: false` — token refresh is manual via Edge Function

**Supabase Edge Functions:**
- `auth-session` — httpOnly cookie-based session management (status, refresh, login, logout)
- `log-client-error` — client-side error ingestion (called from error handler + ErrorBoundary)
- Base URL: `{VITE_SUPABASE_URL}/functions/v1/`

**Sentry (Optional Error Monitoring):**
- SDK: `@sentry/react` v10.56
- Activation: Only if `VITE_SENTRY_DSN` is set (dynamic import in `main.tsx`)
- Traces sample rate: 0.1
- `beforeSend` hook redacts Authorization headers, user emails, IPs, and URL query params
- Pattern: `Sentry.captureException(error)` in ErrorBoundary

## Data Storage

**Databases:**
- **Supabase PostgreSQL** — all application data
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` — direct browser queries (no backend proxy)
  - Tables: `user_profiles`, `companies`, `jobs`, `candidates`, `applications`, `interviews`, `documents`, `chat_messages`, `onboarding_checklists`, `audit_logs`, etc.
  - RPCs: `get_dashboard_stats`, `get_candidates_with_applications`, etc.

**File Storage:**
- **Supabase Storage** — via `supabase.storage.from()` 
  - Buckets not enumerated in source (likely CV documents, offer letters, etc.)

**Caching:**
- **TanStack React Query** — in-memory cache with configurable `staleTime` (30s default)
- **localStorage** — `adminmate-auth` (Zustand persist — `_langPref` only), `adminmate-theme`, `adminmate-language`, `adminmate-auth-token`, `adminmate:client-errors` (error buffer)
- No Redis, no CDN cache headers configured

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth** with PKCE flow
  - Implementation: `supabase.auth` directly with custom Edge Function for session restore
  - Login methods: email/password + Google OAuth (if enabled in Supabase)
  - Registration: email/password + auto company creation
  - Session storage: httpOnly cookies via Edge Function + in-memory Zustand (not localStorage)
  - `autoRefreshToken: false` — manual refresh via Edge Function

## Monitoring & Observability

**Error Tracking:**
- **Sentry** (optional) — dynamic import in `main.tsx`
- **Custom Edge Function** (`log-client-error`) — always-on error ingestion
- **localStorage** error buffer (`adminmate:client-errors`) — last 50 errors

**Logs:**
- DEV-only `console.*` logging with `[errorHandler]`, `[perf]`, `[safeFetch]` prefixes
- No structured production logging library
- Error payload shape: `AppErrorPayload` with type, message, stack, URL, userAgent, severity, userId, companyId, timestamp

## CI/CD & Deployment

**Hosting:**
- **Vercel** — `vercel.json` present in root

**CI Pipeline:**
- **GitHub Actions** — `.github/` directory present (contents not analyzed)

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous API key

**Optional env vars:**
- `VITE_SENTRY_DSN` — Sentry project DSN for error tracking
- `VITE_DEMO_MODE` — disables auth requirements (used in dev/testing)

**Secrets location:**
- `.env.local` (local development)
- Vercel environment variables (production)

## Webhooks & Callbacks

**Incoming:**
- No incoming webhook endpoints identified in the frontend codebase (likely in Supabase DB webhooks)

**Outgoing:**
- None from frontend — Edge Functions may call Stripe or other services

**Realtime Subscriptions:**
- Supabase Realtime configured with `eventsPerSecond: 10` in `src/lib/supabase.ts`
- `src/lib/subscriptions.ts` — subscription type definitions (free/growth/pro tiers)
- Pattern: Not actively used in the scanned source files — likely used for chat/document notifications

## Email Integration

- **Onboarding email service** (`src/services/onboardingEmailService.ts`) sends via Supabase Edge Function (`invokeSendEmail`)

---

*Integration audit: 2026-06-19*
