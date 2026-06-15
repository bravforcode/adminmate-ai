CREATE OR REPLACE FUNCTION get_pipeline_counts(p_company_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(json_object_agg(status, cnt), '{}') FROM (
    SELECT status, COUNT(*) as cnt FROM applications WHERE company_id = p_company_id AND created_at > NOW() - INTERVAL '90 days' GROUP BY status
  ) t
$$;

CREATE OR REPLACE FUNCTION get_applications_trend(p_company_id UUID, p_since TIMESTAMPTZ)
RETURNS TABLE(date TEXT, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT TO_CHAR(created_at::DATE, 'YYYY-MM-DD') AS date, COUNT(*) AS count
  FROM applications WHERE company_id = p_company_id AND created_at >= p_since
  GROUP BY created_at::DATE ORDER BY created_at::DATE
$$;

CREATE OR REPLACE FUNCTION get_avg_time_to_hire(p_company_id UUID)
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (hired_at - applied_at)) / 86400)::NUMERIC, 1)
  FROM applications WHERE company_id = p_company_id AND status = 'hired' AND created_at > NOW() - INTERVAL '90 days'
$$;
