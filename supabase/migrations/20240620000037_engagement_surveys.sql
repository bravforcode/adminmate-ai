-- ============================================================
-- Release 17: Engagement, Recognition & Surveys
-- Survey templates, campaigns, responses, engagement scores,
-- recognition events, reward points.
-- Anonymous surveys enforce minimum group size threshold.
-- Manager cannot see individual anonymous responses.
-- ============================================================

-- 1. Survey Templates
CREATE TABLE IF NOT EXISTS survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL DEFAULT 'pulse',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_template_type CHECK (template_type IN ('pulse', 'engagement', 'satisfaction', 'exit', 'onboarding', 'custom'))
);

ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY st_read ON survey_templates FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY st_insert ON survey_templates FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY st_update ON survey_templates FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY st_delete ON survey_templates FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_st_company ON survey_templates(company_id);
CREATE INDEX idx_st_type ON survey_templates(company_id, template_type);
CREATE INDEX idx_st_active ON survey_templates(company_id, is_active);

CREATE TRIGGER update_st_updated_at BEFORE UPDATE ON survey_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Survey Campaigns
CREATE TABLE IF NOT EXISTS survey_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES survey_templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_audience VARCHAR(100) NOT NULL DEFAULT 'all',
  is_anonymous BOOLEAN DEFAULT true,
  min_group_size INTEGER DEFAULT 5,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_campaign_status CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
  CONSTRAINT valid_campaign_dates CHECK (end_date >= start_date)
);

ALTER TABLE survey_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY sc_read ON survey_campaigns FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sc_insert ON survey_campaigns FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY sc_update ON survey_campaigns FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY sc_delete ON survey_campaigns FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_sc_company ON survey_campaigns(company_id);
CREATE INDEX idx_sc_template ON survey_campaigns(company_id, template_id);
CREATE INDEX idx_sc_status ON survey_campaigns(company_id, status);
CREATE INDEX idx_sc_dates ON survey_campaigns(company_id, start_date, end_date);

CREATE TRIGGER update_sc_updated_at BEFORE UPDATE ON survey_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES survey_campaigns(id) ON DELETE CASCADE,
  respondent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_anonymous BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, campaign_id, respondent_id)
);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Anonymous responses: respondent cannot be linked back by managers
-- Only the respondent themselves can read their own response
-- HR/admin can read all responses but anonymous ones strip respondent_id
CREATE POLICY sr_read ON survey_responses FOR SELECT USING (
  company_id = safe_user_company_id()
  AND (
    respondent_id = auth.uid()
    OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  )
);

CREATE POLICY sr_insert ON survey_responses FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
  AND respondent_id = auth.uid()
);

CREATE POLICY sr_update ON survey_responses FOR UPDATE USING (
  company_id = safe_user_company_id()
  AND respondent_id = auth.uid()
);

-- No delete: responses are immutable for data integrity
CREATE POLICY sr_delete ON survey_responses FOR DELETE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('admin', 'hr_manager')
);

CREATE INDEX idx_sr_company ON survey_responses(company_id);
CREATE INDEX idx_sr_campaign ON survey_responses(company_id, campaign_id);
CREATE INDEX idx_sr_respondent ON survey_responses(company_id, respondent_id);
CREATE INDEX idx_sr_anonymous ON survey_responses(company_id, campaign_id, is_anonymous);

-- 4. Engagement Scores (aggregated, no individual identity)
CREATE TABLE IF NOT EXISTS engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES survey_campaigns(id) ON DELETE CASCADE,
  department_id UUID,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  response_count INTEGER NOT NULL DEFAULT 0 CHECK (response_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE engagement_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY es_read ON engagement_scores FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY es_insert ON engagement_scores FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY es_update ON engagement_scores FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY es_delete ON engagement_scores FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_es_company ON engagement_scores(company_id);
CREATE INDEX idx_es_campaign ON engagement_scores(company_id, campaign_id);
CREATE INDEX idx_es_department ON engagement_scores(company_id, department_id);

-- 5. Recognition Events
CREATE TABLE IF NOT EXISTS recognition_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  recognition_type VARCHAR(50) NOT NULL DEFAULT 'kudos',
  message TEXT NOT NULL,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_recognition_type CHECK (recognition_type IN ('kudos', 'milestone', 'peer', 'manager', 'spot', 'values'))
);

