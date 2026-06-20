-- ============================================================
-- Release 4: AI Recruiting Layer — Tables + RLS
-- ============================================================

-- 1. AI Runs Log (audit trail for every AI call)
CREATE TABLE IF NOT EXISTS ai_recruiting_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  run_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  model_name VARCHAR(100) DEFAULT 'gemini-2.5-flash',
  prompt_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  input_hash VARCHAR(64),
  output_summary TEXT,
  error_message TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE ai_recruiting_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_runs_read ON ai_recruiting_runs
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY ai_runs_insert ON ai_recruiting_runs
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY ai_runs_update ON ai_recruiting_runs
  FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ai_runs_company ON ai_recruiting_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_job ON ai_recruiting_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_candidate ON ai_recruiting_runs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_type ON ai_recruiting_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_ai_runs_status ON ai_recruiting_runs(status);

-- 2. Candidate AI Summaries
CREATE TABLE IF NOT EXISTS candidate_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  strengths JSONB DEFAULT '[]'::jsonb,
  gaps JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '[]'::jsonb,
  evidence JSONB DEFAULT '[]'::jsonb,
  sensitive_fields_excluded JSONB DEFAULT '[]'::jsonb,
  confidence VARCHAR(20) DEFAULT 'low',
  prompt_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE candidate_ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_summaries_read ON candidate_ai_summaries
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY ai_summaries_insert ON candidate_ai_summaries
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY ai_summaries_update ON candidate_ai_summaries
  FOR UPDATE USING (company_id = safe_user_company_id());

CREATE POLICY ai_summaries_delete ON candidate_ai_summaries
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE INDEX IF NOT EXISTS idx_ai_summaries_company ON candidate_ai_summaries(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_candidate ON candidate_ai_summaries(candidate_id);

CREATE TRIGGER update_ai_summaries_updated_at
  BEFORE UPDATE ON candidate_ai_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Candidate Match Scores
CREATE TABLE IF NOT EXISTS candidate_match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  overall_score NUMERIC(5,2),
  confidence VARCHAR(20) DEFAULT 'low',
  recommendation VARCHAR(30) NOT NULL DEFAULT 'manual_review',
  breakdown JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '[]'::jsonb,
  gaps JSONB DEFAULT '[]'::jsonb,
  sensitive_fields_excluded JSONB DEFAULT '[]'::jsonb,
  human_override_required BOOLEAN DEFAULT true,
  hr_override_score NUMERIC(5,2),
  hr_override_reason TEXT,
  hr_override_by UUID REFERENCES user_profiles(id),
  hr_override_at TIMESTAMPTZ,
  prompt_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  scoring_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE candidate_match_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_scores_read ON candidate_match_scores
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY ai_scores_insert ON candidate_match_scores
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY ai_scores_update ON candidate_match_scores
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

CREATE POLICY ai_scores_delete ON candidate_match_scores
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE INDEX IF NOT EXISTS idx_ai_scores_company ON candidate_match_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_scores_candidate ON candidate_match_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ai_scores_job ON candidate_match_scores(job_id);
CREATE UNIQUE INDEX idx_ai_scores_unique ON candidate_match_scores(company_id, candidate_id, job_id);

CREATE TRIGGER update_ai_scores_updated_at
  BEFORE UPDATE ON candidate_match_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. AI Prompt Versions
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  feature_key VARCHAR(50) NOT NULL,
  prompt_version VARCHAR(20) NOT NULL,
  prompt_name VARCHAR(100) NOT NULL,
  prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_prompts_read ON ai_prompt_versions
  FOR SELECT USING (company_id = safe_user_company_id() OR company_id IS NULL);

CREATE POLICY ai_prompts_insert ON ai_prompt_versions
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE POLICY ai_prompts_update ON ai_prompt_versions
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin')
  );

CREATE INDEX IF NOT EXISTS idx_ai_prompts_feature ON ai_prompt_versions(feature_key);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_company ON ai_prompt_versions(company_id);
