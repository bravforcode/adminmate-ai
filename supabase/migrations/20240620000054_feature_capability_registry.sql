-- ============================================================
-- Release 26C.1: Feature Capability Registry
-- Centralized tracking of module implementation status,
-- dependencies, permissions, and plan entitlements.
-- ============================================================

-- ============== feature_capabilities ==============
CREATE TABLE IF NOT EXISTS feature_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key VARCHAR(100) UNIQUE NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    capability_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    owner VARCHAR(100),
    dependencies JSONB DEFAULT '[]'::jsonb,
    permission_set JSONB DEFAULT '[]'::jsonb,
    plan_entitlement VARCHAR(50),
    country_availability VARCHAR(10) DEFAULT 'TH',
    provider_requirement VARCHAR(100),
    support_tier VARCHAR(50),
    known_limitations TEXT,
    evidence_links JSONB DEFAULT '[]'::jsonb,
    last_reviewed_at TIMESTAMPTZ,
    is_user_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_capability_status CHECK (
        capability_status IN (
            'complete', 'partial', 'schema_only', 'adapter_only',
            'functional_local', 'sandbox_verified',
            'disabled_not_configured', 'not_started'
        )
    )
);

-- ============== RLS Policies ==============
ALTER TABLE feature_capabilities ENABLE ROW LEVEL SECURITY;

-- Company-scoped isolation
CREATE POLICY cap_select ON feature_capabilities
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY cap_insert ON feature_capabilities
    FOR INSERT TO authenticated
    WITH CHECK (
        safe_user_company_id() IS NOT NULL
        AND safe_user_role() IN ('admin', 'hr_manager')
    );

CREATE POLICY cap_update ON feature_capabilities
    FOR UPDATE TO authenticated
    USING (
        safe_user_company_id() IS NOT NULL
        AND safe_user_role() IN ('admin', 'hr_manager')
    )
    WITH CHECK (
        safe_user_company_id() IS NOT NULL
        AND safe_user_role() IN ('admin', 'hr_manager')
    );

CREATE POLICY cap_delete ON feature_capabilities
    FOR DELETE TO authenticated
    USING (
        safe_user_company_id() IS NOT NULL
        AND safe_user_role() = 'admin'
    );

-- ============== Indexes ==============
CREATE INDEX IF NOT EXISTS idx_feature_capabilities_module
    ON feature_capabilities (module_name);

CREATE INDEX IF NOT EXISTS idx_feature_capabilities_status
    ON feature_capabilities (capability_status);

CREATE INDEX IF NOT EXISTS idx_feature_capabilities_plan
    ON feature_capabilities (plan_entitlement);

-- ============== Updated_at trigger ==============
CREATE OR REPLACE FUNCTION update_feature_capability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_capabilities_updated_at ON feature_capabilities;
CREATE TRIGGER trg_feature_capabilities_updated_at
    BEFORE UPDATE ON feature_capabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_capability_updated_at();

