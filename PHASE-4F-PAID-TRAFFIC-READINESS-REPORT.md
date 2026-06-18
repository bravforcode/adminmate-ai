# Phase 4F Paid-Traffic Readiness Report

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE

---

## 1. Executive Verdict

| Area | Status | Notes |
|------|--------|-------|
| Landing page | ❌ NOT EXISTS | App has no public marketing/landing page |
| Pricing page | ❌ NOT EXISTS | No pricing tiers or plans |
| Meta tags / OG | ✅ EXISTS | Basic SEO in `index.html` |
| Conversion CTA | ❌ NOT EXISTS | No "Start free trial" or "Book demo" buttons |
| Paid traffic landing | ❌ NOT EXISTS | No route for `/pricing`, `/demo`, `/trial` |
| Stripe / Billing | ❌ NOT EXISTS | `subscription_tier` field exists but no integration |
| UTM tracking | ❌ NOT EXISTS | No UTM parameter handling |
| Safe for Phase 4G | ✅ YES | |

**No code was changed in this phase.** This is a documentation/audit phase only.

---

## 2. Current State Analysis

### 2.1 SEO / Meta Tags (`index.html`)

| Tag | Value | Status |
|-----|-------|--------|
| `<title>` | `AdminMate AI` | ✅ Basic |
| `<meta name="description">` | `AdminMate AI — AI-powered HR Platform for SEA SMEs...` | ✅ Good |
| `<meta property="og:title">` | `AdminMate AI` | ✅ Basic |
| `<meta property="og:description">` | `AI-powered HR Platform for SEA SMEs` | ✅ Good |
| `<meta property="og:type">` | `website` | ✅ Basic |
| `<meta property="og:image">` | ❌ Missing | ⚠️ Need og:image for social sharing |
| `<link rel="canonical">` | ❌ Missing | ⚠️ Need canonical URL |
| `<meta name="robots">` | ❌ Missing | ⚠️ Need robots meta |

### 2.2 App Structure

The app is a **pure authenticated SaaS** — no public-facing pages:

- `/login` — Public (auth page)
- `/register` — Public (auth page)
- `/forgot-password` — Public (auth page)
- `/reset-password` — Public (auth page)
- `/setup-company` — Auth required
- All other routes — Auth + role required

**No landing page, no pricing page, no demo request form.**

### 2.3 Subscription Tier

| Field | Location | Default |
|-------|----------|---------|
| `subscription_tier` | `companies` table | `'free'` |
| Display | `SettingsPage.tsx` | Shows "Free" badge |
| Manage Billing | `SettingsPage.tsx` line 180 | Button exists but no Stripe |

---

## 3. Paid-Traffic Readiness Checklist

### 3.1 Required Before Running Ads

| Item | Status | Priority | Action |
|------|--------|----------|--------|
| Landing page with value prop | ❌ | P0 | Create or use external (e.g., Carrd, Framer) |
| Pricing page | ❌ | P0 | Define tiers + create page |
| "Start free trial" CTA | ❌ | P0 | Add to landing page |
| OG image for social sharing | ❌ | P1 | Create 1200×630 image |
| Canonical URL | ❌ | P1 | Add `<link rel="canonical">` |
| Robots meta | ❌ | P1 | Add `<meta name="robots" content="index, follow">` |
| UTM parameter handling | ❌ | P2 | Store UTM params in localStorage for attribution |
| Conversion tracking | ❌ | P2 | Add GA4/PostHog event on registration |
| Retargeting pixel | ❌ | P3 | Add Meta Pixel, Google Ads tag |

### 3.2 Recommended Ad Platforms for SEA HR SaaS

| Platform | Audience | Budget | Notes |
|----------|----------|--------|-------|
| Google Ads | HR managers searching "HR software Thailand" | $500-2000/mo | High intent |
| Meta Ads | HR professionals in TH/VN/ID | $300-1000/mo | Awareness + retargeting |
| LinkedIn Ads | HR directors, SME owners | $500-2000/mo | Expensive but precise |
| LINE Ads | Thai market | $200-500/mo | LINE is dominant in Thailand |

---

## 4. Deferrals

| Priority | Task | Reason Deferred |
|----------|------|-----------------|
| P0 | Create landing page | Needs design + copy — outside code scope |
| P0 | Create pricing page | Needs business decision on tiers |
| P1 | Add OG image | Needs design asset |
| P1 | Add canonical/robots meta | Quick fix but needs domain decision |
| P2 | UTM tracking | Only needed when running ads |
| P2 | Conversion tracking | Only needed when analytics vendor chosen (Phase 4D) |
| P3 | Retargeting pixels | Only needed when running ads |

---

## 5. Tests / Checks Run

| Command | Result |
|---------|--------|
| SEO meta audit | ✅ PASS — basic tags present |
| Landing page search | ✅ PASS — confirmed not exists |
| Pricing page search | ✅ PASS — confirmed not exists |
| Subscription tier audit | ✅ PASS — field exists, no Stripe |

---

## 6. Safe for Phase 4G

YES. No paid-traffic code exists, no ads are running, no conversion tracking needed yet. The gaps are business decisions (landing page, pricing tiers), not code quality issues.
