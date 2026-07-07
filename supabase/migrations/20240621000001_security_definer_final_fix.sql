-- Migration: 20240621000001_security_definer_final_fix.sql
-- Final defensive fix: ALTER FUNCTION SET search_path on all SECURITY DEFINER functions
-- that were originally created without SET search_path.
--
-- Previous migration 20240620000059 used CREATE OR REPLACE to fix these.
-- This migration uses ALTER FUNCTION as a belt-and-suspenders approach to ensure
-- search_path is set even if the function body was modified by another migration.
--
-- Affected functions (7 total):
--   1. on_referral_candidate_hired()           — 20240620000011_employee_referrals.sql
--   2. get_public_application(VARCHAR)         — 20240620000013_candidate_portal.sql
--   3. log_schedule_audit()                    — 20240620000022_workforce_scheduling.sql
--   4. log_import_export_audit()               — 20240620000025_data_import_export.sql
--   5. check_module_entitlement(UUID, VARCHAR) — 20240620000030_billing_pricing.sql
--   6. revoke_expired_support_grants()         — 20240620000031_platform_admin.sql
--   7. get_anonymous_survey_results(UUID, INT) — 20240620000037_engagement_surveys.sql

-- ============================================================
-- 1. Fix on_referral_candidate_hired (TRIGGER FUNCTION)
-- ============================================================
ALTER FUNCTION public.on_referral_candidate_hired()
  SET search_path = public;

-- ============================================================
-- 2. Fix get_public_application (p_token VARCHAR)
-- ============================================================
ALTER FUNCTION public.get_public_application(p_token VARCHAR)
  SET search_path = public;

-- ============================================================
-- 3. Fix log_schedule_audit (TRIGGER FUNCTION)
-- ============================================================
ALTER FUNCTION public.log_schedule_audit()
  SET search_path = public;

-- ============================================================
-- 4. Fix log_import_export_audit (TRIGGER FUNCTION)
-- ============================================================
ALTER FUNCTION public.log_import_export_audit()
  SET search_path = public;

-- ============================================================
-- 5. Fix check_module_entitlement (p_company_id UUID, p_module_key VARCHAR)
-- ============================================================
ALTER FUNCTION public.check_module_entitlement(p_company_id UUID, p_module_key VARCHAR)
  SET search_path = public;

-- ============================================================
-- 6. Fix revoke_expired_support_grants ()
-- ============================================================
ALTER FUNCTION public.revoke_expired_support_grants()
  SET search_path = public;

-- ============================================================
-- 7. Fix get_anonymous_survey_results (p_campaign_id UUID, p_min_group_size INTEGER)
-- ============================================================
ALTER FUNCTION public.get_anonymous_survey_results(p_campaign_id UUID, p_min_group_size INTEGER)
  SET search_path = public;

-- ============================================================
-- 8. Verification: query all SECURITY DEFINER functions in public schema
--    to confirm none are missing search_path
-- ============================================================
DO $$
DECLARE
  v_missing_count INTEGER;
  v_missing_names TEXT;
BEGIN
  SELECT count(*), string_agg(p.proname, ', ')
  INTO v_missing_count, v_missing_names
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND p.prokind = 'f'
    AND NOT (COALESCE(p.proconfig, ARRAY[]::TEXT[]) @> ARRAY['search_path=public']);

  IF v_missing_count > 0 THEN
    RAISE WARNING 'SECURITY DEFINER functions still missing search_path: %', v_missing_names;
  ELSE
    RAISE NOTICE 'All SECURITY DEFINER functions in public schema have SET search_path = public';
  END IF;
END $$;
