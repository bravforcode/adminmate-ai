-- Phase 3 Fix 4: RPC function for efficient audit log stats
--
-- Problem: getAuditLogStats fetches ALL user_ids then counts with Set client-side.
-- For companies with thousands of audit logs, this transfers massive data.
--
-- Solution: Server-side COUNT(DISTINCT) and action aggregation via RPC.

CREATE OR REPLACE FUNCTION get_audit_log_stats(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_logs', (SELECT COUNT(*) FROM audit_logs WHERE company_id = p_company_id),
    'today_count', (SELECT COUNT(*) FROM audit_logs WHERE company_id = p_company_id AND created_at >= v_today_start),
    'unique_users', (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE company_id = p_company_id),
    'top_actions', (
      SELECT COALESCE(json_agg(t), '[]'::json)
      FROM (
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE company_id = p_company_id AND created_at >= v_today_start
        GROUP BY action
        ORDER BY count DESC
        LIMIT 5
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
