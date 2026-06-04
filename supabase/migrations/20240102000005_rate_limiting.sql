-- Per-user rate limiting for Edge Functions
-- Atomic check-and-increment via SECURITY DEFINER RPC

CREATE TABLE IF NOT EXISTS user_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_action_time
  ON user_rate_limits(user_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_rate_limits_created_at
  ON user_rate_limits(created_at DESC);

ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_rate_limits_no_anon" ON user_rate_limits;
CREATE POLICY "user_rate_limits_no_anon" ON user_rate_limits
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "user_rate_limits_no_authenticated" ON user_rate_limits;
CREATE POLICY "user_rate_limits_no_authenticated" ON user_rate_limits
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS TABLE(allowed BOOLEAN, current_count INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;
  IF p_action IS NULL OR p_action = '' THEN
    RAISE EXCEPTION 'p_action is required';
  END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RAISE EXCEPTION 'p_limit must be positive';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'p_window_seconds must be positive';
  END IF;

  v_reset_at := NOW() + make_interval(secs => p_window_seconds);
  v_window_start := NOW() - make_interval(secs => p_window_seconds);

  SELECT COUNT(*)::INT INTO v_count
  FROM user_rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at >= v_window_start;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT FALSE, v_count, v_reset_at;
    RETURN;
  END IF;

  INSERT INTO user_rate_limits (user_id, action) VALUES (p_user_id, p_action);

  RETURN QUERY SELECT TRUE, v_count + 1, v_reset_at;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;

CREATE OR REPLACE FUNCTION cleanup_rate_limits(retention_hours INT DEFAULT 24)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM user_rate_limits
  WHERE created_at < NOW() - make_interval(hours => retention_hours);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_rate_limits TO service_role;