-- ============== Seed: Core Recruitment Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('jobs', 'Recruitment', 'complete', NULL, '["companies"]'::jsonb, '["recruiter","admin","hr_manager"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('candidates', 'Recruitment', 'complete', NULL, '["companies"]'::jsonb, '["recruiter","admin","hr_manager"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('applications', 'Recruitment', 'complete', NULL, '["jobs","candidates"]'::jsonb, '["recruiter","admin","hr_manager"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('interviews', 'Recruitment', 'complete', NULL, '["applications"]'::jsonb, '["recruiter","admin","hr_manager"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('offers', 'Recruitment', 'complete', NULL, '["applications"]'::jsonb, '["recruiter","admin","hr_manager"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('pipeline', 'Recruitment', 'complete', NULL, '["applications"]'::jsonb, '["recruiter","admin","hr_manager"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('ai_matching', 'AI Recruiting', 'complete', NULL, '["candidates","jobs"]'::jsonb, '["recruiter","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('ai_assistant', 'AI Recruiting', 'partial', NULL, '["companies"]'::jsonb, '["admin","hr_manager"]'::jsonb, 'pro', 'ALL', 'advanced', 'Edge function required; no UI page', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Onboarding Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('onboarding', 'Onboarding', 'complete', NULL, '["candidates"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('onboarding_instances', 'Onboarding', 'complete', NULL, '["onboarding"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('contract_templates', 'Onboarding', 'complete', NULL, '["onboarding"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('generated_contracts', 'Onboarding', 'complete', NULL, '["contract_templates"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('esignature', 'Onboarding', 'complete', NULL, '["generated_contracts"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('document_requests', 'Onboarding', 'complete', NULL, '["onboarding"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Offboarding Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('offboarding_cases', 'Offboarding', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('exit_interviews', 'Offboarding', 'complete', NULL, '["offboarding_cases"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('final_settlement', 'Offboarding', 'complete', NULL, '["offboarding_cases"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('asset_return', 'Offboarding', 'complete', NULL, '["offboarding_cases"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('access_revocation', 'Offboarding', 'complete', NULL, '["offboarding_cases"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: HRIS Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('employee_directory', 'HRIS', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('employee_change_requests', 'HRIS', 'complete', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('org_chart', 'HRIS', 'complete', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('org_hierarchy', 'HRIS', 'complete', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('cost_centers', 'HRIS', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('legal_entities', 'HRIS', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('locations', 'HRIS', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('company_settings', 'HRIS', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Payroll Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('payroll_runs', 'Payroll', 'partial', NULL, '["employee_directory"]'::jsonb, '["payroll_admin","admin"]'::jsonb, 'enterprise', 'TH', 'premium', 'Schema + service only; no dedicated page', false),
    ('payroll_cycles', 'Payroll', 'partial', NULL, '["payroll_runs"]'::jsonb, '["payroll_admin","admin"]'::jsonb, 'enterprise', 'TH', 'premium', NULL, false),
    ('country_packs', 'Payroll', 'partial', NULL, '["payroll_runs"]'::jsonb, '["payroll_admin","admin"]'::jsonb, 'enterprise', 'TH', 'premium', 'Thailand pack only', false),
    ('thailand_payroll', 'Payroll', 'schema_only', NULL, '["payroll_runs"]'::jsonb, '["payroll_admin","admin"]'::jsonb, 'enterprise', 'TH', 'premium', 'Migration only', false),
    ('global_payroll_framework', 'Payroll', 'schema_only', NULL, '["payroll_runs"]'::jsonb, '["payroll_admin","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Attendance & Leave Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('attendance', 'Attendance & Leave', 'partial', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', 'Service only; no page', false),
    ('leave_management', 'Attendance & Leave', 'partial', NULL, '["attendance"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', 'Service only; no page', false),
    ('shift_scheduling', 'Scheduling', 'partial', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', 'Service only; no page', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Performance Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('performance_reviews', 'Performance', 'partial', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Learning Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('learning_courses', 'Learning & Development', 'schema_only', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Compensation & Benefits ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('compensation', 'Compensation', 'partial', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('benefits', 'Benefits', 'partial', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('expenses', 'Expenses', 'partial', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('referrals', 'Employee Referrals', 'complete', NULL, '["candidates"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Documents Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('documents', 'Documents', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('signatures', 'Documents', 'complete', NULL, '["documents"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('cv_parsing', 'Documents', 'complete', NULL, '["candidates"]'::jsonb, '["recruiter","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Messaging Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('messaging', 'Messaging', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('message_drafts', 'Messaging', 'complete', NULL, '["messaging"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('message_approval', 'Messaging', 'complete', NULL, '["message_drafts"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('message_templates', 'Messaging', 'complete', NULL, '["messaging"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('messaging_providers', 'Messaging', 'complete', NULL, '["messaging"]'::jsonb, '["admin"]'::jsonb, 'pro', 'ALL', 'advanced', 'Email, SMS, LINE, WhatsApp, Facebook, InApp', true),
    ('chat', 'Chat', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('notifications', 'Notifications', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('notification_preferences', 'Notifications', 'complete', NULL, '["notifications"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('notification_search', 'Notifications', 'complete', NULL, '["notifications"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('notification_center', 'Notifications', 'complete', NULL, '["notifications"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Analytics & Reporting ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('reports', 'Analytics', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('people_analytics', 'Analytics', 'complete', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('dashboard', 'Analytics', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('report_schedules', 'Analytics', 'complete', NULL, '["reports"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Engagement Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('engagement_surveys', 'Engagement', 'schema_only', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Internal Mobility ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('internal_mobility', 'Internal Mobility', 'partial', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('mobility_cases', 'Internal Mobility', 'partial', NULL, '["internal_mobility"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('global_mobility', 'Global Mobility', 'schema_only', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Vendor & Contractor ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('contractors', 'Vendor & Contractor', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('vendor_contracts', 'Vendor & Contractor', 'schema_only', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Compliance Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('compliance', 'Compliance', 'complete', NULL, '["companies"]'::jsonb, '["compliance","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('statutory_filing', 'Compliance', 'complete', NULL, '["compliance"]'::jsonb, '["compliance","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('compliance_framework', 'Compliance', 'schema_only', NULL, '["compliance"]'::jsonb, '["compliance","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false),
    ('pdpa', 'Compliance', 'complete', NULL, '["companies"]'::jsonb, '["compliance","admin"]'::jsonb, 'free', 'TH', 'basic', NULL, true),
    ('audit_logs', 'Compliance', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Security Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('mfa', 'Security', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('sso', 'Security', 'partial', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('session_management', 'Security', 'partial', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('security_audit', 'Security', 'partial', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('enterprise_security', 'Security', 'schema_only', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false),
    ('rate_limits', 'Security', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Platform Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('platform_admin', 'Platform', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('subscriptions', 'Platform', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('feature_flags', 'Platform', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('billing', 'Platform', 'complete', NULL, '["subscriptions"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('permissions', 'Platform', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('api_keys', 'Platform', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('webhooks', 'Platform', 'complete', NULL, '["api_keys"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Data Management ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('bulk_import', 'Data Management', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'pro', 'ALL', 'advanced', NULL, true),
    ('import_export', 'Data Management', 'schema_only', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false),
    ('data_import_export', 'Data Management', 'schema_only', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Helpdesk Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('helpdesk', 'Helpdesk', 'partial', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Integration Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('integrations', 'Integration', 'partial', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Infrastructure Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('disaster_recovery', 'Infrastructure', 'partial', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false),
    ('multi_region_dr', 'Infrastructure', 'schema_only', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Migration only', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Global Search ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('global_search', 'Search', 'complete', NULL, '["companies"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'free', 'ALL', 'basic', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Portal Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('candidate_portal', 'Portal', 'complete', NULL, '["candidates"]'::jsonb, '["candidate"]'::jsonb, 'free', 'ALL', 'basic', NULL, true),
    ('employee_portal', 'Portal', 'complete', NULL, '["employee_directory"]'::jsonb, '["employee"]'::jsonb, 'free', 'ALL', 'basic', NULL, true)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Assets Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('assets', 'Assets', 'partial', NULL, '["employee_directory"]'::jsonb, '["hr_manager","admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Service only; no page', false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============== Seed: Monitoring Module ==============
INSERT INTO feature_capabilities (feature_key, module_name, capability_status, owner, dependencies, permission_set, plan_entitlement, country_availability, support_tier, known_limitations, is_user_visible) VALUES
    ('health_monitoring', 'Monitoring', 'complete', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', NULL, true),
    ('gemini_monitoring', 'Monitoring', 'disabled_not_configured', NULL, '["companies"]'::jsonb, '["admin"]'::jsonb, 'enterprise', 'ALL', 'premium', 'Disabled until Gemini provider configured', false)
ON CONFLICT (feature_key) DO NOTHING;