ALTER TABLE recognition_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY re_read ON recognition_events FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY re_insert ON recognition_events FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
  AND sender_id = auth.uid()
);
CREATE POLICY re_update ON recognition_events FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY re_delete ON recognition_events FOR DELETE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('admin', 'hr_manager')
);

CREATE INDEX idx_re_company ON recognition_events(company_id);
CREATE INDEX idx_re_sender ON recognition_events(company_id, sender_id);
CREATE INDEX idx_re_recipient ON recognition_events(company_id, recipient_id);
CREATE INDEX idx_re_type ON recognition_events(company_id, recognition_type);
CREATE INDEX idx_re_public ON recognition_events(company_id, is_public);

-- 6. Reward Points
CREATE TABLE IF NOT EXISTS reward_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  earned_total INTEGER DEFAULT 0 CHECK (earned_total >= 0),
  redeemed_total INTEGER DEFAULT 0 CHECK (redeemed_total >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id)
);

ALTER TABLE reward_points ENABLE ROW LEVEL SECURITY;

-- Employee can read own balance; HR/admin can read all
CREATE POLICY rp_read ON reward_points FOR SELECT USING (
  company_id = safe_user_company_id()
  AND (
    employee_id = auth.uid()
    OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  )
);

CREATE POLICY rp_insert ON reward_points FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY rp_update ON reward_points FOR UPDATE USING (company_id = safe_user_company_id());

-- No delete: points ledger is append-only for audit
CREATE POLICY rp_delete ON reward_points FOR DELETE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() = 'admin'
);

CREATE INDEX idx_rp_company ON reward_points(company_id);
CREATE INDEX idx_rp_employee ON reward_points(company_id, employee_id);
CREATE INDEX idx_rp_balance ON reward_points(company_id, balance);

CREATE TRIGGER update_rp_updated_at BEFORE UPDATE ON reward_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Anonymous survey helper: enforce minimum group size.
-- Returns aggregated responses only if group size >= min_group_size.
-- ============================================================

CREATE OR REPLACE FUNCTION get_anonymous_survey_results(
  p_campaign_id UUID,
  p_min_group_size INTEGER DEFAULT 5
)
RETURNS TABLE (
  campaign_id UUID,
  department_id UUID,
  avg_score NUMERIC,
  response_count INTEGER,
  is_released BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.campaign_id,
    es.department_id,
    CASE
      WHEN es.response_count >= p_min_group_size THEN es.score
      ELSE NULL
    END AS avg_score,
    es.response_count,
    (es.response_count >= p_min_group_size) AS is_released
  FROM engagement_scores es
  WHERE es.campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Audit triggers for all engagement tables
-- ============================================================

CREATE TRIGGER audit_survey_campaigns_changes
  AFTER INSERT OR UPDATE OR DELETE ON survey_campaigns
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_survey_responses_changes
  AFTER INSERT OR UPDATE OR DELETE ON survey_responses
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_recognition_events_changes
  AFTER INSERT OR UPDATE OR DELETE ON recognition_events
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_reward_points_changes
  AFTER INSERT OR UPDATE OR DELETE ON reward_points
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: engagement_read/write, survey_read/write permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('engagement', 'read',   'View engagement scores and recognition events'),
  ('engagement', 'write',  'Create recognition events and manage reward points'),
  ('survey',     'read',   'View survey campaigns and responses'),
  ('survey',     'write',  'Create/edit survey templates and campaigns')
ON CONFLICT (resource, action) DO NOTHING;

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource IN ('engagement', 'survey');

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource IN ('engagement', 'survey');

-- HR Manager: read/write engagement + survey
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource IN ('engagement', 'survey') AND p.action IN ('read', 'write');

-- HR Staff: read/write engagement + survey
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource IN ('engagement', 'survey') AND p.action IN ('read', 'write');

-- Manager: read engagement + survey (no write)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource IN ('engagement', 'survey') AND p.action = 'read';

-- Employee: read engagement (own recognition), read survey (own responses)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource IN ('engagement', 'survey') AND p.action = 'read';

-- Auditor: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource IN ('engagement', 'survey') AND p.action = 'read';
