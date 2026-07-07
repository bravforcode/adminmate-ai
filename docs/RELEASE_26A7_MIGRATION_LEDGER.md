# Migration Ledger — Release 26A.7

**Created:** 2024-06-21
**Head Migration:** `20240620000051_rls_policy_corrections.sql`
**Total Migrations:** 97 numbered files + 2 non-migration files
**Migration Namespace:** `supabase/migrations/`

---

## Migration Index

### Phase 1: Foundation (20240101)
| # | File | Tables Created | RLS | Permissions | Seed | Dependencies | 26A Edited |
|---|------|---------------|-----|-------------|------|-------------|-----------|
| 000001 | `20240101000001_extensions.sql` | — | — | — | — | — | No |
| 000002 | `20240101000002_companies.sql` | `companies` | — | — | — | — | No |
| 000003 | `20240101000003_user_profiles.sql` | `user_profiles` | — | — | — | companies | No |
| 000004 | `20240101000004_jobs.sql` | `jobs` | — | — | — | companies, user_profiles | No |
| 000005 | `20240101000005_candidates.sql` | `candidates` | — | — | — | companies | No |
| 000006 | `20240101000006_cv_documents.sql` | `cv_documents` | — | — | — | candidates, companies | No |
| 000007 | `20240101000007_applications.sql` | `applications` | — | — | — | jobs, candidates, companies | No |
| 000008 | `20240101000008_interviews.sql` | `interviews` | — | — | — | applications, companies | No |
| 000009 | `20240101000009_offers.sql` | `offers` | — | — | — | applications, candidates, jobs | No |
| 000010 | `20240101000010_documents.sql` | `documents` | — | — | — | companies, candidates, user_profiles, offers | No |
| 000011 | `20240101000011_onboarding.sql` | `onboarding_checklists`, `onboarding_tasks` | — | — | — | companies, user_profiles, offers | No |
| 000012 | `20240101000012_chat_messages.sql` | `chat_messages` | — | — | — | user_profiles, companies | No |
| 000013 | `20240101000013_notifications.sql` | `notifications` | — | — | — | user_profiles, companies | No |
| 000014 | `20240101000014_audit_logs.sql` | `audit_logs` | — | — | — | companies, user_profiles | No |
| 000015 | `20240101000015_chat_platform_connections.sql` | `chat_platform_connections` | — | — | — | companies | No |
| 000016 | `20240101000016_ai_usage_log.sql` | `ai_usage_log` | — | — | — | companies, user_profiles | No |
| 000017 | `20240101000017_rate_limits.sql` | `rate_limits` | — | — | — | companies | No |
| 000018 | `20240101000018_subscriptions.sql` | `subscriptions` | — | — | — | companies | No |
| 000019 | `20240101000019_pdpa_compliance.sql` | `pdpa_consents`, `data_deletion_requests` | — | — | — | companies, candidates, user_profiles | No |
| 000020 | `20240101000020_rls_functions.sql` | — | — | — | — | user_profiles | No |
| 000021 | `20240101000021_rls_policies.sql` | — | ENABLED + policies on 16 tables | — | — | 000020 (RLS functions) | No |
| 000022 | `20240101000022_indexes.sql` | — | — | — | — | All base tables | No |
| 000023 | `20240101000023_triggers.sql` | — | — | — | — | user_profiles, auth.users | No |
| 000024 | `20240101000024_analytics_functions.sql` | — | — | — | — | applications, companies | No |
| 000025 | `20240101000025_storage_buckets.sql` | — | — | — | 5 buckets | — | No |
| 000026 | `20240101000026_anonymize_function.sql` | — | — | — | — | candidates | No |
| 000027 | `20240101000027_fix_missing_rls.sql` | — | RLS on ai_usage_log, rate_limits, subscriptions, pdpa_consents, data_deletion_requests | — | — | 000020 | No |
| 000028 | `20240101000028_security_hardening.sql` | — | — | — | — | candidates, offers, interviews, chat_platform_connections, pdpa_consents, notifications | No |
| 000029 | `20240101000029_error_sanitization_audit.sql` | — | — | — | — | jobs, applications, offers, documents, onboarding_checklists, candidates, ai_usage_log | No |

