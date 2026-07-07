# Release 25 — Provider Integration Status Report

**Audit date:** 2026-06-21
**Scope:** Every external provider/service referenced in the codebase.

---

## 1. Provider-by-Provider Status

| # | Provider | Has Adapter | Real API Call | Sig Verification | Idempotency | Retry/Backoff | Real Provider Test | Status |
|---|----------|:-----------:|:-------------:|:----------------:|:-----------:|:-------------:|:------------------:|--------|
| 1 | **Stripe** (billing) | ✅ Yes | ✅ Yes | ✅ HMAC-SHA256, constant-time | ✅ `stripe_webhook_events` dedup | ❌ No | ❌ No (test mode keys only) | **partially_connected** |
| 2 | **Email** (Resend) | ✅ Yes | ✅ Yes (Resend API) | N/A (outbound only) | ❌ No | ❌ No | ❌ No | **partially_connected** |
| 3 | **LINE** (messaging) | ✅ Yes | ✅ Yes (LINE Messaging API) | ✅ HMAC-SHA256 `x-line-signature` | ✅ `webhook_events` dedup via `message_id` | ❌ No | ❌ No | **partially_connected** |
| 4 | **WhatsApp** (messaging) | ✅ Yes | ✅ Yes (Meta Cloud API v22.0) | ✅ HMAC-SHA256 `x-hub-signature-256` | ✅ `webhook_events` dedup via `message_id` | ❌ No | ❌ No | **partially_connected** |
| 5 | **SMS** (Twilio) | ⚠️ Stub only | ❌ No | N/A | ❌ No | ❌ No | ❌ No | **interface_only** |
| 6 | **Facebook Messenger** | ⚠️ Stub only | ❌ No (stub returns `provider_not_configured`) | N/A | ❌ No | ❌ No | ❌ No | **interface_only** |
| 7 | **DocuSign / e-sign** | ⚠️ Partial | ❌ No (always returns `not_configured`) | N/A | ❌ No | ❌ No | ❌ No | **interface_only** |
| 8 | **SSO / SAML** | ✅ Yes | ⚠️ Partial (fetches metadata URL only) | N/A (inbound SSO, not webhook) | ❌ No | ❌ No | ❌ No | **partially_connected** |
| 9 | **SCIM** | ✅ DB schema only | ❌ No (no HTTP handler) | N/A | ❌ No | ❌ No | ❌ No | **interface_only** |
| 10 | **Slack** | ✅ DB seed only | ❌ No (no edge function or service) | N/A | ❌ No | ❌ No | ❌ No | **not_implemented** |
| 11 | **Microsoft Teams** | ✅ DB seed only | ❌ No (no edge function or service) | N/A | ❌ No | ❌ No | ❌ No | **not_implemented** |
| 12 | **Google Calendar** | ⚠️ URL-only | ❌ No (generates `calendar.google.com` deep link) | N/A | ❌ No | ❌ No | ❌ No | **interface_only** |
| 13 | **Microsoft Calendar** | ⚠️ URL-only | ❌ No (generates `outlook.live.com` deep link) | N/A | ❌ No | ❌ No | ❌ No | **interface_only** |
| 14 | **Xero** | ✅ DB seed only | ❌ No | N/A | ❌ No | ❌ No | ❌ No | **not_implemented** |
| 15 | **QuickBooks** | ✅ DB seed only | ❌ No | N/A | ❌ No | ❌ No | ❌ No | **not_implemented** |
| 16 | **EOR Providers** | ✅ DB schema + CRUD | ❌ No (registry only, no API integration) | N/A | ❌ No | ❌ No | ❌ No | **interface_only** |

### Status Definitions

| Status | Meaning |
|--------|---------|
| **production_ready** | Real API calls, signature verification, idempotency, retry, and test coverage all present |
| **partially_connected** | Real API calls exist but missing one or more of: idempotency, retry, real-provider tests |
| **interface_only** | Adapter/interface exists, DB schema exists, but no real outbound API call is made |
| **not_implemented** | Only a DB seed row or reference in docs; no code, no service, no edge function |

