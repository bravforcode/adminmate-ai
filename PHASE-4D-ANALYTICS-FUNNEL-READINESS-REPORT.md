# Phase 4D Analytics / Funnel Tracking Readiness Report

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE (Documentation Only — No Code Changes)

---

## 1. Executive Verdict

| Area | Status | Notes |
|------|--------|-------|
| Existing analytics | ✅ NONE | No GA/GTM/Segment/PostHog/Mixpanel code found |
| Event taxonomy | ✅ DEFINED | Documented below — ready for implementation |
| Funnel definition | ✅ DEFINED | Auth → Onboarding → Core usage flows documented |
| No-op adapter pattern | ✅ READY | Documented below — no code changes needed |
| Safe for Phase 4E | ✅ YES | |

**No code was changed in this phase.** This is a documentation/audit phase only.

---

## 2. Existing Analytics Scan

| Tool | Found | Notes |
|------|-------|-------|
| Google Analytics (gtag) | ❌ | Not present |
| Google Tag Manager (GTM) | ❌ | Not present |
| Segment | ❌ | Not present |
| PostHog | ❌ | Not present |
| Mixpanel | ❌ | Not present |
| Amplitude | ❌ | Not present |
| Hotjar | ❌ | Not present |
| Microsoft Clarity | ❌ | Not present |
| Custom `trackEvent` | ❌ | Not present |
| PDPA consent banner | ✅ | Has `analytics` purpose key but no implementation |

**Conclusion**: Analytics is 100% greenfield. No vendor lock-in, no legacy code to remove.

---

## 3. Event Taxonomy (Recommended)

### 3.1 Auth Funnel (Top of Funnel)

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `page_view` | Route change (React Router) | `path`, `title`, `role` |
| `auth.register_start` | Click "Create account" on register page | `source` (landing page) |
| `auth.register_complete` | Successful registration | `role`, `method` (email) |
| `auth.login_start` | Submit login form | `method` (email) |
| `auth.login_success` | Successful login | `role`, `is_first_login` |
| `auth.login_failed` | Failed login | `error_type` |
| `auth.forgot_password` | Submit forgot password | — |
| `auth.reset_password_complete` | Successful password reset | — |

### 3.2 Onboarding Funnel

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `onboarding.company_setup_start` | First visit to /setup-company | — |
| `onboarding.company_setup_complete` | Complete company setup | `company_name`, `employee_count` |
| `onboarding.tour_start` | Click "Start tour" | — |
| `onboarding.tour_complete` | Complete all tour steps | `steps_completed` |
| `onboarding.tour_skip` | Skip tour at any step | `skipped_at_step` |

### 3.3 Core Feature Usage (Activation)

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `feature.job_created` | Create job posting | `job_type`, `department` |
| `feature.candidate_added` | Add candidate | `source` (manual/import) |
| `feature.candidate_stage_change` | Move candidate in pipeline | `from_stage`, `to_stage` |
| `feature.interview_scheduled` | Schedule interview | `interview_type` |
| `feature.document_sent` | Send document for signing | `document_type` |
| `feature.document_signed` | Complete document signing | `document_type` |
| `feature.report_generated` | Generate report | `report_type` |
| `feature.chat_opened` | Open AI chat widget | `role` |
| `feature.chat_message_sent` | Send message to AI | `message_length`, `role` |
| `feature.bulk_import_started` | Start bulk import | `file_type`, `row_count` |
| `feature.bulk_import_complete` | Complete bulk import | `imported_count`, `error_count` |

### 3.4 Settings & Compliance

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `settings.profile_updated` | Update profile settings | `fields_changed` |
| `settings.notification_changed` | Toggle notification preference | `channel`, `enabled` |
| `settings.mfa_enabled` | Enable MFA | `method` |
| `settings.mfa_disabled` | Disable MFA | — |
| `settings.pdpa_consent_given` | Accept PDPA consent | `purposes` |
| `settings.pdpa_data_export` | Request data export | — |
| `settings.pdpa_data_delete` | Request data deletion | — |