### Phase 2: RLS Iteration (20240102)
| # | File | Tables Created | RLS | Permissions | Seed | Dependencies | 26A Edited |
|---|------|---------------|-----|-------------|------|-------------|-----------|
| 000030 | `20240102000001_fix_profiles_self_read.sql` | — | Modified `user_profiles` RLS | — | — | 000021 | No |
| 000031 | `20240102000002_fix_companies_rls.sql` | — | Modified `companies` RLS | — | — | 000021 | No |
| 000032 | `20240102000003_open_all_rls.sql` | — | Rewrote RLS on 12 tables (USING true) | — | — | 000020 | No |
| 000033 | `20240102000004_hardened_rls.sql` | — | Rewrote RLS on 12 tables (company-scoped) | — | — | 000032 | No |
| 000034 | `20240102000005_rate_limiting.sql` | `user_rate_limits` | RLS + RPC `check_rate_limit` | service_role | — | — | No |
| 000035 | `20240102000006_activity_log.sql` | `activity_log` | RLS + RPC `log_activity` | authenticated (execute) | — | user_profiles, companies | No |
| 000036 | `20240102000007_performance.sql` | — | Materialized view `dashboard_stats` | authenticated (RPCs) | dashboard_stats | All core tables | No |
| 000037 | `20240102000008_fix_companies_read.sql` | — | Rewrote `companies` RLS | — | — | 000033 | No |
| 000038 | `20240102000009_auto_refresh_dashboard.sql` | — | — | — | — | dashboard_stats, jobs, candidates, applications, documents, interviews, offers, onboarding_checklists | No |

### Phase 3: Unified Messaging (20240103)
| # | File | Tables Created | RLS | Permissions | Seed | Dependencies | 26A Edited |
|---|------|---------------|-----|-------------|------|-------------|-----------|
| 000039 | `20240103000001_unified_messages.sql` | `messages`, `conversation_threads`, `message_queue`, `platform_sync_log`, `system_health` | RLS on all 5 | service_role (queue/sync/health) | — | companies, candidates | No |
| 000040 | `20240103000002_queue_processor.sql` | — | — | — | — | message_queue | No |
| 000041 | `20240103000003_analytics_views.sql` | — | Views: v_message_stats_daily, v_active_conversations, v_queue_health, v_platform_health | — | — | messages, conversation_threads, message_queue, system_health | No |
| 000042 | `20240103000004_notifications.sql` | — | Modified `notifications` RLS | — | — | auth.users, companies | No |

### Phase 4: Security Hardening (20240104)
| # | File | Tables Created | RLS | Permissions | Seed | Dependencies | 26A Edited |
|---|------|---------------|-----|-------------|------|-------------|-----------|
| 000043 | `20240104000001_fix_rls_null_bypass.sql` | — | Rewrote RLS on 9 tables (removed NULL bypass) | — | — | 000033 | No |
| 000044 | `20240104000002_webhook_idempotency.sql` | `webhook_events` | — | — | — | — | No |
| 000045 | `20240104000003_mfa_enrollment.sql` | `mfa_enrollments` | RLS | — | — | auth.users | No |
| 000046 | `20240104000004_notification_preferences.sql` | `notification_preferences` | RLS | — | — | auth.users, companies | No |
| 000047 | `20240104000005_document_signatures.sql` | `document_signatures` | RLS | — | — | companies, documents | No |
| 000048 | `20240104000006_cleanup_indexes.sql` | — | — | — | — | Drops 11 duplicate indexes | No |
| 000049 | `20240104000007_storage_policies.sql` | — | Storage RLS on 5 buckets | — | — | 000025 | No |

