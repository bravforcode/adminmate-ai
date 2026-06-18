# Phase 8E — Legal + Privacy Release Checklist

**Date**: 2026-06-18  
**Status**: ✅ COMPLETE — All items documented  
**Verdict**: DRAFT labels present. Legal review required before public/paid launch.

---

## Legal Pages Audit

| Page | Route | DRAFT Label | Support Email | Status |
|------|-------|:-----------:|:-------------:|:------:|
| Terms of Service | `/terms` | ✅ "DRAFT — For Review" | ✅ support@adminmate-ai.com | Draft |
| Privacy Policy | `/privacy` | ✅ "DRAFT — For Review" | ✅ privacy@adminmate-ai.com | Draft |
| Cookie Notice | `/cookies` | ✅ "DRAFT — For Review" | ✅ privacy@adminmate-ai.com | Draft |

---

## Missing Legal Facts

| Fact | Status | Blocker? | Impact |
|------|:------:|:--------:|--------|
| Company legal name | ❌ Missing | **YES** | ToS/Privacy can't name the data controller |
| Company registration number | ❌ Missing | **YES** | Thai law requires business registration display |
| Governing law / jurisdiction | ❌ Missing | **YES** | ToS must specify which law governs |
| Refund policy | ❌ Missing | **YES** | Required for paid subscriptions |
| Data retention periods | ❌ Missing | **YES** | PDPA requires disclosure |
| AI data retention | ❌ Missing | **YES** | Users must know how long AI data is kept |
| Subprocessors list | ❌ Missing | **YES** | PDPA requires disclosure of third-party data processors |
| Privacy contact (DPO) | ❌ Missing | **YES** | PDPA requires designated privacy contact |
| Data residency | ⚠️ Partial | Medium | Landing page mentions "regional data residency options" but Privacy page doesn't specify |
| Cookie types | ⚠️ Partial | Low | Basic cookie types listed but not exhaustive |

---

## PDPA Compliance Gaps

| PDPA Right | Implemented? | Documented? |
|------------|:------------:|:-----------:|
| Right to access | ✅ PDPAPage export | ❌ Privacy page |
| Right to correct | ✅ PDPAPage | ❌ Privacy page |
| Right to delete/anonymize | ✅ PDPAPage delete | ❌ Privacy page |
| Right to data portability | ✅ PDPAPage export | ❌ Privacy page |
| Right to restrict processing | ❌ Not implemented | ❌ Not documented |
| Right to object | ❌ Not implemented | ❌ Not documented |
| Right to withdraw consent | ✅ PDPAConsentBanner | ❌ Privacy page |
| Consent records | ✅ Audit logging | ❌ Privacy page |

---

## Paid Traffic Blocker

| Check | Status | Rationale |
|-------|:------:|-----------|
| Legal pages reviewed by lawyer | ❌ | No evidence of legal review |
| DRAFT labels present | ✅ | All three pages have DRAFT badges |
| Paid traffic verdict | ⚠️ BLOCKED | Cannot run paid traffic until legal pages are finalized |
| Free tier soft launch | ✅ OK | DRAFT pages acceptable for beta users |

---

## Verdict

| Decision | Status | Rationale |
|----------|:------:|-----------|
| DRAFT labels present | ✅ | All three pages clearly marked |
| Support email visible | ✅ | Contact info on all pages |
| Missing facts documented | ✅ | 8 critical items listed |
| Paid traffic blocked | ✅ | Legal review required |
| Free tier soft launch | ✅ | DRAFT pages acceptable for beta |
