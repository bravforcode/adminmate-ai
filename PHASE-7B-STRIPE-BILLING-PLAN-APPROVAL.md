# Phase 7B — Stripe Billing Plan Approval Report

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE — DECISIONS DOCUMENTED  
**⛔ DO NOT proceed to Phase 7C until all decisions below are approved.**

---

## 1. Pricing Decisions

| Decision | Status | Value | Blocker? |
|----------|--------|-------|:--------:|
| Free tier | ✅ APPROVED | ฿0 | No |
| Growth tier monthly | ✅ APPROVED | ฿2,900/mo | No |
| Growth tier annual | ✅ APPROVED | ฿29,000/yr | No |
| Pro tier monthly | ✅ APPROVED | ฿7,900/mo | No |
| Pro tier annual | ✅ APPROVED | ฿79,000/yr | No |

---

## 2. Billing Decisions

| Decision | Status | Value | Blocker? |
|----------|--------|-------|:--------:|
| Billing cycle options | ✅ DECIDED | Monthly + Annual | No |
| Annual discount | ✅ DECIDED | ~17% (10 months for annual) | No |
| Currency | ✅ DECIDED | THB | No |

---

## 3. Trial Policy

| Decision | Status | Value | Blocker? |
|----------|--------|-------|:--------:|
| Free tier trial | ✅ DECIDED | No time limit — permanently free | No |
| Paid tier trial | ⚠️ DECISION NEEDED | Option A: 14-day Growth trial / Option B: No trial | **YES** |

### Trial Options

**Option A: 14-day Growth trial**
- Pros: Reduces friction, lets users experience paid features
- Cons: Requires trial state management, may attract free-rider users
- Stripe: `subscription.trial_period_days = 14`

**Option B: No trial**
- Pros: Simpler implementation, immediate revenue
- Cons: Higher friction for conversion
- Stripe: No trial period

**Recommendation**: Option A (14-day Growth trial) — standard for SaaS

---

## 4. Refund Policy

| Decision | Status | Value | Blocker? |
|----------|--------|-------|:--------:|
| Refund policy | ⚠️ DECISION NEEDED | Option A: No refunds / Option B: Pro-rata / Option C: 14-day window | **YES** |

### Refund Options

**Option A: No refunds**
- Pros: Simple, predictable revenue
- Cons: May cause churn, legal risk in some jurisdictions
- Implementation: Cancel at period end, no refund

**Option B: Pro-rata refund**
- Pros: Fair, customer-friendly
- Cons: Complex implementation, revenue uncertainty
- Stripe: Prorate at cancellation

**Option C: 14-day refund window**
- Pros: Balances fairness and simplicity
- Cons: Some complexity
- Stripe: Refund within 14 days of initial purchase only

**Recommendation**: Option C (14-day refund window) — common for SaaS

---

## 5. Stripe Mode

| Decision | Status | Value | Blocker? |
|----------|--------|-------|:--------:|
| Stripe mode | ✅ DECIDED | Test mode only for implementation | No |
| Live mode | ❌ NOT YET | After launch approval | No |

---

## 6. Product/Price ID Mapping

| Plan | Stripe Product | Stripe Price (Monthly) | Stripe Price (Annual) |
|------|---------------|----------------------:|---------------------:|
| Free | — (no Stripe product) | — | — |
| Growth | `prod_[DASHBOARD_ID]` | `price_[DASHBOARD_ID]` | `price_[DASHBOARD_ID]` |
| Pro | `prod_[DASHBOARD_ID]` | `price_[DASHBOARD_ID]` | `price_[DASHBOARD_ID]` |

**Note**: Real IDs will be created in Stripe Dashboard after approval. Use placeholders during implementation.

---

## 7. Database Changes

```sql
ALTER TABLE companies ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE companies ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN subscription_status TEXT DEFAULT 'free';
ALTER TABLE companies ADD COLUMN subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;
```

---

## 8. Webhook Idempotency Strategy

- Use `stripe_subscription_id` + `event_type` as idempotency key
- Store webhook events in `stripe_webhook_events` table
- Check for duplicate events before processing
- Log all events for audit trail

---

## 9. Rollback Plan

| Scenario | Action |
|----------|--------|
| Stripe integration breaks | Disable billing page, revert to free tier |
| Webhook fails | Manual reconciliation from Stripe Dashboard |
| Wrong charges issued | Refund via Stripe Dashboard + audit log |

---

## 10. Decision Required

| Decision | Options | Recommendation | Blocker? |
|----------|---------|----------------|:--------:|
| Paid tier trial | 14-day / No trial | 14-day Growth trial | **YES** |
| Refund policy | No refunds / Pro-rata / 14-day | 14-day window | **YES** |

**⛔ STOP: Do not proceed to Phase 7C until trial and refund decisions are approved.**