### Phase 5: Reports, MFA, Vault (20240105)
| # | File | Tables Created | RLS | Permissions | Seed | Dependencies | 26A Edited |
|---|------|---------------|-----|-------------|------|-------------|-----------|
| 000050 | `20240105000001_report_schedules.sql` | `report_schedules`, `generated_reports` | RLS | — | — | companies, user_profiles | No |
| 000051 | `20240105000002_hash_backup_codes.sql` | — | — | — | — | mfa_enrollments (comment only) | No |
| 000052 | `20240105000003_audit_logs_append_only.sql` | — | — | — | — | audit_logs | No |
| 000053 | `20240105000004_enable_vault.sql` | — | — | — | — | vault extension (manual) | No |
| 000054 | `20240105000005_mfa_aal_check.sql` | — | — | — | — | auth.jwt() | No |
| 000055 | `20240105000006_vault_helpers.sql` | — | — | — | — | vault extension (manual) | No |
| 000056 | `20240105000007_vault_migrate_tokens.sql` | — | — | — | — | chat_platform_connections, vault | No |

### Phase 6: Stripe + Login Rate Limit (20240618-20240619)
| # | File | Tables Created | RLS | Permissions | Seed | Dependencies | 26A Edited |
|---|------|---------------|-----|-------------|------|-------------|-----------|
| 000057 | `20240618000001_stripe_billing.sql` | `stripe_webhook_events` | RLS (service_role) | — | — | companies | No |
| 000058 | `20240619000001_login_rate_limit_text_key.sql` | `login_rate_limits` | RLS | service_role | — | — | No |