---

## 2. Detailed Notes per Provider

### 2.1 Stripe
- **Files:** `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/stripe-checkout/index.ts`
- **What works:** Full HMAC-SHA256 signature verification with constant-time comparison (`charCodeAt` XOR loop). Deduplication via `stripe_webhook_events` table. Handles `checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`, `invoice.paid`.
- **What's missing:** No retry/backoff on API calls. No live-mode testing (test keys only). `stripe-checkout` uses `select('*')` returning all company columns. Error responses sanitized (good).
- **Security:** Signature verified before parse. company_id resolved from `event.data.object.metadata.company_id` (server-side metadata, not client payload).

### 2.2 Email (Resend)
- **File:** `supabase/functions/send-email/index.ts`, `src/services/messaging/providers/emailProvider.ts`
- **What works:** Real Resend API call in edge function. Auth-gated, rate-limited (20/min), template validation. HTML escaping.
- **What's missing:** Client-side `emailProvider.ts` is a stub that always returns `provider_not_configured`. No retry on Resend failure. No delivery tracking. No bounce/complaint webhook.
- **Provider SDK:** Resend (`api.resend.com/emails`), no SDK — raw fetch.

### 2.3 LINE
- **Files:** `supabase/functions/line-webhook/index.ts`, `src/services/messaging/providers/lineProvider.ts`, `_shared/messageHandler.ts`, `_shared/messagingHub.ts`
- **What works:** HMAC-SHA256 signature verification on inbound. Fail-closed if `LINE_CHANNEL_SECRET` missing. Idempotency via `webhook_events` table. Multi-tenant: resolves `company_id` from `chat_platform_connections` (server-side lookup, not client payload). Outbound via LINE Push API (`api.line.me/v2/bot/message/push`). Vault-backed tokens (`get_decrypted_token` RPC). AI-powered response via `mate-ai-chat`.
- **What's missing:** No retry/backoff on outbound API calls. No integration tests with real LINE OA. HMAC comparison uses `!==` (not constant-time) — though the secret is not timing-sensitive in the same way as Stripe.

### 2.4 WhatsApp
- **Files:** `supabase/functions/whatsapp-webhook/index.ts`, `src/services/messaging/providers/whatsappProvider.ts`, `_shared/messageHandler.ts`, `_shared/messagingHub.ts`
- **What works:** HMAC-SHA256 signature verification on inbound (`x-hub-signature-256`). Fail-closed if `WHATSAPP_APP_SECRET` missing (fixed from earlier LINE fallback bug). Idempotency via `webhook_events` table. Multi-tenant: resolves `company_id` from `chat_platform_connections`. Outbound via Meta Cloud API v22.0 (`graph.facebook.com`). Vault-backed tokens. GET challenge-response for webhook verification.
- **What's missing:** No retry/backoff on outbound calls. No integration tests. No inbound media handling (text only). Signature comparison is `!==` (not constant-time).

### 2.5 SMS (Twilio)
- **File:** `src/services/messaging/providers/smsProvider.ts`
- **Status:** Pure stub. `isConfigured()` returns `false`. No API call. No Twilio SDK. No edge function.
- **Gap:** Entire provider is missing.

### 2.6 Facebook Messenger
- **File:** `src/services/messaging/providers/facebookProvider.ts`
- **Status:** Pure stub. `isConfigured()` returns `false`. No API call. Meta Graph API calls exist in `_shared/messageHandler.ts` and `_shared/messagingHub.ts` but only for WhatsApp (same endpoint pattern). No Facebook-specific webhook handler.
- **Gap:** No webhook, no inbound handling, no outbound for Messenger specifically.

