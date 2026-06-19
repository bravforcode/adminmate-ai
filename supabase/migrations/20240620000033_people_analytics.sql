-- ============================================================
-- Release 13B: People Analytics + Predictive Insights
-- ============================================================

-- 1. People Analytics Models
CREATE TABLE IF NOT EXISTS people_analytics_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  model_key VARCHAR(100) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  model_type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, model_key)
);

-- 2. People Analytics Runs
CREATE TABLE IF NOT EXISTS people_analytics_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES people_analytics_models(id) ON DELETE CASCADE,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  results_summary JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. Risk Indicators
CREATE TABLE IF NOT EXISTS risk_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  indicator_type VARCHAR(100) NOT NULL,
  risk_score NUMERIC(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  confidence VARCHAR(20) NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_run_id UUID NOT NULL REFERENCES people_analytics_runs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Predictive Insights
CREATE TABLE IF NOT EXISTS predictive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  insight_type VARCHAR(100) NOT NULL,
  insight_text TEXT NOT NULL,
  confidence VARCHAR(20) NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_run_id UUID NOT NULL REFERENCES people_analytics_runs(id) ON DELETE CASCADE,
  requires_review BOOLEAN DEFAULT true,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE people_analytics_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_analytics_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_insights ENABLE ROW LEVEL SECURITY;

-- people_analytics_models: read for company members; write for owner/admin/hr_manager
CREATE POLICY people_analytics_models_read ON people_analytics_models
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY people_analytics_models_insert ON people_analytics_models
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

CREATE POLICY people_analytics_models_update ON people_analytics_models
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

CREATE POLICY people_analytics_models_delete ON people_analytics_models
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin')
  );

-- people_analytics_runs: read for company members; create for owner/admin/hr_manager
CREATE POLICY people_analytics_runs_read ON people_analytics_runs
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY people_analytics_runs_insert ON people_analytics_runs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND created_by = auth.uid()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

CREATE POLICY people_analytics_runs_update ON people_analytics_runs
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

-- risk_indicators: read for owner/admin/hr_manager only (sensitive data)
CREATE POLICY risk_indicators_read ON risk_indicators
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

CREATE POLICY risk_indicators_insert ON risk_indicators
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

CREATE POLICY risk_indicators_update ON risk_indicators
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

-- predictive_insights: read for owner/admin/hr_manager; review for same
CREATE POLICY predictive_insights_read ON predictive_insights
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

CREATE POLICY predictive_insights_insert ON predictive_insights
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

CREATE POLICY predictive_insights_update ON predictive_insights
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
  );

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_people_analytics_models_company ON people_analytics_models(company_id);
CREATE INDEX idx_people_analytics_models_key ON people_analytics_models(company_id, model_key);
CREATE INDEX idx_people_analytics_runs_company ON people_analytics_runs(company_id);
CREATE INDEX idx_people_analytics_runs_model ON people_analytics_runs(model_id);
CREATE INDEX idx_people_analytics_runs_status ON people_analytics_runs(status);
CREATE INDEX idx_people_analytics_runs_created_by ON people_analytics_runs(created_by);
CREATE INDEX idx_risk_indicators_company ON risk_indicators(company_id);
CREATE INDEX idx_risk_indicators_employee ON risk_indicators(employee_id);
CREATE INDEX idx_risk_indicators_type ON risk_indicators(indicator_type);
CREATE INDEX idx_risk_indicators_model_run ON risk_indicators(model_run_id);
CREATE INDEX idx_risk_indicators_score ON risk_indicators(risk_score DESC);
CREATE INDEX idx_predictive_insights_company ON predictive_insights(company_id);
CREATE INDEX idx_predictive_insights_employee ON predictive_insights(employee_id);
CREATE INDEX idx_predictive_insights_type ON predictive_insights(insight_type);
CREATE INDEX idx_predictive_insights_model_run ON predictive_insights(model_run_id);
CREATE INDEX idx_predictive_insights_review ON predictive_insights(requires_review) WHERE requires_review = true;

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER update_people_analytics_models_updated_at
  BEFORE UPDATE ON people_analytics_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_indicators_updated_at
  BEFORE UPDATE ON risk_indicators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_people_analytics_model_changes
  AFTER INSERT OR UPDATE OR DELETE ON people_analytics_models
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_people_analytics_run_changes
  AFTER INSERT OR UPDATE OR DELETE ON people_analytics_runs
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_risk_indicator_changes
  AFTER INSERT OR UPDATE OR DELETE ON risk_indicators
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_predictive_insight_changes
  AFTER INSERT OR UPDATE OR DELETE ON predictive_insights
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: people_analytics permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('people_analytics', 'read',  'View people analytics and insights'),
  ('people_analytics', 'run',   'Run people analytics models');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'people_analytics';

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'people_analytics';

-- HR Manager: read + run
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'people_analytics';

-- Manager: no access to people analytics (restricted by design)
-- Employee: no access to people analytics (restricted by design)
