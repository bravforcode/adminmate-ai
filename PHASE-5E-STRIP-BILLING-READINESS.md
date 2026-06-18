# Phase 5E — Stripe Billing Readiness

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE — IMPLEMENTATION PLAN ONLY  
**⛔ DO NOT implement until pricing model is approved.**  
**⛔ DO NOT touch .env or Stripe secrets.**

---

## 1. Existing Subscription Infrastructure

| Component | Status | Location |
|-----------|--------|----------|
| `subscription_tier` field | ✅ EXISTS | `companies` table, `companyService.ts` |
| Default value | ✅ `'free'` | Database default |
| Display in Settings | ✅ EXISTS | `SettingsPage.tsx` — shows tier badge |
| "Manage Billing" button | ✅ EXISTS | `SettingsPage.tsx` line 180 |
| "Contact Sales" text | ✅ EXISTS | `SettingsPage.tsx` line 177 |
| Health page metrics | ✅ EXISTS | `HealthPage.tsx` — `recent_signups` metric |

---

## 2. Pricing Plan → Stripe Product Mapping

| Plan | Stripe Product | Stripe Price (THB) | Stripe Price (Annual THB) |
|------|---------------|--------------------:|-------------------------:|
| Free | — (no Stripe product) | — | — |
| Growth | `prod_adminmate_growth` | `price_growth_monthly` = ฿2,900 | `price_growth_annual` = ฿29,000 |
| Pro | `prod_adminmate_pro` | `price_pro_monthly` = ฿7,900 | `price_pro_annual` = ฿79,000 |

---

## 3. Checkout Flow

```
User clicks "Upgrade" in Settings
  → /settings/billing (new page)
    → Shows current plan + available plans
    → User selects plan + billing cycle
    → Click "Subscribe"
      → POST /api/create-checkout-session
        → Stripe Checkout Session created
        → Redirect to Stripe hosted checkout
          → User enters payment info
          → Stripe processes payment
            → Success: redirect to /settings/billing?success=true
            → Cancel: redirect to /settings/billing?canceled=true
      → Webhook: checkout.session.completed
        → Update companies.subscription_tier
        → Create audit log entry
```

---

## 4. Subscription States

| Stripe State | App State | Access Level |
|-------------|-----------|--------------|
| `trialing` | `trialing` | Full access to paid features |
| `active` | `active` | Full access to paid features |
| `past_due` | `past_due` | Grace period (7 days), then downgrade |
| `canceled` | `canceled` | Revert to free tier |
| `unpaid` | `unpaid` | Revert to free tier |

---

## 5. Access Control

| Feature | Free | Growth | Pro |
|---------|------|--------|-----|
| Dashboard | ✅ | ✅ | ✅ |
| Jobs | 1 | 10 | Unlimited |
| Candidates | 5 | 100 | 1,000 |
| AI chat messages/mo | 10 | 100 | Unlimited |
| Document signing | ❌ | ✅ | ✅ |
| Reports | Basic | Standard | Custom |
| Audit log | ❌ | 90 days | 1 year |
| PDPA tools | ❌ | ✅ | ✅ |
| Bulk import | ❌ | ❌ | ✅ |

---

## 6. Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Update `subscription_tier`, create audit log |
| `customer.subscription.created` | Store subscription ID, set tier |
| `customer.subscription.updated` | Update tier if plan changed |
| `customer.subscription.deleted` | Revert to free tier |
| `invoice.payment_failed` | Mark as `past_due`, send notification |
| `invoice.paid` | Confirm `active` status |

---

## 7. Webhook Security

- Verify Stripe webhook signature using `stripe.webhooks.constructEvent`
- Store webhook endpoint secret in environment variables (NOT in code)
- Use HTTPS only
- Implement idempotency for duplicate events

---

## 8. Implementation Plan (When Approved)

### Step 1: Database Changes
```sql
-- Add columns to companies table
ALTER TABLE companies ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE companies ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN subscription_status TEXT DEFAULT 'free';
ALTER TABLE companies ADD COLUMN subscription_current_period_end TIMESTAMPTZ;
```

### Step 2: Edge Function — Create Checkout Session
- `supabase/functions/create-checkout-session/index.ts`
- Creates Stripe Checkout Session
- Returns checkout URL

### Step 3: Edge Function — Stripe Webhook
- `supabase/functions/stripe-webhook/index.ts`
- Handles all webhook events
- Updates subscription_tier in database
- Creates audit log entries

### Step 4: Frontend — Billing Page
- `src/pages/settings/BillingPage.tsx`
- Shows current plan, available plans, upgrade buttons
- Handles success/cancel redirects

### Step 5: Frontend — Subscription Gate
- `src/components/billing/SubscriptionGate.tsx`
- Wraps features that require paid plans
- Shows upgrade prompt when limit reached

---

## 9. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Existing subscription fields audited | ✅ |
| Pricing plan mapping defined | ✅ |
| Checkout flow documented | ✅ |
| Subscription states defined | ✅ |
| Access control rules defined | ✅ |
| Webhook events listed | ✅ |
| Webhook security planned | ✅ |
| No real Stripe secrets touched | ✅ |
| No code implemented (plan only) | ✅ |
| Pricing decision required | ⚠️ BLOCKER |
