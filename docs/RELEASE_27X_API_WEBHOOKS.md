# Release 27X — API & Webhooks

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Public API and Webhooks module, enabling third-party integrations with authenticated, scoped, and auditable API access.

---

## Scope

### In Scope

1. **API Client Management** — Register API clients with scopes and rate limits.
2. **API Key Management** — Issue, rotate, and revoke API keys (hashed storage).
3. **API Scope Enforcement** — Token-based scope validation for every API request.
4. **Webhook Subscriptions** — Register webhook endpoints with event filtering.
5. **Webhook Delivery** — HMAC-signed webhook delivery with retry and backoff.
6. **Webhook Event Log** — Delivery attempts, failures, and successes logged.
7. **No-Code Workflow** — Basic workflow definitions for event-driven actions (foundation).
8. **UI States** — API/webhook pages show correct truthful UI state.
9. **Permissions** — `api:read`, `api:write`, `api:manage`, `webhook:read`, `webhook:write`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit API/webhook tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify API keys are hashed, not stored plaintext | P0 |
| 4 | Verify API scope enforcement on every request | P0 |
| 5 | Verify webhook HMAC signature is valid and verifiable | P0 |
| 6 | Verify failed webhook retries with exponential backoff | P0 |
| 7 | Verify webhook secrets are not exposed in logs or UI | P0 |
| 8 | Verify API cannot bypass RLS | P0 |
| 9 | Fix any gaps identified in audit | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement GraphQL API (REST only).
- This release does **not** implement real-time streaming webhooks.
- This release does **not** implement OAuth2 provider (API key only).
- This release does **not** implement rate limiting per-tenant (global rate limit only).

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
