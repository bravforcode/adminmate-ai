-- Migration: 20240621000003_fk_indexes.sql
-- Add missing FK indexes for high-traffic tables.
-- 183 FK columns were identified as missing indexes in PERFORMANCE_VALIDATION.md.
-- This migration covers the most impactful ones across core recruiting, HRIS,
-- attendance, payroll, and performance management tables.
--
-- PostgreSQL automatically creates indexes for PRIMARY KEY and UNIQUE constraints,
-- but NOT for regular FK columns. Without these indexes:
--   - JOINs require sequential scans on the FK column
--   - ON DELETE CASCADE triggers full table scans
--   - Queries filtering by FK column are O(n) instead of O(log n)

BEGIN;

-- ============================================================
-- CORE RECRUITING: applications, interviews, offers
-- ============================================================

-- applications.cv_document_id (FK to cv_documents)
-- Used when fetching application details with CV attachment
CREATE INDEX IF NOT EXISTS idx_applications_cv_document
  ON applications(cv_document_id)
  WHERE cv_document_id IS NOT NULL;

-- interviews.company_id (FK to companies)
-- Used by RLS policy evaluation and company-scoped queries
CREATE INDEX IF NOT EXISTS idx_interviews_company_id
  ON interviews(company_id);

-- offers.company_id (FK to companies)
-- Used by RLS policy evaluation and company-scoped queries
CREATE INDEX IF NOT EXISTS idx_offers_company_id
  ON offers(company_id);

-- ============================================================
-- HRIS CORE: employees, employee_profiles, timeline
-- ============================================================

-- employees.application_id (FK to applications)
-- Links employee record back to hiring application
CREATE INDEX IF NOT EXISTS idx_employees_application
  ON employees(application_id)
  WHERE application_id IS NOT NULL;

-- employees.created_by (FK to user_profiles)
-- Audit trail: who created the employee record
CREATE INDEX IF NOT EXISTS idx_employees_created_by
  ON employees(created_by)
  WHERE created_by IS NOT NULL;

-- employees.legal_entity_id (FK to legal_entities)
-- Multi-entity payroll and compliance queries
CREATE INDEX IF NOT EXISTS idx_employees_legal_entity
  ON employees(legal_entity_id)
  WHERE legal_entity_id IS NOT NULL;

-- employee_profiles.photo_document_id (FK to documents)
CREATE INDEX IF NOT EXISTS idx_emp_prof_photo
  ON employee_profiles(profile_photo_document_id)
  WHERE profile_photo_document_id IS NOT NULL;

-- employee_timeline_events.employee_id (FK to employees)
-- High-frequency reads: timeline drill-down per employee
CREATE INDEX IF NOT EXISTS idx_emp_timeline_employee_id
  ON employee_timeline_events(employee_id);

-- ============================================================
-- ONBOARDING: checklists, tasks, instances, templates
-- ============================================================

-- onboarding_checklists.company_id (FK to companies)
-- RLS policy evaluation on every query
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company_id
  ON onboarding_checklists(company_id);

-- onboarding_tasks.company_id (FK to companies)
-- RLS policy evaluation on every query
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_company_id
  ON onboarding_tasks(company_id);

-- onboarding_instances.candidate_id (FK to candidates)
-- Candidate portal: fetch onboarding status
CREATE INDEX IF NOT EXISTS idx_onboarding_instances_candidate_id
  ON onboarding_instances(candidate_id);

-- onboarding_template_items.template_id (FK to onboarding_templates)
CREATE INDEX IF NOT EXISTS idx_onboarding_template_items_template_id
  ON onboarding_template_items(template_id);

-- ============================================================
-- OFFBOARDING
-- ============================================================

-- offboarding_case_items.offboarding_case_id (FK to offboarding_cases)
-- Per-case item drill-down
CREATE INDEX IF NOT EXISTS idx_offboarding_case_items_case_id
  ON offboarding_case_items(offboarding_case_id);

-- offboarding_documents.offboarding_case_id (FK to offboarding_cases)
CREATE INDEX IF NOT EXISTS idx_offboarding_documents_case_id
  ON offboarding_documents(offboarding_case_id);

-- offboarding_access_revocations.offboarding_case_id (FK to offboarding_cases)
CREATE INDEX IF NOT EXISTS idx_offboarding_access_revocations_case_id
  ON offboarding_access_revocations(offboarding_case_id);

-- offboarding_asset_returns.offboarding_case_id (FK to offboarding_cases)
CREATE INDEX IF NOT EXISTS idx_offboarding_asset_returns_case_id
  ON offboarding_asset_returns(offboarding_case_id);

-- ============================================================
-- ATTENDANCE & LEAVE: correction approvals, leave approvals
-- ============================================================

