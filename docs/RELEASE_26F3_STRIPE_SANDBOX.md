# Release 26F.3 — Stripe Billing Sandbox Verification

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. Stripe Integration Architecture

### Migration

`supabase/migrations/20240618000001_stripe_billing.sql`

### Database Schema

| Table | Purpose |
|-------|---------|
| `companies` (extended) | Stripe customer/subscription IDs |
| `stripe_webhook_events` | Webhook event idempotency store |
| `subscriptions` | Internal subscription state |
| `plans` | Plan definitions with pricing |
| `plan_features` | Feature entitlements per plan |
| `usage_records` | Metered usage tracking |

### Companies Table — Stripe Columns

```sql
ALTER TABLE companies ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE companies ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN subscription_status TEXT DEFAULT 'free';
ALTER TABLE companies ADD COLUMN subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;
```

---

## 2. Subscription Service

### Service Location

`src/services/billing/subscriptionService.ts`

### Key Methods

| Method | Description |
|--------|-------------|
| `getPlans()` | List all active plans ordered by price |
| `getPlanFeatures(planId)` | Get feature entitlements for a plan |
| `getSubscription(companyId)` | Get current subscription for company |
| `createSubscription(companyId, planId)` | Create new subscription with trial |
| `checkUsageLimit(companyId, featureKey)` | Check if usage is within plan limits |
| `recordUsage(companyId, featureKey, count)` | Record metered usage |
| `checkModuleEntitlement(companyId, moduleKey)` | Check if company has access to module |

### Subscription Statuses

| Status | Meaning |
|--------|---------|
| `trialing` | Free trial period active |
| `active` | Paid subscription current |
| `past_due` | Payment failed, grace period |
| `canceled` | Subscription canceled |
| `unpaid` | Payment overdue beyond grace |

### Usage Check Flow

```
1. checkUsageLimit(companyId, featureKey) called
2. RPC function check_usage_limit executes
3. Returns: allowed, current_usage, limit_value, is_unlimited
4. If allowed=false → UI blocks action with upgrade prompt
```

---

## 3. Stripe Webhook Events

### Idempotency Store

```sql
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,    -- Idempotency key
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policy

```sql
-- Service role only — no user-level access
CREATE POLICY "Service role can manage stripe webhook events"
  ON stripe_webhook_events FOR ALL
  USING (auth.role() = 'service_role');
```

### Webhook Event Processing

| Stripe Event | Action |
|-------------|--------|
| `checkout.session.completed` | Activate subscription |
| `invoice.paid` | Extend current period |
| `invoice.payment_failed` | Set status to `past_due` |
| `customer.subscription.updated` | Sync plan changes |
| `customer.subscription.deleted` | Set status to `canceled` |

---

## 4. Sandbox Verification Checklist

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | `getPlans()` returns seeded plans | Plans returned with pricing | ⬜ Pending |
| 2 | `getSubscription()` with no sub | Returns `null` | ⬜ Pending |
| 3 | `createSubscription()` creates trial | Status=`trialing`, trial_ends_at set | ⬜ Pending |
| 4 | `checkUsageLimit()` within limits | `allowed=true` | ⬜ Pending |
| 5 | `checkUsageLimit()` exceeding limits | `allowed=false` | ⬜ Pending |
| 6 | `recordUsage()` increments counter | Usage count increases | ⬜ Pending |
| 7 | `checkModuleEntitlement()` on free plan | Returns `false` for premium modules | ⬜ Pending |
| 8 | Stripe webhook idempotency | Duplicate event_id rejected | ⬜ Pending |
| 9 | Webhook event RLS | User cannot read `stripe_webhook_events` | ✅ Migrated |
| 10 | Subscription status sync | Stripe status matches internal status | ⬜ Pending |

---

## 5. Stripe Sandbox Setup

### Environment Variables (Not Committed)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (`sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret |
| `STRIPE_PRICE_ID_*` | Price IDs for each plan tier |

### Test Mode Verification

1. Use Stripe CLI (`stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`)
2. Create test customer in Stripe Dashboard
3. Create test subscription
4. Verify webhook events appear in `stripe_webhook_events`
5. Verify internal subscription status updates

---

## 6. Edge Functions

| Function | Purpose |
|----------|---------|
| `stripe-checkout` | Create Stripe Checkout session |
| `stripe-webhook` | Handle Stripe webhook events |
| `stripe-portal` | Create Stripe Customer Portal session |

---

## 7. Plan Entitlement Matrix

| Plan | Price | Employee Limit | Modules | Trial Days |
|------|-------|---------------|---------|------------|
| Free | $0 | 5 | Core HR | 14 |
| Starter | $49/mo | 25 | Core + Recruiting | 14 |
| Professional | $149/mo | 100 | All modules | 14 |
| Enterprise | Custom | Unlimited | All + Priority support | 30 |

---

## 8. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No real Stripe API wiring | P0 | Implement checkout/webhook edge functions |
| No Customer Portal integration | P1 | Wire Stripe Portal for self-service |
| No invoice PDF generation | P2 | Add invoice download via Stripe API |
| No proration on plan changes | P2 | Handle mid-cycle upgrades/downgrades |
| No tax handling | P3 | Integrate Stripe Tax for multi-country |
