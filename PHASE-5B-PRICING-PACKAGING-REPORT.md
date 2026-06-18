# Phase 5B — Pricing + Packaging Report

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE — DECISION REQUIRED  
**⚠️ DO NOT proceed to Stripe until final pricing model is approved.**

---

## 1. Pricing Models

### Model A: Subscription Tiers (RECOMMENDED)

| Plan | Price (THB/mo) | Annual | Best For | Included | Limits | Upgrade Trigger |
|------|---------------:|-------:|----------|----------|--------|-----------------|
| **Free** | ฿0 | ฿0 | Solo HR, evaluation | Dashboard, 1 job, 5 candidates, AI chat (10/mo), basic reports | 1 HR user, 50 employees | Need more jobs/candidates |
| **Growth** | ฿2,900 | ฿29,000/yr | SMEs (5–50 employees) | All modules, 10 jobs, 100 candidates, AI chat (100/mo), e-signature, PDPA tools, audit log | 5 HR users, 500 employees | Need more users or jobs |
| **Pro** | ฿7,900 | ฿79,000/yr | Growing companies (50–500) | Unlimited jobs, 1000 candidates, AI chat (unlimited), bulk import, custom reports, priority support | 20 HR users, 5000 employees | Need unlimited or enterprise features |

**Pros**: Simple, predictable, easy to communicate  
**Cons**: May not fit all company sizes  
**Best for**: Most SEA SMEs

### Model B: Per-Seat Pricing

| Plan | Price (THB/seat/mo) | Best For | Included | Limits | Upgrade Trigger |
|------|--------------------:|----------|----------|--------|-----------------|
| **Starter** | ฿290/seat | Small teams | All core modules, 10 jobs, basic AI | Minimum 2 seats | Need more seats or features |
| **Business** | ฿590/seat | Growing teams | All modules, 50 jobs, advanced AI, e-signature | Minimum 5 seats | Need enterprise features |
| **Enterprise** | ฿990/seat | Large teams | Unlimited, custom integrations, dedicated support | Minimum 20 seats | Custom needs |

**Pros**: Scales with team size, fair for small teams  
**Cons**: Harder to predict costs, may feel expensive for 1-person HR  
**Best for**: Companies with variable HR team sizes

### Model C: Company-Size Pricing

| Plan | Price (THB/mo) | Best For | Included | Limits | Upgrade Trigger |
|------|---------------:|----------|----------|--------|-----------------|
| **Micro** | ฿990 | 1–10 employees | Core modules, 5 jobs, basic AI | 2 HR users | Company growing |
| **Small** | ฿2,900 | 11–50 employees | All modules, 20 jobs, AI, e-signature | 5 HR users | Company growing |
| **Medium** | ฿7,900 | 51–200 employees | Unlimited jobs, advanced AI, bulk import | 15 HR users | Company growing |
| **Large** | ฿14,900 | 201–500 employees | Unlimited, custom reports, priority support | 30 HR users | Enterprise needs |

**Pros**: Predictable based on company size  
**Cons**: Doesn't account for HR team size, may overcharge small HR teams at large companies  
**Best for**: Companies with stable headcount

---

## 2. Recommendation

**Model A (Subscription Tiers)** is recommended for launch because:

1. **Simplest to implement** — 3 plans, clear boundaries
2. **Easiest to communicate** — "Free / Growth / Pro"
3. **Predictable revenue** — Fixed monthly/annual pricing
4. **Low friction** — Free tier drives adoption, Growth tier captures most SMEs
5. **Upgrade triggers are clear** — Based on usage limits (jobs, candidates, users)

---

## 3. Package Dimensions

| Dimension | Free | Growth | Pro |
|-----------|------|--------|-----|
| HR users | 1 | 5 | 20 |
| Employees | 50 | 500 | 5,000 |
| Jobs/month | 1 | 10 | Unlimited |
| Candidates | 5 | 100 | 1,000 |
| AI chat messages/mo | 10 | 100 | Unlimited |
| Document signing | ❌ | ✅ | ✅ |
| Reports | Basic | Standard | Custom |
| Audit log | ❌ | 90 days | 1 year |
| PDPA tools | ❌ | ✅ | ✅ |
| Bulk import | ❌ | ❌ | ✅ |
| Support | Community | Email | Priority |

---

## 4. Decision Required

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Pricing model | A (Tiers), B (Per-seat), C (Company-size) | Model A |
| Free tier? | Yes / No | Yes — drives adoption |
| Annual discount | 10% / 15% / 20% | ~17% (10 months for annual) |
| Currency | THB only / THB + USD | THB for SEA launch |
| Trial period | 14 days / 30 days / None | 14 days for Growth tier |

**⛔ BLOCKER: Do not proceed to Phase 5E (Stripe) until pricing model is approved.**