### Phase 7: Release 26A Security Fixes (20240620)
| # | File | Tables Created | RLS | Permissions | Seed | Dependencies | 26A Edited |
|---|------|---------------|-----|-------------|------|-------------|-----------|
| 000059 | `20240620000001_security_hotfix_notifications_rls.sql` | — | Rewrote `notifications` INSERT policy | — | — | safe_user_company_id() | No |
| 000060 | `20240620000002_rbac_tables.sql` | `roles`, `permissions`, `role_permissions`, `user_roles` | RLS on all 4 | admin manage | — | auth.users, companies | **Yes** |
| 000061 | `20240620000003_rbac_seed.sql` | — | — | — | 10 roles, 40+ permissions, role mappings | 000060 | No |
| 000062 | `20240620000004_permission_helpers.sql` | — | — | — | — | user_roles, roles, permissions | No |
| 000063 | `20240620000005_sensitive_field_registry.sql` | `sensitive_field_registry` | RLS | — | 15 sensitive fields | — | **Yes** |
| 000064 | `20240620000006_global_config_tables.sql` | `country_configs`, `currency_configs`, `timezone_configs`, `locale_configs`, `data_residency_regions`, `feature_flags`, `company_feature_flags` | RLS on all 7 | admin manage flags | 9 countries, 9 currencies, 9 timezones, 10 locales, 3 regions, 11 features | — | **Yes** |
| 000065 | `20240620000007_rbac_legacy_fallback.sql` | — | — | — | — | 000060-000062 | No |
| 000066 | `20240620000008_legal_entities.sql` | `legal_entities`, `entity_addresses`, `entity_registration_numbers`, `entity_tax_profiles` | RLS on all 4 | — | — | companies | **Yes** |
| 000067 | `20240620000009_org_hierarchy.sql` | `business_units`, `cost_centers`, `locations`, `departments`, `teams`, `reporting_lines` | RLS on all 6 | — | — | companies, legal_entities, auth.users | **Yes** |
| 000068 | `20240620000010_rbac_org_permissions.sql` | — | — | 12 new permissions + role mappings | — | 000060, 000066, 000067 | No |
| 000069 | `20240620000011_employee_referrals.sql` | `employee_referrals` | RLS | — | — | companies, user_profiles, candidates, applications, jobs | **Yes** |
| 000070 | `20240620000012_referral_permissions.sql` | — | — | 4 referral permissions + role mappings | — | 000060 | **Yes** |
| 000071 | `20240620000013_candidate_portal.sql` | — | — | — | — | jobs, applications, companies | **Yes** |
| 000072 | `20240620000014_ai_recruiting_layer.sql` | `ai_recruiting_runs`, `candidate_ai_summaries`, `candidate_match_scores`, `ai_prompt_versions` | RLS on all 4 | — | — | companies, jobs, candidates, applications | **Yes** |
| 000073 | `20240620000015_messaging_approval_workflow.sql` | `message_templates`, `message_template_versions`, `message_drafts`, `message_approvals`, `message_logs`, `messaging_provider_configs` | RLS on all 6 | — | 6 bilingual templates | companies, candidates, user_profiles, jobs, applications | **Yes** |
| 000074 | `20240620000016_messaging_permissions.sql` | — | — | 7 messaging permissions + role mappings | — | 000060 | **Yes** |
| 000075 | `20240620000017_onboarding_documents_contracts.sql` | `onboarding_templates`, `onboarding_template_items`, `onboarding_instances`, `onboarding_instance_items`, `onboarding_document_requests`, `contract_templates`, `generated_contracts`, `esignature_requests`, `document_type_configs` | RLS on all 9 | 13 new permissions + mappings | 13 document types, 1 storage bucket | companies, candidates, user_profiles, jobs, offers, applications, documents | **Yes** |
| 000076 | `20240620000018_offboarding_exit_management.sql` | `offboarding_templates`, `offboarding_template_items`, `offboarding_cases`, `offboarding_case_items`, `offboarding_documents`, `offboarding_asset_returns`, `offboarding_access_revocations`, `exit_interviews`, `final_settlement_readiness` | RLS on all 9 | 13 offboarding permissions + mappings | 1 default template | companies, user_profiles | **Yes** |
| 000077 | `20240620000019_hris_core_employee_directory.sql` | `employees`, `employee_profiles`, `employee_timeline_events`, `employee_change_requests`, `employee_custom_field_definitions`, `employee_custom_field_values`, `org_chart_nodes`, `employee_documents` | RLS on all 8 | 16 HRIS permissions + mappings | 6 sensitive fields | companies, user_profiles, candidates, applications, employees, documents | **Yes** |
| 000078 | `20240620000020_global_mobility.sql` | `immigration_case_types`, `immigration_cases`, `visa_applications`, `work_permits`, `immigration_documents`, `business_travel_requests`, `business_travel_day_counts`, `global_assignments`, `eor_providers`, `eor_worker_engagements`, `mobility_alerts`, `mobility_country_rules` | RLS on all 12 | 7 mobility permissions + mappings | 8 case types | companies, employees, candidates, user_profiles, documents | **Yes** |
| 000079 | `20240620000021_attendance_leave.sql` | `attendance_records`, `attendance_corrections`, `leave_types`, `leave_balances`, `leave_requests`, `holiday_calendars`, `holiday_calendar_days` | RLS on all 7 | 1 leave_approve permission | 6 leave types | companies, employees, user_profiles | **Yes** |
| 000080 | `20240620000022_workforce_scheduling.sql` | `workforce_schedules`, `schedule_shifts`, `shift_assignments`, `schedule_templates` | RLS on all 4 | Scheduling permissions | — | companies, employees, user_profiles | **Yes** |
| 000081 | `20240620000023_thailand_payroll.sql` | `th_tax_brackets`, `th_social_security_rules`, `payroll_runs`, `payroll_line_items`, `payroll_adjustments`, `payslips` | RLS on all 6 | Payroll permissions | TH tax brackets + SS rules | companies, employees | **Yes** |
| 000082 | `20240620000024_global_payroll_framework.sql` | `payroll_cycles`, `payroll_countries`, `payroll_component_definitions` | RLS on all 3 | — | — | companies, legal_entities | **Yes** |
| 000083 | `20240620000025_data_import_export.sql` | `import_jobs`, `import_mappings`, `export_jobs` | RLS on all 3 | Import/export permissions | — | companies, user_profiles | **Yes** |
| 000084 | `20240620000026_statutory_filing.sql` | `statutory_filing_types`, `statutory_filings`, `filing_documents` | RLS on all 3 | Filing permissions | TH filing types | companies, employees | **Yes** |
| 000085 | `20240620000027_performance_management.sql` | `performance_cycles`, `performance_reviews`, `performance_goals`, `performance_feedback`, `performance_ratings` | RLS on all 5 | Performance permissions | — | companies, employees, user_profiles | **Yes** |
| 000086 | `20240620000028_internal_mobility.sql` | `internal_transfers`, `promotion_requests`, `position_changes` | RLS on all 3 | Mobility permissions | — | companies, employees, user_profiles | **Yes** |
| 000087 | `20240620000029_compliance_framework.sql` | `compliance_policies`, `compliance_acknowledgments`, `compliance_violations`, `compliance_training` | RLS on all 4 | Compliance permissions | — | companies, employees, user_profiles | **Yes** |
| 000088 | `20240620000030_billing_pricing.sql` | `billing_plans`, `company_billing`, `usage_records` | RLS on all 3 | Billing permissions | — | companies | **Yes** |
| 000089 | `20240620000031_platform_admin.sql` | `platform_admins`, `platform_audit_log`, `platform_notifications` | RLS on all 3 | Platform permissions | — | auth.users | **Yes** |
| 000090 | `20240620000032_analytics_reports.sql` | `report_definitions`, `report_executions`, `report_schedules_ext` | RLS on all 3 | Report permissions | — | companies, user_profiles | **Yes** |
| 000091 | `20240620000033_people_analytics.sql` | `people_analytics_metrics`, `analytics_snapshots` | RLS on all 2 | — | — | companies | **Yes** |
| 000092 | `20240620000034_integration_adapters.sql` | `integration_configs`, `integration_logs`, `integration_webhooks` | RLS on all 3 | Integration permissions | — | companies | **Yes** |
| 000093 | `20240620000035_benefits.sql` | `benefit_plans`, `employee_benefits`, `benefit_claims` | RLS on all 3 | Benefits permissions | — | companies, employees | **Yes** |
| 000094 | `20240620000036_learning_development.sql` | `learning_courses`, `course_enrollments`, `course_completions`, `certifications` | RLS on all 4 | Learning permissions | — | companies, employees, user_profiles | **Yes** |
| 000095 | `20240620000037_engagement_surveys.sql` | `survey_templates`, `survey_instances`, `survey_responses`, `survey_analytics` | RLS on all 4 | Survey permissions | — | companies, employees, user_profiles | **Yes** |
| 000096 | `20240620000038_asset_expense.sql` | `company_assets`, `asset_assignments`, `expense_claims`, `expense_line_items` | RLS on all 4 | Asset/expense permissions | — | companies, employees, user_profiles | **Yes** |
| 000097 | `20240620000039_compensation.sql` | `compensation_plans`, `salary_structures`, `compensation_reviews` | RLS on all 3 | Compensation permissions | — | companies, employees, user_profiles | **Yes** |
| 000098 | `20240620000040_vendor_contractor.sql` | `vendors`, `vendor_contracts`, `contractor_assignments` | RLS on all 3 | Vendor permissions | — | companies, employees | **Yes** |
| 000099 | `20240620000041_api_webhooks.sql` | `api_keys`, `api_usage_logs`, `webhook_configs` | RLS on all 3 | API permissions | — | companies, user_profiles | **Yes** |
| 000100 | `20240620000042_notification_search.sql` | `notification_templates`, `notification_channels` | RLS on both | Notification permissions | — | companies | **Yes** |
| 000101 | `20240620000043_ai_assistant.sql` | `ai_conversations`, `ai_messages`, `ai_suggestions` | RLS on all 3 | AI permissions | — | companies, user_profiles | **Yes** |
| 000102 | `20240620000044_hr_helpdesk.sql` | `hr_tickets`, `ticket_comments`, `ticket_attachments` | RLS on all 3 | Helpdesk permissions | — | companies, user_profiles | **Yes** |
| 000103 | `20240620000045_enterprise_security.sql` | `security_policies`, `security_events`, `ip_allowlists` | RLS on all 3 | Security permissions | — | companies | **Yes** |
| 000104 | `20240620000046_multi_region_dr.sql` | `region_configs`, `dr_replication_status`, `data_classification_rules` | RLS on all 3 | DR permissions | 3 default regions | — | **Yes** |
| 000105 | `20240620000047_production_hardening.sql` | `system_configs`, `maintenance_windows`, `health_checks` | RLS on all 3 | Ops permissions | — | — | **Yes** |
| 000106 | `20240620000048_tenant_isolation_fix.sql` | — | Rewrote RLS on document_type_configs, immigration_case_types, th_tax_brackets, th_social_security_rules, chat_platform_connections, messages, conversation_threads, message_queue, platform_sync_log, system_health | — | — | 000064, 000078, 000081, 000039 | **New (26A)** |
| 000107 | `20240620000049_rls_policy_inventory.sql` | — | — (SELECT queries only) | — | — | — | **New (26A)** |
| 000108 | `20240620000050_rls_chat_messages_remediation.sql` | — | Rewrote chat_messages, messages, conversation_threads RLS | — | — | 000106 | **New (26A)** |
| 000109 | `20240620000051_rls_policy_corrections.sql` | — | Rewrote chat_messages, messages, conversation_threads RLS + immutable triggers | — | — | 000108 | **New (26A)** |

