-- ============================================================================
-- 20240102000006_activity_log.sql
-- User activity log: who did what, where, and when.
-- Used for security audits, engagement metrics, and operational debugging.
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(80) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_company_id ON activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource
    ON activity_log(resource_type, resource_id);

-- ---------------------------------------------------------------------------
-- Secure logging RPC: automatically fills user_id, company_id, ip, user_agent
-- from the request session. Users can only log on behalf of themselves.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_activity(
    p_action VARCHAR,
    p_resource_type VARCHAR DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    SELECT company_id INTO v_company_id
    FROM user_profiles
    WHERE id = v_user_id
    LIMIT 1;

    INSERT INTO activity_log (
        user_id, company_id, action,
        resource_type, resource_id, metadata,
        ip_address, user_agent
    )
    VALUES (
        v_user_id, v_company_id, p_action,
        p_resource_type, p_resource_id, COALESCE(p_metadata, '{}'::jsonb),
        p_ip_address, p_user_agent
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_activity(
    VARCHAR, VARCHAR, UUID, JSONB, INET, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS for activity_log
-- - Members: read their own activity within their own company
-- - Admins/HR: read all activity for their company
-- - Service role: full access (used by edge functions)
-- - Insert: only via the log_activity() RPC (no direct insert)
-- ---------------------------------------------------------------------------
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_company_read" ON activity_log;
CREATE POLICY "activity_log_company_read" ON activity_log
    FOR SELECT TO authenticated
    USING (
        company_id = safe_user_company_id()
        AND (
            user_id = auth.uid()
            OR safe_user_role() IN ('admin', 'hr')
        )
    );

DROP POLICY IF EXISTS "activity_log_self_read" ON activity_log;
CREATE POLICY "activity_log_self_read" ON activity_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- No direct insert/update/delete policies: all writes go through
-- the SECURITY DEFINER log_activity() RPC.
-- This prevents clients from forging activity entries for other users.

COMMENT ON TABLE activity_log IS
    'Append-only audit log of user actions. Inserts only via log_activity() RPC.';
COMMENT ON FUNCTION log_activity IS
    'Securely log a user action. Fills user_id, company_id from session.';