-- attendance_corrections.requested_by (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_att_corr_requested_by
  ON attendance_corrections(requested_by);

-- attendance_corrections.approved_by (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_att_corr_approved_by
  ON attendance_corrections(approved_by)
  WHERE approved_by IS NOT NULL;

-- leave_requests.approved_by (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_lr_approved_by
  ON leave_requests(approved_by)
  WHERE approved_by IS NOT NULL;

-- ============================================================
-- PAYROLL: cycle management, run approvals, audit
-- ============================================================

-- payroll_cycles.company_id (FK to companies)
-- RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_payroll_cycles_company_id
  ON payroll_cycles(company_id);

-- payroll_runs.approved_by (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_payroll_runs_approved_by
  ON payroll_runs(approved_by)
  WHERE approved_by IS NOT NULL;

-- payroll_audit_events.created_by (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_payroll_audit_events_created_by
  ON payroll_audit_events(created_by);

-- salary_structures.employee_id (FK to employees)
-- Compensation lookups per employee
CREATE INDEX IF NOT EXISTS idx_salary_structures_employee_id
  ON salary_structures(employee_id);

-- payroll_rule_sets.country_pack_id (FK to payroll_country_packs)
CREATE INDEX IF NOT EXISTS idx_payroll_rule_sets_country_pack_id
  ON payroll_rule_sets(country_pack_id);

-- payroll_rule_versions.rule_set_id (FK to payroll_rule_sets)
CREATE INDEX IF NOT EXISTS idx_payroll_rule_versions_rule_set_id
  ON payroll_rule_versions(rule_set_id);

-- employee_tax_profiles.employee_id (FK to employees)
CREATE INDEX IF NOT EXISTS idx_employee_tax_profiles_employee_id
  ON employee_tax_profiles(employee_id);

-- ============================================================
-- PERFORMANCE MANAGEMENT: cycles, OKRs, reviews, PIPs
-- ============================================================

-- performance_cycles.created_by (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_perf_cycle_created_by
  ON performance_cycles(created_by);

-- okr_objectives.employee_id (FK to employees)
CREATE INDEX IF NOT EXISTS idx_okr_objectives_employee_id
  ON okr_objectives(employee_id);

-- okr_objectives.cycle_id (FK to performance_cycles)
CREATE INDEX IF NOT EXISTS idx_okr_objectives_cycle_id
  ON okr_objectives(cycle_id);

-- okr_key_results.objective_id (FK to okr_objectives)
CREATE INDEX IF NOT EXISTS idx_okr_key_results_objective_id
  ON okr_key_results(objective_id);

-- performance_reviews.employee_id (FK to employees)
CREATE INDEX IF NOT EXISTS idx_perf_review_employee_id
  ON performance_reviews(employee_id);

-- performance_reviews.cycle_id (FK to performance_cycles)
CREATE INDEX IF NOT EXISTS idx_perf_review_cycle_id
  ON performance_reviews(cycle_id);

-- performance_reviews.reviewer_id (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_perf_review_reviewer_id
  ON performance_reviews(reviewer_id);

-- review_responses.review_id (FK to performance_reviews)
CREATE INDEX IF NOT EXISTS idx_review_responses_review_id
  ON review_responses(review_id);

-- pip_cases.employee_id (FK to employees)
CREATE INDEX IF NOT EXISTS idx_pip_cases_employee_id
  ON pip_cases(employee_id);

-- pip_cases.manager_id (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_pip_cases_manager_id
  ON pip_cases(manager_id);

-- pip_cases.created_by (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_pip_cases_created_by
  ON pip_cases(created_by);

-- nine_box_assessments.employee_id (FK to employees)
CREATE INDEX IF NOT EXISTS idx_nine_box_employee_id
  ON nine_box_assessments(employee_id);

-- nine_box_assessments.cycle_id (FK to performance_cycles)
CREATE INDEX IF NOT EXISTS idx_nine_box_cycle_id
  ON nine_box_assessments(cycle_id);

-- nine_box_assessments.assessed_by (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_nine_box_assessed_by
  ON nine_box_assessments(assessed_by);

-- ============================================================
-- COMPENSATION: salary bands, reviews, headcount
-- ============================================================

-- compensation_reviews.cycle_id (FK to compensation_cycles)
CREATE INDEX IF NOT EXISTS idx_comp_review_cycle_id
  ON compensation_reviews(cycle_id);

-- compensation_reviews.employee_id (FK to auth.users)
CREATE INDEX IF NOT EXISTS idx_comp_review_employee_id
  ON compensation_reviews(employee_id);

-- headcount_plans.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_headcount_plans_company_id
  ON headcount_plans(company_id);

-- headcount_plans.department_id (FK to departments)
CREATE INDEX IF NOT EXISTS idx_headcount_plans_department_id
  ON headcount_plans(department_id)
  WHERE department_id IS NOT NULL;

-- ============================================================
-- DOCUMENTS & CONTRACTS
-- ============================================================

-- document_signatures.document_id (FK to documents)
CREATE INDEX IF NOT EXISTS idx_doc_sigs_document_id
  ON document_signatures(document_id);

-- document_signatures.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_doc_sigs_company_id
  ON document_signatures(company_id);

-- generated_contracts.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_generated_contracts_company_id
  ON generated_contracts(company_id);

-- esignature_requests.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_esignature_requests_company_id
  ON esignature_requests(company_id);

-- esignature_requests.generated_contract_id (FK to generated_contracts)
CREATE INDEX IF NOT EXISTS idx_esignature_requests_contract_id
  ON esignature_requests(generated_contract_id);

-- ============================================================
-- MESSAGING & NOTIFICATIONS
-- ============================================================

-- messages.conversation_id (FK to conversation_threads)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages(conversation_id);

-- message_queue.thread_id (FK to conversation_threads)
CREATE INDEX IF NOT EXISTS idx_message_queue_thread_id
  ON message_queue(thread_id)
  WHERE thread_id IS NOT NULL;

-- message_queue.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_message_queue_company_id
  ON message_queue(company_id);

-- message_template_versions.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_message_template_versions_company_id
  ON message_template_versions(company_id);

-- notification_preferences.user_id (FK to auth.users)
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id
  ON notification_preferences(user_id);

-- notification_preferences_v2.user_id (FK to auth.users)
CREATE INDEX IF NOT EXISTS idx_notification_prefs_v2_user_id
  ON notification_preferences_v2(user_id)
  WHERE user_id IS NOT NULL;

-- ============================================================
-- PLATFORM & INTEGRATIONS
-- ============================================================

-- api_keys.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_api_keys_company_id
  ON api_keys(company_id);

-- platform_sync_log.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_platform_sync_log_company_id
  ON platform_sync_log(company_id);

-- idempotency_keys.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_company_id
  ON idempotency_keys(company_id);

-- ============================================================
-- REFERRALS
-- ============================================================

-- employee_referrals.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_referrals_company_id
  ON employee_referrals(company_id);

-- employee_referrals.referrer_user_id (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user_id
  ON employee_referrals(referrer_user_id);

-- employee_referrals.job_id (FK to jobs)
CREATE INDEX IF NOT EXISTS idx_referrals_job_id
  ON employee_referrals(job_id);

-- ============================================================
-- REPORTS & ANALYTICS
-- ============================================================

-- report_schedules.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_report_schedules_company_id
  ON report_schedules(company_id);

-- generated_reports.schedule_id (FK to report_schedules)
CREATE INDEX IF NOT EXISTS idx_generated_reports_schedule_id
  ON generated_reports(schedule_id);

-- generated_reports.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_generated_reports_company_id
  ON generated_reports(company_id);

-- ============================================================
-- COMPLIANCE & LEGAL
-- ============================================================

-- legal_entities.company_id (FK to companies)
CREATE INDEX IF NOT EXISTS idx_legal_entities_company_id
  ON legal_entities(company_id);

-- entity_addresses.legal_entity_id (FK to legal_entities)
CREATE INDEX IF NOT EXISTS idx_entity_addresses_legal_entity_id
  ON entity_addresses(legal_entity_id);

-- entity_registration_numbers.legal_entity_id (FK to legal_entities)
CREATE INDEX IF NOT EXISTS idx_entity_reg_numbers_legal_entity_id
  ON entity_registration_numbers(legal_entity_id);

-- entity_tax_profiles.legal_entity_id (FK to legal_entities)
CREATE INDEX IF NOT EXISTS idx_entity_tax_profiles_legal_entity_id
  ON entity_tax_profiles(legal_entity_id);

-- ============================================================
-- ORG HIERARCHY
-- ============================================================

-- departments.parent_department_id (FK to departments, self-referential)
CREATE INDEX IF NOT EXISTS idx_departments_parent_id
  ON departments(parent_department_id)
  WHERE parent_department_id IS NOT NULL;

-- departments.business_unit_id (FK to business_units)
CREATE INDEX IF NOT EXISTS idx_departments_business_unit_id
  ON departments(business_unit_id)
  WHERE business_unit_id IS NOT NULL;

-- teams.department_id (FK to departments)
CREATE INDEX IF NOT EXISTS idx_teams_department_id
  ON teams(department_id);

-- teams.manager_user_id (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_teams_manager_user_id
  ON teams(manager_user_id)
  WHERE manager_user_id IS NOT NULL;

-- reporting_lines.employee_user_id (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_reporting_lines_employee_user_id
  ON reporting_lines(employee_user_id);

-- reporting_lines.manager_user_id (FK to user_profiles)
CREATE INDEX IF NOT EXISTS idx_reporting_lines_manager_user_id
  ON reporting_lines(manager_user_id);

-- ============================================================
-- VERIFICATION: count new indexes created
-- ============================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND indexname NOT LIKE '%_pkey';

  RAISE NOTICE 'Total public indexes after FK migration: %', v_count;
END $$;

COMMIT;
