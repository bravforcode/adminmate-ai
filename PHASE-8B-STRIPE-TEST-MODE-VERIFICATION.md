# Phase 8B — Stripe Test-Mode Staging Verification Report

**Date**: 2026-06-18  
**Status**: ⚠️ BLOCKED — Migration not applied, code fixes needed  
**Verdict**: NOT safe for real payments. NOT safe for Stripe test-mode without migration.

---

## Critical Findings

### FINDING 1: DB Migration Missing (BLOCKER)

**The Stripe columns do not exist in the database.**

The `companies` table schema (from migration `20240101000002_companies.sql`):
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    subscription_tier VARCHAR(20) DEFAULT 'free',  -- exists
    -- MISSING: stripe_customer_id
    -- MISSING: stripe_subscription_id
    -- MISSING: subscription_status
    -- MISSING: subscription_current_period_end
    -- MISSING: subscription_cancel_at_period_end
);
```

The existing `subscriptions` table (from migration `20240101000018_subscriptions.sql`) has a DIFFERENT schema:
```sql
CREATE TABLE subscriptions (
    tier VARCHAR(20),           -- different column name
    max_employees INTEGER,      -- different purpose
    max_active_jobs INTEGER,    -- different purpose
    features JSONB,             -- different structure
);
```

**Impact**: Both `stripe-checkout` and `stripe-webhook` functions will CRASH at runtime with "column not found" errors.

**Fix Created**: `supabase/migrations/20240618000001_stripe_billing.sql`

### FINDING 2: Webhook Signature Verification Was a Stub (FIXED)

**Before**: `verifyStripeSignature` only checked `signature.startsWith("v1=")` —任何人都 can forge webhooks.

**After**: Full HMAC-SHA256 verification with constant-time comparison.

### FINDING 3: No priceId Validation (FIXED)

**Before**: Any string could be passed as priceId.

**After**: Validates `price_` prefix format and trial period bounds (0-30 days).

### FINDING 4: checkout.session.completed Handler Fragile (FIXED)

**Before**: `session.subscription_details?.current_period_end` could be undefined, causing `NaN * 1000 = NaN`.

**After**: Null-safe with conditional update.

---

## Verification Checklist

| Test | Status | Evidence | Risk |
|------|:------:|----------|:----:|
| DB migration exists | ✅ | Created `20240618000001_stripe_billing.sql` | — |
| DB migration applied | ❌ | **NOT YET APPLIED** | **BLOCKER** |
| Stripe columns in companies | ❌ | Not in existing schema | **BLOCKER** |
| stripe_webhook_events table | ❌ | Not in existing schema | **BLOCKER** |
| Checkout function validates auth | ✅ | Checks Authorization header, getUser() | Low |
| Checkout function validates priceId | ✅ | Validates `price_` prefix | Low |
| Checkout function validates trial | ✅ | Bounds check 0-30 days | Low |
| Checkout function creates customer | ✅ | Creates/retrieves Stripe customer | Low |
| Checkout function creates session | ✅ | Creates checkout session with trial | Low |
| Webhook signature verification | ✅ | **FIXED**: Full HMAC-SHA256 | — |
| Webhook idempotency | ✅ | Checks stripe_event_id before insert | Low |
| Webhook handles checkout.session.completed | ✅ | **FIXED**: null-safe | — |
| Webhook handles subscription.updated | ✅ | Updates status, period_end, cancel_at | Low |
| Webhook handles subscription.deleted | ✅ | Sets status=canceled, clears subscription_id | Low |
| Webhook handles invoice.payment_failed | ✅ | Sets status=past_due | Low |
| Webhook handles invoice.paid | ✅ | Activates on subscription_create | Low |
| Free tier fallback if Stripe missing | ✅ | Companies default to subscription_tier='free' | Low |
| No secrets in frontend | ✅ | Only `import.meta.env.VITE_SENTRY_DSN` reads | Low |
| No real charges possible | ✅ | No Stripe keys in frontend | Low |

---

## Environment Variables Required (Staging)

| Variable | Purpose | Status |
|----------|---------|:------:|
| `STRIPE_SECRET_KEY` | Stripe API key (test mode: `sk_test_...`) | ❌ Needed |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification (`whsec_...`) | ❌ Needed |
| `APP_URL` | Success/cancel redirect URLs | ✅ Default: https://adminmate-ai.vercel.app |

---

## Manual Verification Steps (Post-Migration)

Once migration is applied and env vars are set:

1. **Deploy edge functions**:
   ```bash
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-webhook
   ```

2. **Create Stripe test products/prices**:
   - Growth Monthly: `price_growth_monthly`
   - Growth Annual: `price_growth_annual`
   - Pro Monthly: `price_pro_monthly`
   - Pro Annual: `price_pro_annual`

3. **Configure webhook endpoint**:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed, invoice.paid

4. **Test checkout flow**:
   - Login as test user
   - Navigate to /settings/billing
   - Click "Upgrade" on Growth plan
   - Verify redirect to Stripe checkout
   - Complete test payment (use Stripe test card: 4242 4242 4242 4242)
   - Verify redirect back to billing page
   - Verify company subscription_status updated

5. **Test webhook events**:
   - Use Stripe CLI: `stripe trigger checkout.session.completed`
   - Verify event logged in stripe_webhook_events
   - Verify company status updated

6. **Test idempotency**:
   - Send same event twice
   - Verify second attempt returns "Duplicate event"

---

## Verdict

| Decision | Status | Rationale |
|----------|:------:|-----------|
| Safe for beta test users (free tier) | ✅ | Free tier works without Stripe |
| Safe for Stripe test-mode | ⚠️ | **BLOCKED** — migration not applied |
| Safe for real payments | ❌ | **NO** — Stripe test-mode not verified |
| Safe for paid traffic | ❌ | **NO** — legal review pending |

**Remaining blockers before Stripe test-mode**:
1. Apply migration `20240618000001_stripe_billing.sql` to staging database
2. Set `STRIPE_SECRET_KEY` (test mode) in Supabase edge function env
3. Set `STRIPE_WEBHOOK_SECRET` in Supabase edge function env
4. Deploy edge functions
5. Create Stripe test products/prices
6. Configure webhook endpoint
7. Run manual verification steps above
