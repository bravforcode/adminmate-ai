# Release 27Z — Enterprise Admin

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Enterprise Admin layer, including SSO/SAML/SCIM, Platform Admin console, data residency, DR/BCP, and production hardening — enabling enterprise-grade deployment.

---

## Scope

### In Scope

1. **SSO/SAML** — SAML SSO adapter with provider configuration and metadata exchange.
2. **OIDC** — OpenID Connect provider configuration for identity providers.
3. **SCIM** — SCIM provisioning for automated user lifecycle management.
4. **Session Policy** — Configurable session timeout, concurrent session limits, and device management.
5. **IP Allowlist** — IP-based access restrictions per tenant.
6. **Platform Admin Console** — Internal ops console for AdminMate support team (tenant search, subscription status, feature flags, support access grants).
7. **Impersonation** — Time-boxed, reason-logged impersonation visible to customer audit log.
8. **Data Residency** — Data residency settings and region mapping.
9. **Backup & Restore** — Backup policy, restore drills, and RPO/RTO documentation.
10. **Incident Readiness** — Incident response event tracking.
11. **Security Events** — Centralized security event logging and admin dashboard.
12. **UI States** — Enterprise admin pages show correct truthful UI state.
13. **Permissions** — `enterprise:sso`, `enterprise:scim`, `enterprise:session`, `platform:admin`, `platform:impersonate`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit enterprise tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify SSO disabled with clear state when not configured | P0 |
| 4 | Verify SCIM cannot bypass company scope | P0 |
| 5 | Verify session expiry policy is enforced | P0 |
| 6 | Verify no silent impersonation (customer audit log visible) | P0 |
| 7 | Verify support access grants expire and are audit logged | P0 |
| 8 | Verify internal ops cannot bypass audit logging | P0 |
| 9 | Verify data residency setting cannot be changed without approval | P0 |
| 10 | Verify backup jobs are audit logged | P1 |
| 11 | Fix any gaps identified in audit | P0 |
| 12 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real SAML identity provider integration (adapter only).
- This release does **not** implement real SCIM provisioning (protocol foundation only).
- This release does **not** implement multi-region active-active deployment.
- This release does **not** implement real-time DR failover automation.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
