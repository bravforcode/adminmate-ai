-- Migration: 20240621000002_performance_indexes.sql
-- Add CRITICAL missing company_id indexes for 23 tables identified in
-- PERFORMANCE_VALIDATION.md (20240620000067_performance_validation.sql)
--
-- Without these indexes, every RLS policy evaluation triggers a full sequential
-- scan (O(n) per query). These indexes reduce policy evaluation to O(log n).
--
-- Using CONCURRENTLY where possible (wrapped in DO blocks since CONCURRENTLY
-- cannot run inside a transaction block in PostgreSQL).

BEGIN;

-- ============================================================
-- Phase 1: Standard company_id indexes (non-CONCURRENTLY, safe in transaction)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_business_travel_day_counts_company_id
  ON business_travel_day_counts(company_id);

CREATE INDEX IF NOT EXISTS idx_chat_platform_connections_company_id
  ON chat_platform_connections(company_id);

CREATE INDEX IF NOT EXISTS idx_cv_documents_company_id
  ON cv_documents(company_id);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_company_id
  ON data_deletion_requests(company_id);

CREATE INDEX IF NOT EXISTS idx_entity_addresses_company_id
  ON entity_addresses(company_id);

CREATE INDEX IF NOT EXISTS idx_entity_registration_numbers_company_id
  ON entity_registration_numbers(company_id);

CREATE INDEX IF NOT EXISTS idx_entity_tax_profiles_company_id
  ON entity_tax_profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_exit_interviews_company_id
  ON exit_interviews(company_id);

CREATE INDEX IF NOT EXISTS idx_final_settlement_readiness_company_id
  ON final_settlement_readiness(company_id);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_company_id
  ON idempotency_keys(company_id);

CREATE INDEX IF NOT EXISTS idx_message_queue_company_id
  ON message_queue(company_id);

CREATE INDEX IF NOT EXISTS idx_message_template_versions_company_id
  ON message_template_versions(company_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_company_id
  ON notification_preferences(company_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_v2_company_id
  ON notification_preferences_v2(company_id);

CREATE INDEX IF NOT EXISTS idx_offboarding_access_revocations_company_id
  ON offboarding_access_revocations(company_id);

CREATE INDEX IF NOT EXISTS idx_offboarding_asset_returns_company_id
  ON offboarding_asset_returns(company_id);

CREATE INDEX IF NOT EXISTS idx_offboarding_case_items_company_id
  ON offboarding_case_items(company_id);

CREATE INDEX IF NOT EXISTS idx_offboarding_documents_company_id
  ON offboarding_documents(company_id);

CREATE INDEX IF NOT EXISTS idx_offboarding_template_items_company_id
  ON offboarding_template_items(company_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_document_requests_company_id
  ON onboarding_document_requests(company_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_instance_items_company_id
  ON onboarding_instance_items(company_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_template_items_company_id
  ON onboarding_template_items(company_id);

CREATE INDEX IF NOT EXISTS idx_platform_sync_log_company_id
  ON platform_sync_log(company_id);

-- ============================================================
-- Phase 2: Additional critical indexes from performance audit
--   api_keys.company_id (listed in worst offenders with 0% coverage)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_api_keys_company_id
  ON api_keys(company_id);

COMMIT;

-- ============================================================
-- Phase 3: Post-commit verification
--   Confirm all 24 indexes exist (23 from validation + 1 api_keys)
-- ============================================================
DO $$
DECLARE
  v_expected_tables TEXT[] := ARRAY[
    'business_travel_day_counts', 'chat_platform_connections',
    'cv_documents', 'data_deletion_requests',
    'entity_addresses', 'entity_registration_numbers',
    'entity_tax_profiles', 'exit_interviews',
    'final_settlement_readiness', 'idempotency_keys',
    'message_queue', 'message_template_versions',
    'notification_preferences', 'notification_preferences_v2',
    'offboarding_access_revocations', 'offboarding_asset_returns',
    'offboarding_case_items', 'offboarding_documents',
    'offboarding_template_items', 'onboarding_document_requests',
    'onboarding_instance_items', 'onboarding_template_items',
    'platform_sync_log', 'api_keys'
  ];
  v_table TEXT;
  v_has_index BOOLEAN;
  v_missing INTEGER := 0;
BEGIN
  FOREACH v_table IN ARRAY v_expected_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = v_table
        AND indexname LIKE 'idx_' || v_table || '_company_id'
    ) INTO v_has_index;

    IF NOT v_has_index THEN
      RAISE WARNING 'Index idx_%_company_id NOT found', v_table;
      v_missing := v_missing + 1;
    END IF;
  END LOOP;

  IF v_missing = 0 THEN
    RAISE NOTICE 'All 24 company_id indexes verified successfully';
  ELSE
    RAISE WARNING '% company_id indexes missing', v_missing;
  END IF;
END $$;
