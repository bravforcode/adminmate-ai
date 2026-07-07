# AdminMate AI — Deployment Guide

> Canonical deployment reference. For operational runbook, see [runbook.md](runbook.md).

**Last updated:** 2026-06-23  
**Status:** Production hardened (all gates A–L closed)

---

## Architecture

```
Frontend (Vercel)          Backend (Supabase)
─────────────────          ──────────────────
React SPA (dist/)          PostgreSQL + RLS
Static assets              Edge Functions (Deno)
SPA rewrites               Auth (GoTrue)
Security headers           Storage
                           Realtime (WebSocket)
                           pgTAP tests (1,777)
```

---

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- Vercel CLI (`npm i -g vercel`)
- Supabase CLI (`npm i -g supabase`)
- Access to Vercel project
- Access to Supabase project

---

## Environment Variables

### Frontend (Vercel / `.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_APP_URL` | Yes | Production URL (e.g., `https://adminmate.ai`) |
| `VITE_APP_NAME` | Yes | App name (`AdminMate AI`) |
| `VITE_STRIPE_PRICE_GROWTH_MONTHLY` | Yes | Stripe price ID |
| `VITE_STRIPE_PRICE_GROWTH_ANNUAL` | Yes | Stripe price ID |
| `VITE_STRIPE_PRICE_PRO_MONTHLY` | Yes | Stripe price ID |
| `VITE_STRIPE_PRICE_PRO_ANNUAL` | Yes | Stripe price ID |
| `VITE_ENABLE_LINE` | No | Enable LINE integration |
| `VITE_ENABLE_WHATSAPP` | No | Enable WhatsApp integration |
| `VITE_ENABLE_ZALO` | No | Enable Zalo integration |
| `VITE_SENTRY_DSN` | No | Sentry error monitoring DSN |

### Backend (Supabase Secrets)

| Secret | Required | Description |
|--------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `CRON_SECRET_KEY` | Yes | Shared secret for cron-triggered functions |
| `LINE_CHANNEL_ACCESS_TOKEN` | No | LINE OA channel token |
| `LINE_CHANNEL_SECRET` | No | LINE OA channel secret |
| `WHATSAPP_API_TOKEN` | No | WhatsApp Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | No | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | No | WhatsApp webhook verify token |

---

## Deployment Steps

### 1. Database Migration

```bash
# Link to Supabase project
supabase link --project-ref <your-project-ref>

# Preview changes (dry run)
supabase db push --dry-run

# Apply all migrations (65+ files)
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

### 2. Edge Functions

```bash
# Set secrets (one-time)
supabase secrets set GEMINI_API_KEY=<key>
supabase secrets set RESEND_API_KEY=<key>
supabase secrets set CRON_SECRET_KEY=<random-32-char-string>
# ... set other secrets as needed

# Deploy all functions
supabase functions deploy
```

### 3. Frontend (Vercel)

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link project (first time only)
vercel link

# Deploy to production
vercel --prod

# Verify deployment
vercel ls --prod
```

### 4. Post-Deploy Verification

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build (verify no errors)
npm run build

# Run E2E tests against production
npm run test:e2e
```

---

## Rollback Procedures

### Frontend (Vercel)

```bash
# Rollback to previous deployment
vercel rollback

# Or deploy a specific deployment by ID
vercel deploy --prod <deployment-id>
```

Vercel keeps the last 10 production deployments available for instant rollback.

### Backend (Supabase)

```bash
# Preview what db push will change
supabase db push --dry-run

# Rollback requires manual reverse migration
supabase migration new rollback_<description>
# Write the reverse DDL, then push
supabase db push
```

---

## Security Headers

Configured in `vercel.json`:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | Restrictive CSP (self, supabase, fonts) |
| `Cache-Control` (assets) | `public, max-age=31536000, immutable` |

---

## Monitoring

- **Error tracking:** Sentry (configured via `VITE_SENTRY_DSN`)
- **Audit logging:** Database-level `audit_logs` table
- **AI usage:** `ai_usage_log` table for Gemini API calls
- **Rate limiting:** `rate_limits` table + Edge Function middleware
- **Activity tracking:** `activity_log` table

---

## Production Checklist

See [launch-checklist.md](launch-checklist.md) for the full pre-launch checklist.

- [ ] All 65+ migrations applied
- [ ] RLS enabled on all tenant tables
- [ ] All Edge Functions deployed
- [ ] Secrets configured in Supabase
- [ ] Sentry DSN configured
- [ ] Custom domain configured in Vercel
- [ ] SSL certificate active
- [ ] CSP headers verified
- [ ] pgTAP tests passing (1,777/1,777)
- [ ] E2E tests passing
- [ ] Rollback procedure tested

---

## Incident Response

1. **Frontend issue:** Rollback via `vercel rollback`
2. **Database issue:** Check migration status, create reverse migration if needed
3. **Edge Function issue:** Check Supabase logs, redeploy function
4. **Auth issue:** Check `auth-session` Edge Function, verify Supabase Auth config
5. **Security incident:** See [security.md](security.md) and `docs/INCIDENT_33B0_CREDENTIAL_EXPOSURE.md`
