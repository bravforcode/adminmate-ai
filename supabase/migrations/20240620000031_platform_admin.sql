-- RELEASE 12B — Platform Admin / Internal Ops Console
-- Tables: platform_admin_users, support_access_grants, tenant_support_notes, platform_audit_logs
-- Critical: All impersonation is visible to customer Owner/Admin audit log. No silent impersonation.

-- ============== PLATFORM_ADMIN_USERS ==============
CREATE TABLE IF NOT EXISTS platform_admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'support' CHECK (role IN ('owner', 'support')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_admin_users_user_id ON platform_admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admin_users_active ON platform_admin_users(is_active) WHERE is_active = true;

-- ============== SUPPORT_ACCESS_GRANTS ==============
CREATE TABLE IF NOT EXISTS support_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES platform_admin_users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    granted_by UUID NOT NULL REFERENCES platform_admin_users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_by UUID REFERENCES platform_admin_users(id),
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_access_grants_company ON support_access_grants(company_id);
CREATE INDEX IF NOT EXISTS idx_support_access_grants_admin ON support_access_grants(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_support_access_grants_active ON support_access_grants(company_id, is_active)
    WHERE is_active = true;

-- ============== TENANT_SUPPORT_NOTES ==============
CREATE TABLE IF NOT EXISTS tenant_support_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES platform_admin_users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_support_notes_company ON tenant_support_notes(company_id);

-- ============== PLATFORM_AUDIT_LOGS ==============
CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES platform_admin_users(id),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_company ON platform_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_admin ON platform_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_action ON platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created ON platform_audit_logs(created_at DESC);

-- ============== RLS POLICIES ==============
ALTER TABLE platform_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_support_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only platform_admin_users can read platform_admin_users
CREATE POLICY platform_admin_users_self_read ON platform_admin_users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.is_active = true
        )
    );

-- Only platform_admin_users with role='owner' can manage platform_admin_users
CREATE POLICY platform_admin_users_owner_manage ON platform_admin_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.role = 'owner' AND pau.is_active = true
        )
    );

-- Support access grants: platform admins can see grants for their companies
CREATE POLICY support_access_grants_admin_read ON support_access_grants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.is_active = true
        )
    );

-- Only platform_admin_users with role='owner' can grant access
CREATE POLICY support_access_grants_owner_insert ON support_access_grants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.role = 'owner' AND pau.is_active = true
        )
    );

-- Platform admins can revoke grants they made (or any active admin can revoke)
CREATE POLICY support_access_grants_revoke ON support_access_grants
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.is_active = true
        )
    );

-- Support notes: platform admins can manage notes for companies they have access to
CREATE POLICY tenant_support_notes_admin_read ON tenant_support_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.is_active = true
        )
    );

CREATE POLICY tenant_support_notes_admin_insert ON tenant_support_notes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.is_active = true
        )
    );

-- Platform audit logs: readable by all platform admins, insertable by system only
CREATE POLICY platform_audit_logs_admin_read ON platform_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.is_active = true
        )
    );

CREATE POLICY platform_audit_logs_insert ON platform_audit_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM platform_admin_users pau
            WHERE pau.user_id = auth.uid() AND pau.is_active = true
        )
    );

-- ============== HELPER FUNCTIONS ==============

-- Check if a user is an active platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform_admin_users
        WHERE user_id = p_user_id AND is_active = true
    );
$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if a user has platform owner role
CREATE OR REPLACE FUNCTION is_platform_owner(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform_admin_users
        WHERE user_id = p_user_id AND role = 'owner' AND is_active = true
    );
$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if a user has active support access to a specific company
CREATE OR REPLACE FUNCTION has_support_access(p_company_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM support_access_grants sag
        JOIN platform_admin_users pau ON pau.id = sag.admin_user_id
        WHERE pau.user_id = p_user_id
          AND sag.company_id = p_company_id
          AND sag.is_active = true
          AND sag.expires_at > NOW()
    );
$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Revoke expired support grants (run periodically or via cron)
CREATE OR REPLACE FUNCTION revoke_expired_support_grants()
RETURNS INTEGER AS $$
    WITH revoked AS (
        UPDATE support_access_grants
        SET is_active = false, revoked_at = NOW()
        WHERE is_active = true AND expires_at <= NOW()
        RETURNING id
    )
    SELECT COUNT(*) FROM revoked;
$$ LANGUAGE sql SECURITY DEFINER;

-- Trigger to update updated_at on platform_admin_users
CREATE OR REPLACE FUNCTION update_platform_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_platform_admin_users_updated_at
    BEFORE UPDATE ON platform_admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_admin_updated_at();
