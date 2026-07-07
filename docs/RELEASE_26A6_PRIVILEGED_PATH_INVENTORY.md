# Release 26A.6 — Privileged Path Inventory

**Generated:** 2026-06-21  
**Codebase:** AdminMate AI  
**Tenant Key:** `company_id`

---

## 1. Edge Functions (27 total)

| # | Function | Auth Required | Data Touched | Tenant Resolution | Permission Check | Service-Role | Audit Event |
|---|----------|---------------|--------------|-------------------|------------------|--------------|-------------|
| 1 | `generate-jd` | Auth (Bearer) | `user_profiles`, `ai_usage_log` | `user_profiles.company_id` | Rate limit + AI limit | Yes | `jd_generation` |
| 2 | `stripe-checkout` | Auth (Bearer) | `user_profiles`, `companies` | `user_profiles.company_id` | Rate limit | Yes | Stripe checkout |
| 3 | `export-user-data` | Auth (Bearer) | `user_profiles`, `pdpa_consents`, `applications`, `documents`, `chat_messages`, `audit_logs`, `notifications`, `onboarding_checklists` | `body.company_id` or `user_profiles.company_id` | Self or admin only | Yes | `pdpa_data_export` |
| 4 | `delete-user-data` | Auth (Bearer) | `user_profiles`, `candidates`, `cv_documents`, `applications`, `interviews`, `offers`, `chat_messages`, `notifications`, `onboarding_tasks`, `pdpa_consents` | `body.company_id` or `user_profiles.company_id` | Self or admin only | Yes | `pdpa_data_deletion` |
| 5 | `stripe-webhook` | Signature (HMAC) | `stripe_webhook_events`, `companies` | `event.metadata.company_id` | Stripe signature verification | Yes | `stripe_webhook` |
| 6 | `whatsapp-webhook` | Signature (HMAC) | `webhook_events`, `chat_platform_connections`, `messages` | `conn.company_id` or `DEFAULT_COMPANY_ID` | WhatsApp signature verification | Yes | `whatsapp_webhook` |
| 7 | `line-webhook` | Signature (HMAC) | `webhook_events`, `chat_platform_connections`, `messages` | `conn.company_id` or `DEFAULT_COMPANY_ID` | LINE signature verification | Yes | `line_webhook` |
| 8 | `auth-session` | Varies by action | `auth.users`, `user_profiles` | N/A (auth flow) | N/A | Yes | `auth_session` |
| 9 | `verify-mfa` | Auth (Bearer) | `mfa_enrollments`, `audit_logs` | N/A (user-scoped) | Rate limit | Yes | `mfa_enabled` |
| 10 | `setup-mfa` | Auth (Bearer) | `mfa_enrollments` | N/A (user-scoped) | Rate limit | Yes | `mfa_setup` |
| 11 | `send-email` | Auth (Bearer) | Resend API (external) | N/A | Rate limit + template whitelist | Yes | `email_sent` |
| 12 | `health-check` | Internal key | `companies` (probe) | N/A | `X-Health-Check-Key` header | Yes | `health_check` |
| 13 | `submit-application` | Anonymous | `jobs`, `companies`, `applications`, `candidates`, `pdpa_consents`, `audit_logs` | Server-side from `job.company_id` | Job token validation + rate limit | Yes | `application.submitted` |
| 14 | `get-public-job` | Anonymous | `jobs` (via RPC) | Server-side from token | Token validation | Yes | `public_job_view` |
| 15 | `mate-ai-chat` | Auth (Bearer) | `companies`, `documents`, `user_profiles` | `body.companyId` (validated server-side) | Rate limit + AI limit | Yes | `mate_ai_chat` |
| 16 | `screen-resume` | Auth (Bearer) | `jobs`, `cv_documents`, `applications`, `ai_recruiting_runs` | `job.company_id` | Company match check + rate limit | Yes | `resume_screening` |
| 17 | `parse-resume` | Auth (Bearer) | `cv_documents`, `candidates` | `cvDoc.company_id` | Company match check + rate limit | Yes | `resume_parsed` |
| 18 | `candidate-match-score` | Auth (Bearer) | `jobs`, `candidates`, `cv_documents`, `applications`, `candidate_match_scores`, `ai_recruiting_runs` | `job.company_id` | Role check (admin/hr/recruiter) + rate limit | Yes | `match_score` |
| 19 | `metrics` | Auth (Bearer) | `user_profiles`, `companies`, `jobs`, `candidates` | N/A (global counts) | Admin/HR role check | Yes | `metrics_view` |
| 20 | `track-application` | Anonymous | `applications` (via RPC) | Server-side from token | Token validation | Yes | `application_tracked` |
| 21 | `generate-scheduled-reports` | Cron secret | `report_schedules`, `generated_reports`, `notifications` | `schedule.company_id` | `x-cron-secret` header | Yes | `report_generated` |
| 22 | `send-document-reminders` | Auth or Cron | `documents`, `notifications` | `doc.company_id` | Admin/HR role or cron secret | Yes | `reminder_sent` |
| 23 | `generate-offer-content` | Auth (Bearer) | `offers`, `companies`, `candidates`, `jobs` | `offer.company_id` | Company ownership check + rate limit | Yes | `offer_generation` |
| 24 | `candidate-summary` | Auth (Bearer) | `candidates`, `cv_documents`, `applications`, `candidate_ai_summaries`, `ai_recruiting_runs` | `candidate.company_id` | Rate limit | Yes | `candidate_summary` |
| 25 | `messaging-hub` | Auth (Bearer) | `user_profiles`, `messages`, `message_queue` | `user_profiles.company_id` | Rate limit | Yes | `messaging_hub` |
| 26 | `auth-hook-mfa` | Service-level | `auth.mfa_factors` | N/A (auth hook) | MFA status check | Yes | `mfa_hook` |
| 27 | `log-client-error` | Auth (optional) | `activity_log` | `user_profiles.company_id` (if authed) | Rate limit | Yes | `client_error` |

