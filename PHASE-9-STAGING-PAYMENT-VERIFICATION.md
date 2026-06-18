# Phase 9 — Staging Payment + Enforcement Verification

**Date**: 2026-06-18  
**Status**: IN PROGRESS  
**Objective**: Move from "code complete" to "Stripe test-mode verified + server-side limits enforced"

---

## Phase 9A — Stripe Migration (READY TO APPLY)

**Status**: ✅ SQL written, needs human to apply

### Migration File
`supabase/migrations/20240618000001_stripe_billing.sql`

### What It Does
1. Adds 5 columns to `companies` table:
   - `stripe_customer_id TEXT`
   - `stripe_subscription_id TEXT`
   - `subscription_status TEXT DEFAULT 'free'`
   - `subscription_current_period_end TIMESTAMPTZ`
   - `subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE`

2. Creates `stripe_webhook_events` table (separate from chat `webhook_events`)

3. Adds 5 indexes for performance

4. Enables RLS on `stripe_webhook_events` (service role only)

5. Verification assertion

### How to Apply

**Option 1: Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20240618000001_stripe_billing.sql`
3. Paste and run
4. Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' AND column_name LIKE 'stripe_%'`

**Option 2: Supabase CLI**
```bash
supabase db push
# or
supabase migration up
```

### Conflict Check
- ✅ `stripe_webhook_events` does NOT conflict with existing `webhook_events` (chat platform webhooks)
- ✅ No frontend code references `subscriptions` table
- ✅ `companies.subscription_tier` (existing) + `companies.subscription_status` (new) are separate concerns

---

## Phase 9B — Supabase Edge Function Secrets

**Status**: ⚠️ NEEDS HUMAN to set in Supabase Dashboard

### Required Secrets

