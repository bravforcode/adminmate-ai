# Phase 5D — Analytics Vendor Decision + Consent Strategy

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE — DECISION REQUIRED  
**⚠️ DO NOT add analytics SDK until consent/privacy strategy is defined.**

---

## 1. Vendor Comparison

| Vendor | Privacy | Self-Host | Funnel | Events | Cost | Implementation | Consent | SEA/PDPA | Recommendation |
|--------|---------|-----------|--------|--------|------|----------------|---------|----------|----------------|
| **GA4** | LOW | ❌ | ✅ | ✅ | Free (up to limits) | Medium | HIGH — requires consent banner, Google Consent Mode | ⚠️ Data sent to US | NOT RECOMMENDED for PDPA-first launch |
| **PostHog** | MEDIUM | ✅ | ✅ | ✅ | Free tier (1M events/mo), paid from $0/yr | Medium | MEDIUM — self-hostable, can be privacy-friendly | ✅ Self-host in SEA | RECOMMENDED |
| **Plausible** | HIGH | ✅ | ❌ | ❌ | From $9/mo | Easy | LOW — cookie-free, privacy-first | ✅ EU/SEA hosting | GOOD for page analytics only |
| **Umami** | HIGH | ✅ | ❌ | ❌ | Free (self-host), $9/mo cloud | Easy | LOW — cookie-free, privacy-first | ✅ Self-host anywhere | GOOD for page analytics only |
| **No-op** | NONE | N/A | ❌ | ❌ | Free | Trivial | NONE | N/A | START HERE — add vendor later |

---

## 2. Recommendation

### Phase 1 (Launch): No-op Adapter
- Keep the existing no-op adapter from Phase 4D
- No tracking, no consent needed
- Focus on product-market fit

### Phase 2 (Post-Launch): PostHog (Self-Hosted)
- Self-host in SEA region for PDPA compliance
- Full funnel analytics + event tracking
- Free tier is generous (1M events/mo)
- Can be added without consent banner if self-hosted and no cookies

### Decision Required

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Phase 1 approach | No-op / GA4 / PostHog | No-op |
| Phase 2 vendor | PostHog / Plausible / Umami | PostHog (self-hosted) |
| Consent strategy | Banner / No banner (cookie-free) / Google Consent Mode | Depends on vendor |
| Self-host location | Thailand / Singapore / Vietnam | Singapore (Supabase region) |

---

## 3. Required Event Taxonomy

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `page_view` | Route change | `path`, `title`, `role` |
| `landing_cta_clicked` | Click CTA on landing page | `cta_type`, `destination` |
| `register_started` | Submit register form | `method` |
| `register_completed` | Successful registration | `role`, `company_name` |
| `login_completed` | Successful login | `role`, `is_first_login` |
| `company_setup_started` | First visit to /setup-company | — |
| `company_setup_completed` | Complete company setup | `company_name`, `employee_count` |
| `job_created` | Create job posting | `job_type`, `department` |
| `candidate_added` | Add candidate | `source` |
| `interview_scheduled` | Schedule interview | `interview_type` |
| `document_uploaded` | Upload document | `document_type` |
| `report_viewed` | View report | `report_type` |
| `chat_opened` | Open AI chat widget | `role` |
| `pricing_viewed` | Visit pricing page | `plan_shown` |
| `plan_selected` | Select pricing plan | `plan_name`, `billing_cycle` |
| `checkout_started` | Start checkout | `plan_name`, `amount` |
| `checkout_completed` | Complete checkout | `plan_name`, `amount`, `payment_method` |
| `checkout_failed` | Checkout failure | `plan_name`, `error_type` |

---

## 4. Consent Strategy

### If Using Cookie-Free Analytics (Plausible/Umami/PostHog self-hosted):
- No consent banner needed
- No cookies set
- Privacy-first by design

### If Using GA4 or Cookie-Based Analytics:
- Consent banner required before any tracking
- Google Consent Mode v2 for granular control
- Respect `Do Not Track` header
- Only fire analytics after user accepts `analytics` purpose
- Integrate with existing PDPA consent banner

### Current State:
- PDPA consent banner exists with `analytics` purpose
- No analytics SDK installed
- No-op adapter in place

---

## 5. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Vendor comparison complete | ✅ 5 options evaluated |
| Event taxonomy defined | ✅ 18 events documented |
| Consent strategy documented | ✅ Cookie-free vs cookie-based paths |
| No SDK installed yet | ✅ Correct — decision required first |
| No secrets touched | ✅ |