### 2.7 DocuSign / E-Signature
- **File:** `src/services/onboarding/eSignatureService.ts`, `supabase/migrations/.../onboarding_documents_contracts.sql`
- **What exists:** `esignature_requests` table with RLS. `ESignatureProvider` type (`docusign | zapier_sign | manual`). Manual signing fallback works.
- **What's missing:** `isProviderConfigured()` always returns `false` for external providers. No DocuSign SDK, no API calls, no webhook handler for signature callbacks. No embedded signing flow.
- **Gap:** Interface + DB schema only. No real integration.

### 2.8 SSO / SAML
- **File:** `src/services/security/ssoService.ts`, `supabase/migrations/.../enterprise_security.sql`
- **What exists:** `sso_provider_configs` table (SAML, OIDC, Azure AD, Google Workspace types). CRUD operations. Metadata URL fetch test. Entity ID + certificate validation. RLS policies. Disabled by default.
- **What's missing:** No SAML assertion parsing. No IdP redirect flow. No callback handler. No session creation from SAML response. Metadata URL fetch is the only real API call. No OAuth flow for OIDC.
- **Gap:** Configuration management works. Authentication flow is not implemented.

### 2.9 SCIM
- **File:** `supabase/migrations/.../enterprise_security.sql`
- **What exists:** `scim_tokens` table with RLS. Token hash, expiry, scopes. `validate_scim_token()` function. RBAC permissions (`sso:read`, `sso:write`).
- **What's missing:** No HTTP endpoint. No SCIM 2.0 resource handlers (Users, Groups). No provisioning logic.
- **Gap:** DB schema only. No functional integration.

### 2.10 Slack
- **File:** `supabase/migrations/.../integration_adapters.sql` (seed row only)
- **Status:** Single row in `integration_providers` table. No edge function, no service, no adapter.
- **Gap:** Not implemented.

### 2.11 Microsoft Teams
- **File:** `supabase/migrations/.../integration_adapters.sql` (seed row only)
- **Status:** Single row in `integration_providers` table. No edge function, no service, no adapter.
- **Gap:** Not implemented.

### 2.12 Google Calendar
- **File:** `src/services/calendarService.ts`
- **What exists:** `addToGoogleCalendarUrl()` generates a `calendar.google.com/calendar/render` deep link. `CalendarSettings` stored in localStorage.
- **What's missing:** No OAuth2 flow. No Google Calendar API calls. No event sync. No webhook for changes.
- **Gap:** URL generator only. No real integration.

### 2.13 Microsoft Calendar (Outlook)
- **File:** `src/services/calendarService.ts`
- **What exists:** `getOutlookWebUrl()` generates an `outlook.live.com/calendar` deep link.
- **What's missing:** Same as Google Calendar — no OAuth, no Graph API calls, no sync.
- **Gap:** URL generator only.

### 2.14 Xero / QuickBooks
- **File:** `supabase/migrations/.../integration_adapters.sql` (seed rows only)
- **Status:** Two rows in `integration_providers`. No service, no edge function.
- **Gap:** Not implemented.

### 2.15 EOR Providers
- **File:** `supabase/migrations/.../global_mobility.sql`, `src/services/` (no service file found)
- **What exists:** `eor_providers` table (name, contact, website — no API keys). `eor_worker_engagements` table. RLS policies. No secrets in schema (verified in tests).
- **What's missing:** No API integration with any EOR provider (Deel, Remote, Oyster, etc.). No webhook. No data sync.
- **Gap:** Registry only. No functional integration.

---

## 3. Webhook Security Audit

### 3.1 Do webhooks verify signatures?

| Webhook | Signature Check | Algorithm | Fail-Closed? |
|---------|:--------------:|-----------|:------------:|
| `stripe-webhook` | ✅ Yes | HMAC-SHA256, constant-time XOR | ✅ Yes (returns 400) |
| `line-webhook` | ✅ Yes | HMAC-SHA256 | ✅ Yes (returns 500 if secret missing, 401 if sig invalid) |
| `whatsapp-webhook` | ✅ Yes | HMAC-SHA256 | ✅ Yes (returns 500 if secret missing, 403 if sig invalid) |
| `send-email` | N/A | N/A (outbound, auth-gated) | ✅ Yes (auth + rate limit) |

