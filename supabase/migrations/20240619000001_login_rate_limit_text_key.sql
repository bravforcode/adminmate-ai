-- Add text-based rate limit check for login (SHA-256 hash keys, not UUID)
-- This enables server-side login rate limiting by email+IP hash

CREATE TABLE IF NOT EXISTS login_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL,
  action VARCHAR(100) NOT NULL DEFAULT 'login_attempt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_rate_limits_key_action_time
  ON login_rate_limits(key_hash, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_rate_limits_created_at
  ON login_rate_limits(created_at DESC);

-- No client access — service_role only
ALTER TABLE login_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_rate_limits_no_anon" ON login_rate_limits;
CREATE POLICY "login_rate_limits_no_anon" ON login_rate_limits
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "login_rate_limits_no_authenticated" ON login_rate_limits;
CREATE POLICY "login_rate_limits_no_authenticated" ON login_rate_limits
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION check_login_rate_limit(
  p_key_hash TEXT,
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
  IF p_key_hash IS NULL OR p_key_hash = '' THEN
    RAISE EXCEPTION 'p_key_hash is required';
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
  FROM login_rate_limits
  WHERE key_hash = p_key_hash
    AND action = p_action
    AND created_at >= v_window_start;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT FALSE, v_count, v_reset_at;
    RETURN;
  END IF;

  INSERT INTO login_rate_limits (key_hash, action) VALUES (p_key_hash, p_action);

  RETURN QUERY SELECT TRUE, v_count + 1, v_reset_at;
END;
$$;

GRANT EXECUTE ON FUNCTION check_login_rate_limit TO service_role;

-- Cleanup function for old entries
CREATE OR REPLACE FUNCTION cleanup_login_rate_limits(retention_hours INT DEFAULT 24)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM login_rate_limits
  WHERE created_at < NOW() - make_interval(hours => retention_hours);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_login_rate_limits TO service_role;
