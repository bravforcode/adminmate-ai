# AdminMate AI — Deployment Checklist

> Step-by-step guide for deploying to production.  
> **Last updated:** 2026-06-23  
> **Stack:** Vercel (frontend) + Supabase Cloud (backend)  
> **Migration count:** 122 SQL migrations  
> **Edge functions:** 27 deployed functions

---

## Pre-Deployment

### 1. Local Verification (run before any deploy)

```bash
# Type check — must pass with zero errors
npm run type-check

# Lint — must pass with zero warnings
npm run lint

# Unit tests — all green
npm run test

# Production build — must succeed
npm run build
```

### 2. Confirm Environment Variables

| Location | Variables | Status |
|----------|-----------|--------|
| `.env.local` (dev) | 8 frontend vars | Already configured |
| Vercel env vars (prod) | Same 8 frontend vars | Must match `.env.example` |
| Supabase secrets | 10+ backend secrets | Must be set via `supabase secrets set` |

Run verification:
```bash
# Check all VITE_ vars are documented
grep -r "VITE_" src/ --include="*.ts" --include="*.tsx" | grep -oP "VITE_[A-Z_]+" | sort -u
```

### 3. Confirm Git State

```bash
# Ensure clean working tree
git status

# Confirm latest commit is the one to deploy
git log --oneline -3
```

---

## Phase 1: Database Migration

### 1.1 Link to Supabase

```bash
supabase link --project-ref ajqpxgnlrpjhqsnoutpv
```

### 1.2 Dry Run

```bash
supabase db push --dry-run
```

Review the output. Confirm:
- [ ] Only forward migrations (no destructive operations unless intentional)
- [ ] No unexpected schema drift
- [ ] All 122 migrations are accounted for

### 1.3 Apply Migrations

```bash
supabase db push
```

Expected: All migrations apply cleanly. If any fail, **stop and investigate** before proceeding.

### 1.4 Verify Migration Status

```bash
supabase migration list
```

- [ ] All migrations marked as applied
- [ ] No pending migrations
- [ ] Migration count matches: **122 SQL migrations** (excluding `.gitkeep`, `manual_migrate_tokens.sql`, `tests/`)

### 1.5 Regenerate TypeScript Types

```bash
supabase gen types typescript --project-id ajqpxgnlrpjhqsnoutpv > src/types/database.ts
```

---

## Phase 2: Edge Function Secrets

### 2.1 Set Required Secrets

```bash
# AI Provider
supabase secrets set GEMINI_API_KEY=<your-key>

# Email (Resend)
supabase secrets set RESEND_API_KEY=re_<your-key>
supabase secrets set EMAIL_FROM="AdminMate AI <noreply@yourdomain.com>"

# Cron / Scheduled Jobs
supabase secrets set CRON_SECRET_KEY=$(openssl rand -base64 32)

# Fallback company ID (for webhook messages without company mapping)
supabase secrets set DEFAULT_COMPANY_ID=<your-default-company-uuid>
```

### 2.2 Set Optional Secrets (per integration)

```bash
# LINE Messenger (if enabled)
supabase secrets set LINE_CHANNEL_SECRET=<secret>
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=<token>

# WhatsApp Business (if enabled)
supabase secrets set WHATSAPP_API_TOKEN=<token>
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<id>
supabase secrets set WHATSAPP_VERIFY_TOKEN=<token>
supabase secrets set WHATSAPP_APP_SECRET=<secret>

# Stripe Billing (if enabled)
supabase secrets set STRIPE_SECRET_KEY=sk_live_<key>
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_<secret>
```

### 2.3 Verify Secrets

```bash
supabase secrets list
```

- [ ] All required secrets are set
- [ ] No secrets contain placeholder values (e.g., `your-key-here`)

---

## Phase 3: Deploy Edge Functions

### 3.1 Deploy All Functions

```bash
supabase functions deploy
```

### 3.2 Verify Deployed Functions

```bash
supabase functions list
```

Expected: **27 functions** deployed (excluding `_shared/`):

| # | Function | Category |
|---|----------|----------|
| 1 | `auth-hook-mfa` | Auth |
| 2 | `auth-session` | Auth |
| 3 | `candidate-match-score` | AI |
| 4 | `candidate-summary` | AI |
| 5 | `delete-user-data` | Privacy |
| 6 | `export-user-data` | Privacy |
| 7 | `generate-jd` | AI |
| 8 | `generate-offer-content` | AI |
| 9 | `generate-scheduled-reports` | Analytics |
| 10 | `get-public-job` | Public |
| 11 | `health-check` | System |
| 12 | `line-webhook` | Messaging |
| 13 | `log-client-error` | Observability |
| 14 | `mate-ai-chat` | AI |
| 15 | `messaging-hub` | Messaging |
| 16 | `metrics` | System |
| 17 | `parse-resume` | AI |
| 18 | `screen-resume` | AI |
| 19 | `send-document-reminders` | Automation |
| 20 | `send-email` | Communication |
| 21 | `setup-mfa` | Auth |
| 22 | `stripe-checkout` | Billing |
| 23 | `stripe-webhook` | Billing |
| 24 | `submit-application` | Public |
| 25 | `track-application` | Public |
| 26 | `verify-mfa` | Auth |
| 27 | `whatsapp-webhook` | Messaging |