| Secret | Where to Get | How to Set |
|--------|-------------|------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Test mode | Supabase Dashboard → Edge Functions → Secrets |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret | Supabase Dashboard → Edge Functions → Secrets |
| `APP_URL` | Already set (default: https://adminmate-ai.vercel.app) | Supabase Dashboard → Edge Functions → Secrets |
| `HEALTH_CHECK_KEY` | Generate random string | Supabase Dashboard → Edge Functions → Secrets |

### How to Set (Supabase Dashboard)
1. Go to https://supabase.com/dashboard → Project → Edge Functions → Settings → Secrets
2. Add each secret with key/value
3. **DO NOT** print or log these values

### Stripe API Keys (Test Mode)
- **Publishable key**: `pk_test_...` (safe for frontend, not needed here)
- **Secret key**: `sk_test_...` (server-side only, never expose)
- **Webhook secret**: `whsec_...` (server-side only)

---

## Phase 9C — Deploy Edge Functions

**Status**: ⚠️ NEEDS HUMAN to run deploy commands

### Deploy Commands
```bash
# Deploy checkout function
supabase functions deploy stripe-checkout

# Deploy webhook function
supabase functions deploy stripe-webhook

# Deploy health check function
supabase functions deploy health-check
```

### Verify Deployment
```bash
# Test health check (public)
curl https://<project-ref>.supabase.co/functions/v1/health-check

# Expected: {"status":"healthy","timestamp":"..."}

# Test health check (internal)
curl -H "X-Health-Check-Key: <your-key>" https://<project-ref>.supabase.co/functions/v1/health-check

# Expected: {"status":"healthy","timestamp":"...","latencyMs":...,"checks":{...}}
```

---

## Phase 9D — Stripe Test Products/Prices

**Status**: ⚠️ NEEDS HUMAN to create in Stripe Dashboard

### Products to Create

| Product | Price (Monthly) | Price (Annual) | Price ID |
|---------|:---------------:|:--------------:|----------|
| AdminMate Growth | ฿2,900 | ฿29,000 | `price_growth_monthly` / `price_growth_annual` |
| AdminMate Pro | ฿7,900 | ฿79,000 | `price_pro_monthly` / `price_pro_annual` |

### How to Create (Stripe Dashboard)
1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Name: "AdminMate Growth"
4. Pricing: ฿2,900 / month → Copy price ID
5. Repeat for annual (฿29,000 / year)
6. Repeat for Pro (฿7,900 / month, ฿79,000 / year)

### Price ID Mapping
After creating, update `src/pages/settings/BillingPage.tsx` with real price IDs:
```tsx
const STRIPE_PRICES = {
  growth: {
    monthly: 'price_XXXXX',  // Replace with real ID
    annual: 'price_XXXXX',   // Replace with real ID
  },
  pro: {
    monthly: 'price_XXXXX',  // Replace with real ID
    annual: 'price_XXXXX',   // Replace with real ID
  },
}
```

---

## Phase 9E — Stripe Webhook Endpoint

**Status**: ⚠️ NEEDS HUMAN to configure in Stripe Dashboard

### Webhook Configuration
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
5. Copy signing secret → Set as `STRIPE_WEBHOOK_SECRET` in Supabase

---

## Phase 9F — Checkout Happy-Path Test

**Status**: ⚠️ NEEDS HUMAN to run manual test

### Test Script
```
1. Login as test user (testlogin99@gmail.com / Test123456!)
2. Navigate to /settings/billing
3. Verify current plan shows "Free"
4. Select "Monthly" billing cycle
5. Click "Upgrade" on Growth plan
6. Expected: Redirect to Stripe Checkout
7. Enter test card: 4242 4242 4242 4242, any future date, any CVC
8. Complete checkout
9. Expected: Redirect to /settings/billing?session_id=...
10. Verify: Company subscription_status = "active"
11. Verify: Company stripe_subscription_id is set
12. Verify: Company stripe_customer_id is set
```

### Test Card Numbers
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

---

## Phase 9G — Webhook Lifecycle Tests

**Status**: ⚠️ NEEDS HUMAN to run via Stripe CLI or Dashboard

### Test Commands (Stripe CLI)
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
stripe trigger invoice.paid
```

### Idempotency Test
```bash
# Send same event twice
stripe trigger checkout.session.completed
stripe trigger checkout.session.completed

# Expected: Second attempt returns "Duplicate event" or 200 OK without changes
```

### Verify Database State
```sql
-- Check company status
SELECT id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end
FROM companies
WHERE id = '<test-company-id>';

-- Check webhook events logged
SELECT stripe_event_id, event_type, processed_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

---

## Phase 9H — Server-Side Limits (IMPLEMENT)

**Status**: 🔴 NEEDS IMPLEMENTATION

### Strategy
For beta: Soft enforcement via Edge Function checks before DB inserts.
For paid launch: RLS policies for hard enforcement.

### Implementation Plan

#### 1. Create shared limit checker
File: `supabase/functions/_shared/limits.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface LimitCheck {
  allowed: boolean
  current: number
  limit: number
  feature: string
}

export async function checkSubscriptionLimit(
  supabaseUrl: string,
  serviceKey: string,
  companyId: string,
  feature: string
): Promise<LimitCheck> {
  const supabase = createClient(supabaseUrl, serviceKey)
  
  // Get current tier limits
  const { data: company } = await supabase
    .from("companies")
    .select("subscription_tier")
    .eq("id", companyId)
    .single()
  
  const tier = company?.subscription_tier || "free"
  
  // Define limits per tier
  const limits: Record<string, Record<string, number>> = {
    free: { jobs: 1, candidates: 5, ai_messages: 10 },
    growth: { jobs: 10, candidates: 100, ai_messages: 100 },
    pro: { jobs: 999999, candidates: 999999, ai_messages: 999999 },
  }
  
  const tierLimits = limits[tier] || limits.free
  const limit = tierLimits[feature] || 0
  
  // Get current usage
  let current = 0
  if (feature === "jobs") {
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
    current = count || 0
  } else if (feature === "candidates") {
    const { count } = await supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
    current = count || 0
  }
  // AI messages: check monthly usage (simplified)
  
  return {
    allowed: current < limit,
    current,
    limit,
    feature,
  }
}
```

#### 2. Add limit check to job creation
File: `supabase/functions/create-job/index.ts` (or modify existing job creation flow)

#### 3. Add limit check to candidate creation
File: `supabase/functions/create-candidate/index.ts` (or modify existing flow)

### Limit Matrix

| Feature | Free | Growth | Pro | Enforcement |
|---------|:----:|:------:|:---:|:-----------:|
| Jobs | 1 | 10 | ∞ | Server-side check before insert |
| Candidates | 5 | 100 | ∞ | Server-side check before insert |
| AI messages/mo | 10 | 100 | ∞ | Server-side check before send |
| HR users | 1 | 5 | 20 | Server-side check before invite |
| Document signing | ❌ | ✅ | ✅ | Feature flag check |
| PDPA tools | ❌ | ✅ | ✅ | Feature flag check |
| Bulk import | ❌ | ❌ | ✅ | UI gate (already done) |
| Custom reports | ❌ | ❌ | ✅ | UI gate (already done) |

### Beta Behavior
- When limit reached: Return 403 with `upgrade_required: true`
- Frontend shows upgrade prompt (not hard block)
- User can still view existing data

---

## Phase 9I — Full Regression After Stripe Staging

**Status**: ⏳ After 9A-9H complete

### Test Commands
```bash
npx tsc --noEmit
npx vite build
npx eslint src/ --max-warnings=100
npx playwright test --project=setup --workers=1 --retries=0
npx playwright test --project=chromium-auth --workers=1 --retries=1
npx playwright test --project=chromium-hr --workers=1 --retries=1
```

### Acceptance Criteria
- TypeScript: 0 errors
- Build: pass
- Lint: 0 errors
- E2E: all passing or accounted for
- Stripe checkout works in test mode
- Webhook events processed correctly
- Server-side limits enforced

---

## Phase 9J — New Verdict

**Status**: ⏳ After 9I complete

### Will Determine
- Safe for paid beta? (Depends on 9F-9G results)
- Safe for real payments? (Depends on 9H enforcement)
- Remaining blockers?

---

## Execution Order

| Step | Action | Owner | Blocked By |
|:----:|--------|:-----:|:----------:|
| 9A | Apply migration SQL | Human | — |
| 9B | Set Supabase secrets | Human | — |
| 9C | Deploy edge functions | Human | 9A, 9B |
| 9D | Create Stripe test products | Human | — |
| 9E | Configure webhook endpoint | Human | 9C, 9D |
| 9F | Run checkout test | Human | 9A-9E |
| 9G | Run webhook tests | Human | 9E |
| 9H | Implement server-side limits | Agent | — |
| 9I | Full regression | Agent | 9A-9H |
| 9J | New verdict | Agent | 9I |