### 3.5 Error & Performance

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `error.api` | API error response | `endpoint`, `status_code`, `message` |
| `error.unhandled` | Uncaught error | `error_type`, `stack_trace` |
| `perf.slow_load` | Page load > 3s | `path`, `load_time_ms` |

---

## 4. Funnel Definition

### 4.1 HR User Acquisition Funnel

```
Landing Page
  → /register (auth.register_start)
    → /login (auth.login_success)
      → /setup-company (onboarding.company_setup_start)
        → /dashboard (onboarding.company_setup_complete)
          → First Feature Use (feature.*)
            → Retention (repeat visits)
```

### 4.2 Applicant Funnel

```
Landing Page
  → /register (auth.register_start)
    → /login (auth.login_success)
      → /applicant/dashboard
        → /applicant/jobs (browse)
          → /applicant/jobs/:id (view detail)
            → Apply (feature.application_submitted)
              → /applicant/status (track status)
```

---

## 5. No-Op Adapter Pattern

When analytics vendor is not configured, use a no-op adapter that logs to console in dev:

```typescript
// src/lib/analytics.ts
type AnalyticsEvent = {
  name: string
  properties?: Record<string, unknown>
  timestamp?: number
}

interface AnalyticsAdapter {
  track: (event: AnalyticsEvent) => void
  identify: (userId: string, traits?: Record<string, unknown>) => void
  page: (name: string, properties?: Record<string, unknown>) => void
}

const noopAdapter: AnalyticsAdapter = {
  track: (event) => {
    if (import.meta.env.DEV) {
      console.log(`[Analytics] track:`, event.name, event.properties)
    }
  },
  identify: (userId, traits) => {
    if (import.meta.env.DEV) {
      console.log(`[Analytics] identify:`, userId, traits)
    }
  },
  page: (name, properties) => {
    if (import.meta.env.DEV) {
      console.log(`[Analytics] page:`, name, properties)
    }
  },
}

// Swap this with real adapter when vendor is chosen
let adapter: AnalyticsAdapter = noopAdapter

export function setAnalyticsAdapter(a: AnalyticsAdapter) {
  adapter = a
}

export const analytics = {
  track: (name: string, properties?: Record<string, unknown>) =>
    adapter.track({ name, properties, timestamp: Date.now() }),
  identify: (userId: string, traits?: Record<string, unknown>) =>
    adapter.identify(userId, traits),
  page: (name: string, properties?: Record<string, unknown>) =>
    adapter.page(name, properties),
}
```

---

## 6. Privacy / PDPA Considerations

| Concern | Recommendation |
|---------|----------------|
| Consent before tracking | Respect existing PDPA consent banner — only fire analytics after user accepts `analytics` purpose |
| IP anonymization | Required for Google Analytics |
| Data retention | Define retention period (e.g., 26 months) |
| Opt-out mechanism | Respect `Do Not Track` header |
| Cross-border data transfer | Ensure vendor complies with PDPA |
| Children's data | HR SaaS — no children expected |

---

## 7. Implementation Checklist (When Ready)

- [ ] Choose analytics vendor (GA4, PostHog, Mixpanel, etc.)
- [ ] Add `VITE_*_API_KEY` to `.env` and Vercel
- [ ] Implement vendor-specific adapter in `src/lib/analytics.ts`
- [ ] Add `analytics.page()` calls in router (useEffect in AppLayout)
- [ ] Add `analytics.track()` calls at key conversion points
- [ ] Integrate with PDPA consent banner (conditional tracking)
- [ ] Add analytics E2E tests (verify no tracking without consent)
- [ ] Test in staging before production deploy

---

## 8. Tests / Checks Run

| Command | Result |
|---------|--------|
| Analytics code search | ✅ PASS — no existing analytics |
| Env var search | ✅ PASS — no analytics env vars |
| Router audit | ✅ PASS — all routes documented |

---

## 9. Safe for Phase 4E

YES. No analytics code exists, no vendor lock-in, no privacy concerns from tracking. The taxonomy and adapter pattern are documented for future implementation.
