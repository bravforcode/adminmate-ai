-- 33B.3: Privileged path remediation
-- Fixes SECURITY DEFINER functions missing search_path
-- Fixes views missing security_invoker in all_migrations.sql

-- ============================================================
-- 1. Fix check_module_entitlement — add SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION check_module_entitlement(
  p_company_id UUID,
  p_module_key VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_entitled BOOLEAN;
BEGIN
  SELECT me.is_entitled INTO v_entitled
  FROM module_entitlements me
  WHERE me.company_id = p_company_id
    AND me.module_key = p_module_key
    AND me.is_entitled = true
    AND (me.expires_at IS NULL OR me.expires_at > NOW());

  RETURN COALESCE(v_entitled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Fix revoke_expired_support_grants — add SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION revoke_expired_support_grants()
RETURNS INTEGER AS $$
    WITH revoked AS (
        UPDATE support_access_grants
        SET is_active = false, revoked_at = NOW()
        WHERE is_active = true AND expires_at <= NOW()
        RETURNING id
    )
    SELECT COUNT(*) FROM revoked;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. Fix get_anonymous_survey_results — add SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION get_anonymous_survey_results(
  p_campaign_id UUID,
  p_min_group_size INTEGER DEFAULT 5
)
RETURNS TABLE (
  campaign_id UUID,
  department_id UUID,
  avg_score NUMERIC,
  response_count INTEGER,
  is_released BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.campaign_id,
    es.department_id,
    CASE
      WHEN es.response_count >= p_min_group_size THEN es.score
      ELSE NULL
    END AS avg_score,
    es.response_count,
    (es.response_count >= p_min_group_size) AS is_released
  FROM engagement_scores es
  WHERE es.campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Fix on_referral_candidate_hired — add SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION on_referral_candidate_hired()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'hired' AND OLD.status IS DISTINCT FROM 'hired' THEN
    UPDATE employee_referrals
    SET status = 'hired',
        hired_at = NOW(),
        updated_at = NOW()
    WHERE application_id = NEW.id
      AND status IN ('submitted', 'reviewed', 'interviewed');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. Fix get_public_application — add SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_application(p_token VARCHAR)
RETURNS TABLE (
  id UUID,
  status VARCHAR,
  applied_at TIMESTAMPTZ,
  job_title VARCHAR,
  company_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.status,
    a.applied_at,
    j.title AS job_title,
    c.name AS company_name
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  JOIN companies c ON c.id = a.company_id
  WHERE a.tracking_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 6. Fix log_schedule_audit — add SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION log_schedule_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('operation', TG_OP, 'ts', NOW())
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. Fix log_import_export_audit — add SET search_path = public
-- ============================================================

CREATE OR REPLACE FUNCTION log_import_export_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('operation', TG_OP, 'ts', NOW())
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 9. Recreate views with security_invoker (ensure applied)
-- ============================================================

CREATE OR REPLACE VIEW v_message_stats_daily WITH (security_invoker = true) AS
SELECT
    company_id,
    platform,
    DATE(created_at) as date,
    direction,
    status,
    COUNT(*) as message_count,
    AVG(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100 as delivery_rate
FROM messages
GROUP BY company_id, platform, DATE(created_at), direction, status;

CREATE OR REPLACE VIEW v_active_conversations WITH (security_invoker = true) AS
SELECT
    company_id,
    platform,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE last_message_at > NOW() - INTERVAL '1 hour') as active_1h,
    COUNT(*) FILTER (WHERE last_message_at > NOW() - INTERVAL '24 hours') as active_24h,
    AVG(unread_count) as avg_unread
FROM conversation_threads
WHERE status = 'active'
GROUP BY company_id, platform;

CREATE OR REPLACE VIEW v_queue_health WITH (security_invoker = true) AS
SELECT
    company_id,
    platform,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    AVG(CASE WHEN status = 'sent' THEN EXTRACT(EPOCH FROM (processed_at - created_at)) END) as avg_processing_seconds
FROM message_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY company_id, platform;

CREATE OR REPLACE VIEW v_platform_health WITH (security_invoker = true) AS
SELECT
    service,
    status,
    latency_ms,
    checked_at,
    LAG(checked_at) OVER (PARTITION BY service ORDER BY checked_at) as prev_check
FROM system_health
WHERE checked_at > NOW() - INTERVAL '1 hour';

-- ============================================================
-- 10. Audit function: verify all SECURITY DEFINER functions have search_path
-- ============================================================

CREATE OR REPLACE FUNCTION audit_security_definer_search_path()
RETURNS TABLE (
  function_name TEXT,
  has_search_path BOOLEAN,
  risk_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.proname::TEXT,
    (COALESCE(
      (SELECT setting FROM pg_settings WHERE name = 'search_path'),
      ''
    ) != '' OR proconfig IS NULL OR NOT (proconfig @> ARRAY['search_path=public']))
    AND NOT EXISTS (
      SELECT 1 FROM unnest(proconfig) AS setting
      WHERE setting = 'search_path=public'
    ) = false AS has_search_path,
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(proconfig, ARRAY[]::TEXT[])) AS setting
        WHERE setting = 'search_path=public'
      ) AND prokind = 'f' THEN 'CRITICAL'
      ELSE 'OK'
    END AS risk_level
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- SECURITY DEFINER
    AND p.prokind = 'f';    -- functions only
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Audit function: verify all views have security_invoker
-- ============================================================

CREATE OR REPLACE FUNCTION audit_view_security_invoker()
RETURNS TABLE (
  view_name TEXT,
  has_security_invoker BOOLEAN,
  risk_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT,
    (c.reloptions IS NOT NULL AND c.reloptions @> ARRAY['security_invoker=true']) AS has_security_invoker,
    CASE
      WHEN c.reloptions IS NULL OR NOT (c.reloptions @> ARRAY['security_invoker=true']) THEN 'HIGH'
      ELSE 'OK'
    END AS risk_level
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'v';  -- views only
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. RLS policy verification helper
-- ============================================================

CREATE OR REPLACE FUNCTION audit_rls_coverage()
RETURNS TABLE (
  table_name TEXT,
  has_rls BOOLEAN,
  policy_count BIGINT,
  risk_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    t.rowsecurity AS has_rls,
    (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = t.tablename) AS policy_count,
    CASE
      WHEN NOT t.rowsecurity THEN 'CRITICAL'
      WHEN (SELECT count(*) FROM pg_policies p
            WHERE p.schemaname = 'public' AND p.tablename = t.tablename) = 0 THEN 'HIGH'
      ELSE 'OK'
    END AS risk_level
  FROM pg_tables t
  WHERE t.schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON FUNCTION audit_security_definer_search_path() IS
  'Audit: Lists all SECURITY DEFINER functions and whether they have SET search_path = public';

COMMENT ON FUNCTION audit_view_security_invoker() IS
  'Audit: Lists all views and whether they have security_invoker option';

COMMENT ON FUNCTION audit_rls_coverage() IS
  'Audit: Lists all public tables, RLS status, and policy counts';
