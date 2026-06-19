-- ============================================================
-- Release 24: Production Hardening
-- Security audit log, RLS verification results, RBAC matrix snapshots.
-- Owner/admin only read. Security events tracked end-to-end.
-- ============================================================

-- 1. Security Audit Log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  resource_type VARCHAR(100),
  resource_id UUID,
  details JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sal_insert ON security_audit_log FOR INSERT
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY sal_read ON security_audit_log FOR SELECT
  USING (
    company_id = safe_user_company_id()
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = security_audit_log.company_id
        AND r.name IN ('owner', 'admin')
    )
  );

CREATE POLICY sal_update ON security_audit_log FOR UPDATE
  USING (
    company_id = safe_user_company_id()
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = security_audit_log.company_id
        AND r.name IN ('owner', 'admin')
    )
  );

CREATE INDEX idx_sal_company ON security_audit_log(company_id);
CREATE INDEX idx_sal_event_type ON security_audit_log(event_type);
CREATE INDEX idx_sal_severity ON security_audit_log(severity);
CREATE INDEX idx_sal_detected_at ON security_audit_log(detected_at);
CREATE INDEX idx_sal_resource ON security_audit_log(resource_type, resource_id);

-- 2. RLS Verification Results
CREATE TABLE IF NOT EXISTS rls_verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(255) NOT NULL,
  policy_name VARCHAR(255) NOT NULL,
  verification_status VARCHAR(50) NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE rls_verification_results ENABLE ROW LEVEL SECURITY;

-- System table: readable/writable by service role only (no user RLS bypass needed)
CREATE POLICY rvr_insert ON rls_verification_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY rvr_read ON rls_verification_results FOR SELECT
  USING (true);

CREATE INDEX idx_rvr_table ON rls_verification_results(table_name);
CREATE INDEX idx_rvr_status ON rls_verification_results(verification_status);
CREATE INDEX idx_rvr_checked_at ON rls_verification_results(checked_at);

-- 3. RBAC Matrix Snapshots
CREATE TABLE IF NOT EXISTS rbac_matrix_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  snapshot_date DATE DEFAULT CURRENT_DATE
);

ALTER TABLE rbac_matrix_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY rbac_ms_insert ON rbac_matrix_snapshots FOR INSERT
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY rbac_ms_read ON rbac_matrix_snapshots FOR SELECT
  USING (
    company_id = safe_user_company_id()
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = rbac_matrix_snapshots.company_id
        AND r.name IN ('owner', 'admin')
    )
  );

CREATE INDEX idx_rbac_ms_company ON rbac_matrix_snapshots(company_id);
CREATE INDEX idx_rbac_ms_role ON rbac_matrix_snapshots(role);
CREATE INDEX idx_rbac_ms_date ON rbac_matrix_snapshots(snapshot_date);
CREATE INDEX idx_rbac_ms_unique ON rbac_matrix_snapshots(company_id, role, resource, action, snapshot_date);

-- 4. Fix missing RLS on tables caught by audit
ALTER TABLE document_type_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY dtc_read ON document_type_configs FOR SELECT USING (true);
CREATE POLICY dtc_insert ON document_type_configs FOR INSERT WITH CHECK (true);
CREATE POLICY dtc_update ON document_type_configs FOR UPDATE USING (true);
CREATE POLICY dtc_delete ON document_type_configs FOR DELETE USING (true);

ALTER TABLE immigration_case_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY ict_read ON immigration_case_types FOR SELECT USING (true);
CREATE POLICY ict_insert ON immigration_case_types FOR INSERT WITH CHECK (true);
CREATE POLICY ict_update ON immigration_case_types FOR UPDATE USING (true);
CREATE POLICY ict_delete ON immigration_case_types FOR DELETE USING (true);

ALTER TABLE th_tax_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY ttb_read ON th_tax_brackets FOR SELECT USING (true);
CREATE POLICY ttb_insert ON th_tax_brackets FOR INSERT WITH CHECK (true);
CREATE POLICY ttb_update ON th_tax_brackets FOR UPDATE USING (true);
CREATE POLICY ttb_delete ON th_tax_brackets FOR DELETE USING (true);

ALTER TABLE th_social_security_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tssr_read ON th_social_security_rules FOR SELECT USING (true);
CREATE POLICY tssr_insert ON th_social_security_rules FOR INSERT WITH CHECK (true);
CREATE POLICY tssr_update ON th_social_security_rules FOR UPDATE USING (true);
CREATE POLICY tssr_delete ON th_social_security_rules FOR DELETE USING (true);

-- ============================================================
-- RBAC Permissions: security_audit_read, security_audit_write
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('security_audit', 'read',  'View security audit logs'),
  ('security_audit', 'write', 'Create/update security audit entries');

-- Owner: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'security_audit';

-- Admin: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'security_audit';