---

## 2. SECURITY DEFINER Functions (26 total)

| # | Function | Language | search_path | Tables Accessed | Purpose |
|---|----------|----------|-------------|-----------------|---------|
| 1 | `get_user_company_id()` | SQL | ✅ `public` | `user_profiles` | Get current user's company_id |
| 2 | `is_admin_or_hr()` | SQL | ✅ `public` | `user_profiles` | Check admin/HR role |
| 3 | `is_company_admin()` | SQL | ✅ `public` | `user_profiles` | Check company admin role |
| 4 | `handle_new_user()` | PL/pgSQL | ✅ `public` | `user_profiles` | Auto-create profile on signup |
| 5 | `update_job_filled_count()` | PL/pgSQL | ✅ `public` | `jobs`, `applications` | Update filled_count on hire |
| 6 | `audit_trigger_fn()` | PL/pgSQL | ✅ `public` | `audit_logs` | Log mutations for audit trail |
| 7 | `get_pipeline_counts()` | SQL | ✅ `public` | `applications` | Get pipeline status counts |
| 8 | `get_applications_trend()` | SQL | ✅ `public` | `applications` | Get application trend data |
| 9 | `get_avg_time_to_hire()` | SQL | ✅ `public` | `applications` | Calculate avg time to hire |
| 10 | `safe_user_company_id()` | SQL | ✅ `public` | `user_profiles` | Safe company_id for RLS |
| 11 | `safe_user_role()` | SQL | ✅ `public` | `user_profiles` | Safe role for RLS |
| 12 | `check_mfa_aal2()` | SQL | ✅ `public` | N/A (JWT) | Check MFA AAL2 level |
| 13 | `has_role()` | SQL | ✅ `public` | `user_roles`, `roles` | Check RBAC role |
| 14 | `has_permission()` | SQL | ✅ `public` | `user_roles`, `role_permissions`, `permissions` | Check RBAC permission |
| 15 | `has_any_role()` | SQL | ✅ `public` | `user_roles`, `roles` | Check multiple roles |
| 16 | `user_role_names()` | SQL | ✅ `public` | `user_roles`, `roles` | Get all role names |
| 17 | `migrate_legacy_roles()` | PL/pgSQL | ✅ `public` | `user_roles`, `roles`, `user_profiles` | Migrate legacy roles |
| 18 | `check_usage_limit()` | PL/pgSQL | ⚠️ **MISSING** | `subscriptions`, `plan_features`, `usage_records` | Check billing usage |
| 19 | `check_module_entitlement()` | PL/pgSQL | ⚠️ **MISSING** | `module_entitlements` | Check module access |
| 20 | `get_gemini_usage_today()` | SQL | ✅ `public` | `ai_usage_log` | Get AI usage stats |
| 21 | `health_check()` | SQL | ✅ `public` | N/A (system) | System health check |
| 22 | `anonymize_candidate_data()` | PL/pgSQL | ✅ `public` | `candidates` | PDPA data anonymization |
| 23 | `is_platform_admin()` | SQL | ⚠️ **MISSING** | `platform_admin_users` | Check platform admin |
| 24 | `is_platform_owner()` | SQL | ⚠️ **MISSING** | `platform_admin_users` | Check platform owner |
| 25 | `has_support_access()` | SQL | ⚠️ **MISSING** | `support_access_grants`, `platform_admin_users` | Check support access |
| 26 | `revoke_expired_support_grants()` | SQL | ⚠️ **MISSING** | `support_access_grants` | Revoke expired grants |