---

## Drift Classification Summary

### `local_baseline_only` — Edited, No Remote Impact (0 files)
None. All 43 edited files have remote drift risk.

### `forward_fix_required` — Needs Forward Repair for Remote (43 files)
All files marked **Yes** in the "26A Edited" column above:
- `000060` (rbac_tables), `000063` (sensitive_field_registry), `000064` (global_config)
- `000066` (legal_entities), `000067` (org_hierarchy)
- `000069` (employee_referrals), `000070` (referral_permissions)
- `000071` (candidate_portal), `000072` (ai_recruiting_layer)
- `000073` (messaging_approval), `000074` (messaging_permissions)
- `000075` (onboarding_documents_contracts)
- `000076` (offboarding_exit_management)
- `000077` (hris_core_employee_directory)
- `000078` (global_mobility), `000079` (attendance_leave)
- `000080`–`000105` (all 26 enterprise feature migrations)

### `remote_drift_risk` — Could Have Been Applied to Remote (43 files)
Same 43 files as above. If any of these were applied to remote before the 26A edits, the remote has the OLD version and will diverge from local on subsequent `db reset`.

### New 26A Migrations (4 files, `forward_fix_required`)
| File | Status |
|------|--------|
| `20240620000048_tenant_isolation_fix.sql` | Must be applied to remote |
| `20240620000049_rls_policy_inventory.sql` | Informational (SELECT only) |
| `20240620000050_rls_chat_messages_remediation.sql` | Must be applied to remote |
| `20240620000051_rls_policy_corrections.sql` | Must be applied to remote |

