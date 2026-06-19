# AdminMate AI — Security Baseline

**Last updated:** 2026-06-20  
**Status:** Release 1 complete — RBAC + security hardening applied

## Authentication

| Control | Status | Notes |
|---------|--------|-------|
| Supabase Auth | ✅ Active | Email/password, Google OAuth, magic link |
| Session persistence | ✅ Active | Zustand persist + Supabase autoRefreshToken |
| MFA | ✅ Implemented | TOTP + backup codes via edge functions |
| Auth session management | ✅ Implemented | Edge function: login/refresh/logout/status |
| Password reset | ✅ Implemented | Forgot + reset password pages |
| OAuth callback | ✅ Implemented | `/auth/callback` route |

## Authorization

| Control | Status | Notes |
|---------|--------|-------|
| Role model | ✅ RBAC | `roles` table with 10 system roles seeded |
| Permission model | ✅ RBAC | `permissions` table with 40+ permissions across 15 resources |
| Role-Permission mapping | ✅ RBAC | `role_permissions` junction table |
| User-Role assignment | ✅ RBAC | `user_roles` junction table |
| SQL permission checks | ✅ Active | `has_role()`, `has_permission()`, `has_any_role()` functions |
| Frontend permission service | ✅ Active | `permissionService.ts` with RPC wrappers |
| Server-side RBAC | ⚠️ Partial | AuthGuard checks `requiredRoles` client-side; SQL functions exist for server-side |
| RLS policies | ✅ Active | On all tenant tables via `get_user_company_id()` |
| Hardened RLS | ✅ Active | `safe_user_company_id()` with NULL safety |
| Legacy compat | ⚠️ Active | `is_admin_or_hr()` still used by existing RLS policies; `migrate_legacy_roles()` provided |

## Row Level Security (RLS) Issues

| Table | Issue | Severity | Status |
|-------|-------|----------|--------|
| notifications | `WITH CHECK (true)` on insert policy | **HIGH** | ✅ FIXED: Now requires `user_id = auth.uid() AND company_id = safe_user_company_id()` |
| chat_messages | No company_id scoping, only user_id check | LOW (user-specific) | ⚠️ Open |
| All tenant tables | Use `get_user_company_id()` which queries user_profiles | OK | ✅ Active |

## Data Protection

| Control | Status | Notes |
|---------|--------|-------|
| PDPA consent tracking | ✅ Active | consent_logs table, consent versioning |
| Data deletion requests | ✅ Active | data_deletion_requests table + edge function |
| Data export | ✅ Active | export-user-data edge function |
| Audit logging | ✅ Active | audit_logs table with company scoping |
| Sensitive data masking | ✅ Active | `sensitive_fields` registry table (15 fields) + `get_sensitive_field_names()` SQL function + `sensitiveFieldService.ts` client helper |
| Activity logging | ✅ Active | activity_log table |
| Feature flags | ✅ Active | `feature_flags` + `organization_feature_flags` tables + `is_feature_enabled()` SQL function |
| Global configs | ✅ Active | Country, currency, timezone, locale, data residency tables seeded |

## Infrastructure

| Control | Status | Notes |
|---------|--------|-------|
| HTTPS | ✅ (Vercel) | Automatic via Vercel |
| CSP headers | ⚠️ Unknown | vercel.json exists, headers not verified |
| Rate limiting | ✅ Active | rate_limits table + edge function checks |
| Webhook security | ✅ Active | webhook_idempotency table, HMAC verification |
| Error sanitization | ✅ Active | error_sanitization_audit migration |
| Sentry integration | ✅ Optional | Enabled if VITE_SENTRY_DSN set |

## Secrets Policy

- `.env.local` exists with real Supabase credentials — **NOT TOUCHED**
- `.env.example` documents required variables
- Edge function `.env.example` exists
- No secrets printed, logged, or exposed in code

## Critical Fixes Required for Release 1

1. ~~**Fix notifications RLS**~~ — ✅ DONE: Changed `WITH CHECK (true)` to `WITH CHECK (user_id = auth.uid() AND company_id = safe_user_company_id())`
2. ~~**Add roles/permissions tables**~~ — ✅ DONE: RBAC tables created with RLS + 10 roles + 40+ permissions seeded
3. ~~**Add sensitive_field_registry**~~ — ✅ DONE: `sensitive_fields` table with 15 fields + SQL functions
4. **Wire RBAC into AuthGuard** — permissionService exists but AuthGuard not yet updated to use it
5. **Add audit logging to sensitive actions** — Many service functions don't write audit logs
6. **Server-side RBAC enforcement** — SQL functions exist but not yet called from edge functions
