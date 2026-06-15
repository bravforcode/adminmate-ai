-- Audit trigger: log important mutations
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, new_values)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP WHEN 'INSERT' THEN to_jsonb(NEW) WHEN 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)) WHEN 'DELETE' THEN to_jsonb(OLD) END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach audit trigger to critical tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['jobs','applications','offers','documents','onboarding_checklists','candidates'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON %s', t, t);
    EXECUTE format('CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn()', t, t);
  END LOOP;
END;
$$;

-- Add Gemini usage summary function
CREATE OR REPLACE FUNCTION get_gemini_usage_today(p_company_id UUID)
RETURNS TABLE(feature VARCHAR, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT feature, COUNT(*) FROM ai_usage_log
  WHERE company_id = p_company_id AND created_at::DATE = CURRENT_DATE
  GROUP BY feature ORDER BY COUNT(*) DESC
$$;

-- Health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'status', 'ok',
    'timestamp', NOW(),
    'db_size_mb', (SELECT ROUND(pg_database_size(current_database()) / 1048576.0, 2)),
    'active_connections', (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active')
  )
$$;
