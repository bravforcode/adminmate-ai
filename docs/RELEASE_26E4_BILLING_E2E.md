# Release 26E.4 — Billing & Subscription E2E

## Scope

Subscription lifecycle, entitlement enforcement, payment processing, and usage metering.

## Stripe Integration

| Component | Status |
|-----------|--------|
| Stripe API | Test mode verified (26B.8) |
| Plan definitions | Configured in Stripe Dashboard |
| Webhook endpoint | `/api/webhooks/stripe` |
| Customer portal | Stripe-hosted, linked from settings |

## Subscription States

```
trialing → active → past_due → unpaid → canceled
    │                    │
    └── grace_period ────┘
```

## Test Coverage

| Flow | Assertions |
|------|------------|
| Plan upgrade | Prorated charge, entitlement immediate |
| Plan downgrade | End-of-period effective, entitlement downgrade |
| Payment failure | Retry schedule, grace period, downgrade after N failures |
| Cancel | Immediate vs. end-of-period, data retention |
| Reactivate | Restore entitlements, resume billing |
| Usage metering | Seat count, feature gates, overage triggers |

## Entitlement Matrix

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| Max employees | 5 | 25 | 100 | Unlimited |
| Document storage | 100 MB | 1 GB | 10 GB | Custom |
| E-signatures | 10/mo | 100/mo | Unlimited | Unlimited |
| API access | ❌ | Read-only | Full | Full + Webhooks |
| Priority support | ❌ | ❌ | ✅ | ✅ |
| SSO/SAML | ❌ | ❌ | ❌ | ✅ |

## Webhook Verification

- Signature verification with Stripe secret
- Idempotency via `event.id` deduplication
- All state mutations wrapped in DB transaction
- Failed webhook retry: exponential backoff, max 5 attempts

## Tenant Scoping

- `company_id` linked to Stripe `customer.id`
- Subscription changes scoped to company
- Billing admin role required for plan modifications
- Read-only billing view for standard users

## Test Mode Stripe

- Test card: `4242 4242 4242 4242`
- Test webhook signing secret from `.env` (never committed)
- All payment assertions against Stripe test API only