### 3.2 Do webhooks check idempotency?

| Webhook | Idempotency Check | Dedup Key | Table |
|---------|:-----------------:|-----------|-------|
| `stripe-webhook` | ✅ Yes | `stripe_event_id` | `stripe_webhook_events` |
| `line-webhook` | ✅ Yes | `platform + message_id` | `webhook_events` |
| `whatsapp-webhook` | ✅ Yes | `platform + message_id` | `webhook_events` |

### 3.3 Do webhooks resolve company_id from server-side data?

| Webhook | company_id Source | Client Payload? |
|---------|------------------|:---------------:|
| `stripe-webhook` | `event.data.object.metadata.company_id` | ⚠️ Stripe metadata (set server-side at checkout creation, so safe) |
| `line-webhook` | `chat_platform_connections` lookup by `platform_account_id` | ❌ No — server-side DB lookup |
| `whatsapp-webhook` | `chat_platform_connections` lookup by `platform_account_id` | ❌ No — server-side DB lookup |

**Verdict:** All three webhooks resolve company_id from server-side data. The Stripe webhook reads from metadata that was written during checkout session creation (server-controlled), not from the webhook payload directly.

### 3.4 Remaining Webhook Risks

1. **LINE HMAC comparison is not constant-time** — uses `!==` instead of bitwise XOR (minor risk, timing attacks unlikely for webhook verification).
2. **WhatsApp HMAC comparison is not constant-time** — same issue as LINE.
3. **No retry/backoff** on any webhook's outbound API calls (LINE reply, WhatsApp reply).
4. **No integration tests** with real webhook payloads from Stripe, LINE, or WhatsApp.
5. **Default company fallback** — both LINE and WhatsApp fall back to `DEFAULT_COMPANY_ID` env var if no connection match, which could route messages to wrong tenant.

---

## 4. Summary

| Category | Count |
|----------|-------|
| production_ready | **0** |
| partially_connected | **4** (Stripe, Resend, LINE, WhatsApp) |
| interface_only | **8** (SMS, Facebook, e-sign, SCIM, Google Calendar, MS Calendar, EOR, SSO partially) |
| not_implemented | **4** (Slack, Teams, Xero, QuickBooks) |

### Critical Gaps for Release 25

1. **No provider is production-ready.** The four partially-connected providers (Stripe, Email, LINE, WhatsApp) all lack retry/backoff and real-provider integration tests.
2. **Stripe is test-mode only.** No live payments have been processed. No PCI compliance review.
3. **SSO is config-only.** SAML/OIDC authentication flow (redirect, callback, assertion parsing) is not implemented.
4. **SCIM is schema-only.** No provisioning endpoint exists.
5. **E-signature is manual-only.** DocuSign integration is not wired.
6. **No messaging retry.** Failed LINE/WhatsApp replies are silently dropped (no dead-letter queue, no retry).
7. **4 providers are not implemented at all** (Slack, Teams, Xero, QuickBooks) — only seed data in DB.

### Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Add retry/backoff to LINE and WhatsApp outbound calls | 2h |
| P0 | Make LINE and WhatsApp HMAC comparisons constant-time | 1h |
| P1 | Add integration tests for Stripe webhook (with synthetic events) | 4h |
| P1 | Add integration tests for LINE/WhatsApp webhooks | 4h |
| P1 | Wire Resend delivery status webhook for email tracking | 2h |
| P2 | Implement SAML assertion parsing + callback handler | 2-3d |
| P2 | Implement DocuSign embedded signing flow | 2-3d |
| P2 | Add SCIM 2.0 HTTP endpoint for user provisioning | 2d |
| P3 | Implement Twilio SMS adapter | 1d |
| P3 | Implement Google Calendar OAuth + sync | 2d |
| P3 | Implement Microsoft Calendar OAuth + sync | 2d |
| P3 | Wire Slack/Teams notification adapters | 1-2d each |
| P3 | Wire Xero/QuickBooks accounting sync | 2-3d each |