---

## Phase 4: Frontend Deployment (Vercel)

### 4.1 Configure Vercel Environment Variables

In Vercel Dashboard → Settings → Environment Variables, set:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://ajqpxgnlrpjhqsnoutpv.supabase.co` | Production |
| `VITE_SUPABASE_ANON_KEY` | `<production-anon-key>` | Production |
| `VITE_APP_URL` | `https://adminmate.ai` | Production |
| `VITE_APP_NAME` | `AdminMate AI` | Production |
| `VITE_STRIPE_PRICE_GROWTH_MONTHLY` | `price_<id>` | Production |
| `VITE_STRIPE_PRICE_GROWTH_ANNUAL` | `price_<id>` | Production |
| `VITE_STRIPE_PRICE_PRO_MONTHLY` | `price_<id>` | Production |
| `VITE_STRIPE_PRICE_PRO_ANNUAL` | `price_<id>` | Production |
| `VITE_ENABLE_LINE` | `true` or `false` | Production |
| `VITE_ENABLE_WHATSAPP` | `true` or `false` | Production |
| `VITE_ENABLE_ZALO` | `false` | Production |
| `VITE_SENTRY_DSN` | `<sentry-dsn>` | Production |

### 4.2 Deploy to Production

```bash
# From project root
vercel --prod
```

Or push to the production branch if using Git integration:
```bash
git push origin main
```

### 4.3 Verify Deployment

```bash
# Check deployment URL
vercel ls --prod

# Verify the site loads
curl -s -o /dev/null -w "%{http_code}" https://adminmate.ai
# Expected: 200
```

---

## Phase 5: Post-Deployment Verification

### 5.1 Health Check

```bash
curl -s https://ajqpxgnlrpjhqsnoutpv.supabase.co/functions/v1/health-check | jq .
```

### 5.2 Metrics Endpoint

```bash
curl -s https://ajqpxgnlrpjhqsnoutpv.supabase.co/functions/v1/metrics \
  -H "apikey: <your-anon-key>" | jq .
```

### 5.3 Security Headers

```bash
curl -s -I https://adminmate.ai | grep -E "(X-Content-Type|X-Frame|X-XSS|HSTS|CSP|Referrer|Permissions)"
```

Expected headers:
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] `Content-Security-Policy: default-src 'self'; ...`

### 5.4 Database RLS Verification

Run pgTAP tests to verify RLS is active:
```bash
supabase test db
```

Expected: **All tests pass** (1,777+ assertions).

### 5.5 Functional Smoke Test

- [ ] Login / registration works
- [ ] Dashboard loads without console errors
- [ ] Job listing creates and appears
- [ ] Candidate upload works
- [ ] Settings page loads
- [ ] Billing page shows correct Stripe price IDs
- [ ] AI chat responds (if `GEMINI_API_KEY` is set)
- [ ] Email notifications send (if `RESEND_API_KEY` is set)

---

## Phase 6: Integration Webhooks (if enabled)

### LINE Messenger
1. Set webhook URL in LINE OA Manager:  
   `https://ajqpxgnlrpjhqsnoutpv.supabase.co/functions/v1/line-webhook`
2. Verify: Open LINE OA → Settings → Webhook → Verify

### WhatsApp Business
1. Set webhook URL in Meta Developer Console:  
   `https://ajqpxgnlrpjhqsnoutpv.supabase.co/functions/v1/whatsapp-webhook`
2. Set verify token to match `WHATSAPP_VERIFY_TOKEN` secret
3. Verify: Send a test message to the WhatsApp Business number

### Stripe
1. Set webhook endpoint in Stripe Dashboard:  
   `https://ajqpxgnlrpjhqsnoutpv.supabase.co/functions/v1/stripe-webhook`
2. Subscribe to events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Verify: Create a test subscription in Stripe test mode

---

## Post-Deploy Checklist Summary

| # | Item | Verified |
|---|------|----------|
| 1 | `npm run build` passes | [ ] |
| 2 | `npm run type-check` passes | [ ] |
| 3 | `npm run lint` passes | [ ] |
| 4 | `npm run test` passes | [ ] |
| 5 | All 122 migrations applied | [ ] |
| 6 | All 27 Edge Functions deployed | [ ] |
| 7 | All secrets set (no placeholders) | [ ] |
| 8 | Vercel env vars configured | [ ] |
| 9 | Security headers verified | [ ] |
| 10 | Health check endpoint responds | [ ] |
| 11 | RLS pgTAP tests pass | [ ] |
| 12 | Login / registration works | [ ] |
| 13 | Core CRUD operations work | [ ] |
| 14 | AI features work (if enabled) | [ ] |
| 15 | Email notifications work (if enabled) | [ ] |
| 16 | Webhooks verified (if enabled) | [ ] |
| 17 | Sentry error tracking receives events | [ ] |
| 18 | Rollback procedure tested | [ ] |