### ⚠️ CRITICAL: 4 SECURITY DEFINER functions missing `SET search_path = public` (verified by tests)

---

## 3. RPC Functions (Client-Side)

| # | RPC Name | Called From | Auth Required | Purpose |
|---|----------|-------------|---------------|---------|
| 1 | `get_sensitive_field_names` | `aiRecruitingService.ts`, `sensitiveFieldService.ts` | Auth | Get sensitive field list |
| 2 | `get_chat_sessions` | `chatService.ts` | Auth | Get chat sessions |
| 3 | `get_candidates_with_applications` | `candidateService.ts` | Auth | Get candidates with apps |
| 4 | `check_usage_limit` | `subscriptionService.ts` | Auth | Check billing usage |
| 5 | `check_module_entitlement` | `subscriptionService.ts` | Auth | Check module access |
| 6 | `get_dashboard_stats` | `dashboardService.ts` | Auth | Get dashboard stats |
| 7 | `get_recent_activity` | `dashboardService.ts` | Auth | Get recent activity |
| 8 | `refresh_dashboard_stats` | `dashboardService.ts` | Auth | Refresh materialized view |
| 9 | `get_pipeline_counts` | `reportGenerator.ts` | Auth | Get pipeline counts |
| 10 | `is_feature_enabled` | `featureFlagService.ts` | Auth | Check feature flag |
| 11 | `has_permission` | `permissionService.ts` | Auth | Check RBAC permission |
| 12 | `has_role` | `permissionService.ts` | Auth | Check RBAC role |
| 13 | `has_any_role` | `permissionService.ts` | Auth | Check multiple roles |
| 14 | `user_role_names` | `permissionService.ts` | Auth | Get user role names |
| 15 | `verify_table_rls` | `securityAuditService.ts` | Auth | Verify RLS policies |
| 16 | `validate_company_session` | `sessionService.ts` | Auth | Validate company session |
| 17 | `get_public_job` | Edge Function (server) | Anonymous | Get public job |
| 18 | `get_public_application` | Edge Function (server) | Anonymous | Track application |

---

## 4. Views (4 total)

| # | View | Tables | security_invoker | Risk |
|---|------|--------|------------------|------|
| 1 | `v_message_stats_daily` | `messages` | ❌ **MISSING** | May expose cross-company data |
| 2 | `v_active_conversations` | `conversation_threads` | ❌ **MISSING** | May expose cross-company data |
| 3 | `v_queue_health` | `message_queue` | ❌ **MISSING** | May expose cross-company data |
| 4 | `v_platform_health` | `system_health` | ❌ **MISSING** | System-level health data |

