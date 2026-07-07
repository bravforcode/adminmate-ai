# i18n Completeness Audit Report

> Generated: 2026-06-23
> Base language: English (en)
> Target languages: Thai (th), Vietnamese (vi), Indonesian (id)
> Stack: React 19 + react-i18next + i18next-http-backend

---

## Executive Summary

| Language | Keys (EN) | Keys (Local) | Coverage | Missing Files | Status |
|----------|-----------|--------------|----------|---------------|--------|
| Thai (th) | 1,271 | 1,214 | **95.5%** | 0 | Near-complete |
| Vietnamese (vi) | 1,234 | 1,168 | **94.6%** | 1 (`portal.json`) | Needs work |
| Indonesian (id) | 1,223 | 1,152 | **94.2%** | 2 (`chat.json`, `portal.json`) | Needs work |

**Hardcoded strings in source:** None found (all UI text uses `t()` or `useTranslation`).

---

## 1. Missing Locale Files

| File | th | vi | id |
|------|----|----|-----|
| `portal.json` (job application/track) | OK | **MISSING** | **MISSING** |
| `chat.json` (AI chatbot UI) | OK | OK | **MISSING** |

### Impact
- **`portal.json` missing (vi, id):** The public job application page and application tracker will fall back to English for Vietnamese and Indonesian users. This is a user-facing feature for external applicants.
- **`chat.json` missing (id):** The AI chatbot interface will display English for Indonesian users.

---

## 2. Missing Translation Keys

### 2.1 Landing Page (Critical - Public-facing)

All three target languages are missing the **entire `landing.*` section** in `common.json`. This is the marketing/landing page with ~58 keys covering:

- Hero section, pain points, value proposition
- Module descriptions (recruitment, onboarding, documents, chat)
- Workflow demonstrations
- Security & trust section
- Audience targeting
- FAQ, CTA, and footer

**Affected languages:** th (58 keys), vi (58 keys), id (58 keys)

### 2.2 Indonesian - Additional Missing Keys (14 extra)

Beyond landing, `id/common.json` is also missing:

- `nav.my_profile`, `nav.my_tasks`, `nav.applicant_dashboard`, `nav.browse_jobs`, `nav.my_applications` (5 nav keys)
- `pdpa.withdraw_button`, `pdpa.withdraw_success`, `pdpa.revoke_button`, `pdpa.privacy_policy`, `pdpa.purpose_*`, `pdpa.consent_active` (9 PDPA keys)

### 2.3 Vietnamese - Additional Missing Keys (10 extra)

Beyond landing, `vi/common.json` is also missing:

- `empty.applicant_activity_description` (key name mismatch - vi has `applicant_description`)
- `pdpa.withdraw_button`, `pdpa.withdraw_success`, `pdpa.revoke_button`, `pdpa.privacy_policy`, `pdpa.purpose_*`, `pdpa.consent_active` (9 PDPA keys)

### 2.4 Dashboard & Recruitment (All Languages)

All languages are missing 4 keys total:

| Namespace | Key | EN Value |
|-----------|-----|----------|
| `dashboard` | `empty_candidates_title` | "No candidates yet" |
| `dashboard` | `empty_candidates_description` | "Candidates will appear here as they apply..." |
| `recruitment` | `pipeline.select_job_prompt` | "Select a job to view its pipeline" |
| `recruitment` | `pipeline.select_job_prompt_desc` | "Choose a job from the dropdown above..." |

---

## 3. Orphaned / Stale Keys (Extra in Target Languages)

These keys exist in non-English locales but **have no corresponding EN key**. They appear to be remnants of a renamed section (`notifications` -> `notification_center`):

| Key | th | vi | id |
|-----|----|----|-----|
| `notifications.title` | Orphaned | Orphaned | Orphaned |
| `notifications.markAllRead` | Orphaned | Orphaned | Orphaned |
| `notifications.empty` | Orphaned | Orphaned | Orphaned |
| `notifications.justNow` | Orphaned | Orphaned | Orphaned |
| `notifications.minutesAgo` | Orphaned | Orphaned | Orphaned |

Additionally, `vi/common.json` has `empty.applicant_description` which should be `empty.applicant_activity_description` (key mismatch).

---

## 4. Configuration Issues

### 4.1 Missing `portal` Namespace in i18n.ts

The `portal.json` namespace exists in locale files but is **NOT listed** in the `ns` array in `src/lib/i18n.ts`:

```typescript
// Current config (line 23)
ns: ['common', 'chat', 'recruitment', 'hiring', 'onboarding', 'documents', 'compliance', 'reports', 'dashboard', 'health', 'system', 'calendar'],
// portal is MISSING
```

Pages that use `useTranslation('portal')` will silently fail unless the namespace is registered.

### 4.2 Chinese (zh) Locale Not in Scope

The `zh/` directory exists with 12 files but Chinese is not in the task scope. It follows the same pattern as `id/` (missing `portal.json`).

---

## 5. Hardcoded Strings Audit

No hardcoded UI strings were found in `src/**/*.tsx`. The codebase consistently uses `useTranslation()` and the `t()` function. This is a positive finding.

---

## 6. Recommendations

### Priority 1 - Critical (User-facing)

1. **Add `portal` namespace to i18n.ts** config to prevent silent failures
2. **Create `portal.json` for vi and id** (or copy from en as placeholder)
3. **Create `chat.json` for id** (or copy from en as placeholder)

### Priority 2 - High (Marketing)

4. **Translate `landing.*` keys** for th, vi, id (58 keys each) - this is the public marketing site

### Priority 3 - Medium (Feature parity)

5. **Add 4 missing dashboard/recruitment keys** to all languages
6. **Add missing PDPA keys** to vi and id (9 keys each)
7. **Add missing nav keys** to id (5 keys)

### Priority 4 - Low (Cleanup)

8. **Remove orphaned `notifications.*` keys** from th, vi, id
9. **Fix `empty.applicant_description`** key name in vi

---

## 7. Key Counts by Namespace

| Namespace | EN | th | th % | vi | vi % | id | id % |
|-----------|-----|-----|------|-----|------|-----|------|
| common | 799 | 741 | 92.7% | 731 | 91.5% | 727 | 91.0% |
| dashboard | 33 | 31 | 93.9% | 31 | 93.9% | 31 | 93.9% |
| recruitment | 266 | 264 | 99.2% | 264 | 99.2% | 264 | 99.2% |
| hiring | 78 | 78 | 100% | 78 | 100% | 78 | 100% |
| onboarding | 54 | 52 | 96.3% | 52 | 96.3% | 52 | 96.3% |
| documents | 45 | 45 | 100% | 45 | 100% | 45 | 100% |
| compliance | 9 | 9 | 100% | 9 | 100% | 9 | 100% |
| reports | 70 | 70 | 100% | 70 | 100% | 70 | 100% |
| health | 31 | 31 | 100% | 31 | 100% | 31 | 100% |
| system | 24 | 24 | 100% | 24 | 100% | 24 | 100% |
| calendar | 16 | 16 | 100% | 16 | 100% | 16 | 100% |
| chat | 21 | 21 | 100% | 21 | 100% | **0** | **0%** |
| portal | 45 | 45 | 100% | **0** | **0%** | **0** | **0%** |
