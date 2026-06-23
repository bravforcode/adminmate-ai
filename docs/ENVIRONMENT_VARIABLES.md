# AdminMate AI — Environment Variables

> Complete reference for all environment variables across frontend and backend.  
> **Last updated:** 2026-06-23  
> **Frontend vars:** 12 (prefixed `VITE_`)  
> **Backend secrets:** 12 (set via `supabase secrets set`)

---

## Frontend Environment Variables

Set in `.env.local` (development) or Vercel Dashboard (production).

All frontend vars are exposed to the browser — **never store secrets here**.

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | `https://ajqpxgnlrpjhqsnoutpv.supabase.co` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase anonymous key (public, safe for browser) |
| `VITE_APP_URL` | `https://adminmate.ai` | Production URL (used for OAuth redirects, links) |
| `VITE_APP_NAME` | `AdminMate AI` | Display name shown in UI |
| `VITE_STRIPE_PRICE_GROWTH_MONTHLY` | `price_1abc...` | Stripe price ID — Growth plan, monthly billing |
| `VITE_STRIPE_PRICE_GROWTH_ANNUAL` | `price_1def...` | Stripe price ID — Growth plan, annual billing |
| `VITE_STRIPE_PRICE_PRO_MONTHLY` | `price_1ghi...` | Stripe price ID — Pro plan, monthly billing |
| `VITE_STRIPE_PRICE_PRO_ANNUAL` | `price_1jkl...` | Stripe price ID — Pro plan, annual billing |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_LINE` | `false` | Enable LINE Messenger integration in UI |
| `VITE_ENABLE_WHATSAPP` | `false` | Enable WhatsApp integration in UI |
| `VITE_ENABLE_ZALO` | `false` | Enable Zalo integration (not yet implemented) |
| `VITE_SENTRY_DSN` | (empty) | Sentry DSN for frontend error tracking |

### Source References

| Variable | Used In |
|----------|---------|
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts`, `src/lib/sessionApi.ts`, `src/lib/errorHandler.ts`, `src/services/aiRecruitingService.ts`, `src/services/ai/aiAssistantService.ts`, `src/pages/HealthPage.tsx`, `src/pages/portal/*.tsx`, `src/pages/settings/SecurityPage.tsx`, `src/components/auth/MFAChallenge.tsx` |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts`, `src/lib/errorHandler.ts`, `src/pages/HealthPage.tsx`, `src/lib/logger.ts` |
| `VITE_APP_URL` | `src/utils/constants.ts` |
| `VITE_SENTRY_DSN` | `src/main.tsx`, `src/lib/sentry.ts` |
| `VITE_STRIPE_PRICE_*` | `src/pages/settings/BillingPage.tsx` |

---

## Backend Secrets (Supabase Edge Functions)

Set via `supabase secrets set KEY=value`. These are **never exposed to the browser**.

### Required

| Secret | Description | Used By |
|--------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features | `mate-ai-chat`, `screen-resume`, `generate-jd`, `parse-resume`, `candidate-match-score`, `candidate-summary`, `generate-offer-content` |
| `RESEND_API_KEY` | Resend email API key (`re_...`) | `send-email`, `send-document-reminders` |
| `CRON_SECRET_KEY` | Shared secret for cron-triggered functions (min 32 chars, generate with `openssl rand -base64 32`) | `generate-scheduled-reports`, `send-document-reminders` |
| `DEFAULT_COMPANY_ID` | UUID of fallback company for webhook messages without company mapping | `whatsapp-webhook`, `line-webhook` |

### Optional — LINE Messenger

| Secret | Description |
|--------|-------------|
| `LINE_CHANNEL_SECRET` | LINE channel secret for webhook signature verification |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE channel access token for sending messages |

### Optional — WhatsApp Business

| Secret | Description |
|--------|-------------|
| `WHATSAPP_API_TOKEN` | WhatsApp Cloud API permanent access token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Custom verify token for webhook challenge |
| `WHATSAPP_APP_SECRET` | WhatsApp app secret for signature verification |

### Optional — Stripe Billing

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` for production, `sk_test_...` for testing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |

### Auto-Injected by Supabase (do not set manually)

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Auto-injected by Supabase runtime |
| `SUPABASE_ANON_KEY` | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase runtime |

---

## Deployment-Specific Configuration

### Vercel (Frontend Host)

Set via Vercel Dashboard → Settings → Environment Variables.

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Framework | Vite |
| Node.js version | 20+ |

### Supabase (Backend Host)

| Setting | Value |
|---------|-------|
| Project ref | `ajqpxgnlrpjhqsnoutpv` |
| Region | (check Supabase dashboard) |
| Plan | (Free / Pro / Team) |

---

## Environment Variable Validation

The application validates required variables at startup:

### Frontend (`src/lib/supabase.ts`)
```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Check your .env.local and ensure the variables are set.'
  )
}
```

If these are missing, the app will crash on load with this error.

### Backend (Edge Functions)
Edge functions fail at runtime if required secrets are missing. Check Supabase logs:
```bash
supabase functions logs <function-name>
```

---

## Security Rules

1. **Never commit `.env.local`** — it is in `.gitignore`
2. **Never use `service_role` key in frontend** — only `anon` key
3. **Never expose backend secrets to client** — they are server-side only
4. **Rotate secrets** if they are accidentally exposed
5. **Use different keys** for development, staging, and production
6. **Stripe keys**: Ensure `sk_live_...` is only in production, `sk_test_...` only in development/staging

---

## Quick Setup

### Development (local)

```bash
# Copy the example
cp .env.example .env.local

# Edit with your values
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Production (Supabase secrets)

```bash
# One-time setup
supabase link --project-ref ajqpxgnlrpjhqsnoutpv

# Set all secrets
supabase secrets set GEMINI_API_KEY=<key>
supabase secrets set RESEND_API_KEY=<key>
supabase secrets set CRON_SECRET_KEY=$(openssl rand -base64 32)
supabase secrets set DEFAULT_COMPANY_ID=<uuid>
# ... plus optional integrations

# Verify
supabase secrets list
```

### Production (Vercel env vars)

Set via Vercel Dashboard or CLI:
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# ... etc
```