### ⚠️ All 4 views missing `security_invoker` — default to `security_definer` behavior

---

## 5. Storage Buckets (5 total)

| # | Bucket | Public Read | Write Policy | File Types | Size Limit |
|---|--------|-------------|--------------|------------|------------|
| 1 | `cv-uploads` | ❌ Private | Auth + company_id folder match | PDF, DOCX | 10MB |
| 2 | `company-logos` | ✅ Public | Auth + admin/HR role | JPEG, PNG, WebP, SVG | 5MB |
| 3 | `avatars` | ✅ Public | Auth + owner match | JPEG, PNG, WebP | 5MB |
| 4 | `generated-docs` | ❌ Private | Auth + company_id folder match + admin/HR | PDF | 20MB |
| 5 | `exports` | ❌ Private | Auth + company_id folder match + admin/HR | CSV, PDF, XLSX | 50MB |

---

## 6. Service-Role Client Usage

**All 27 Edge Functions** use `SUPABASE_SERVICE_ROLE_KEY` for server-side operations. This is expected for Edge Functions running in Deno runtime with verified auth.

**Frontend:** No service-role key usage found in `src/` — confirmed safe.

---

## 7. Tenant Resolution Patterns

| Pattern | Used By | Risk |
|---------|---------|------|
| `user_profiles.company_id` from auth | Most Edge Functions | ✅ Safe |
| `job.company_id` from server-side lookup | `submit-application`, `screen-resume`, `candidate-match-score` | ✅ Safe |
| `event.metadata.company_id` from webhook | `stripe-webhook` | ⚠️ Requires signature verification |
| `conn.company_id` from platform lookup | `whatsapp-webhook`, `line-webhook` | ⚠️ Requires signature verification |
| `body.company_id` from request body | `export-user-data`, `delete-user-data` | ⚠️ Must be validated against auth |

---

## 8. Security Findings Summary

### CRITICAL (Verified by Tests)
1. **4 SECURITY DEFINER functions missing `search_path`** — `get_public_job`, `check_usage_limit`, `is_platform_admin`, `has_support_access`
2. **4 views missing `security_invoker`** — `v_message_stats_daily`, `v_active_conversations`, `v_queue_health`, `v_platform_health`

### HIGH
3. **All 27 Edge Functions use service-role key** — Expected for Deno runtime, but requires strict auth verification
4. **Webhook functions rely on signature verification** — Must ensure HMAC secrets are properly configured
5. **2 additional SECURITY DEFINER functions identified without search_path** — `check_module_entitlement`, `revoke_expired_support_grants`

### MEDIUM
6. **`submit-application` and `track-application` are anonymous** — Rate limiting is critical
7. **`health-check` uses internal key** — Must not expose in production without key

### LOW
8. **`log-client-error` allows optional auth** — Rate limited by IP for unauthenticated users
9. **Storage buckets `company-logos` and `avatars` are public** — Intentional for public display

---

## 9. Recommendations

1. **Immediate:** Add `SET search_path = public` to 4 missing SECURITY DEFINER functions: `get_public_job`, `check_usage_limit`, `is_platform_admin`, `has_support_access`
2. **Immediate:** Add `security_invoker` to 4 analytics views: `v_message_stats_daily`, `v_active_conversations`, `v_queue_health`, `v_platform_health`
3. **Immediate:** Add `SET search_path = public` to `check_module_entitlement`, `revoke_expired_support_grants`, `is_platform_owner`
4. **Short-term:** Implement company_id validation for `export-user-data` and `delete-user-data` against auth
5. **Short-term:** Add audit logging to webhook functions for traceability
6. **Medium-term:** Consider implementing row-level security on views
7. **Medium-term:** Add monitoring for anonymous endpoint rate limit violations