---

## Drift Risk Analysis

### Risk Level: HIGH

**43 historical migrations** (000060–000105) were modified during 26A remediation after their initial creation. The modifications were primarily:
1. RLS policy corrections (tenant isolation, company_id scoping)
2. Added missing `IF NOT EXISTS` guards
3. Fixed `safe_user_role()` / `safe_user_company_id()` references
4. Added missing audit triggers

**Impact:** If remote was deployed with original versions, any `supabase db reset` will apply the corrected local versions, creating drift.

### Mitigation Strategy
1. **Forward repair migration** (`20240620000053_migration_reconciliation.sql`) ensures the final RLS state matches local
2. **Idempotent guards** in the repair migration prevent double-application
3. **Verification queries** confirm drift state before applying fixes

---

## Tables Created (Complete Count)

| Phase | Tables | Functions | Views | Triggers |
|-------|--------|-----------|-------|----------|
| Foundation (000001-000029) | 16 | 5 | 0 | 3 |
| RLS Iteration (000030-000038) | 2 | 4 | 1 | 1 |
| Unified Messaging (000039-000042) | 5 | 3 | 4 | 2 |
| Security Hardening (000043-000049) | 3 | 0 | 0 | 1 |
| Reports/Vault (000050-000056) | 2 | 0 | 0 | 0 |
| Stripe/Login (000057-000058) | 2 | 2 | 0 | 0 |
| Release 26A (000059-000109) | 115+ | 20+ | 0 | 15+ |
| **Total** | **~145** | **~34** | **5** | **~22** |
