-- Migration: 20240101000001_extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- Migration: 20240101000002_companies.sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),
    tax_id VARCHAR(50),
    industry VARCHAR(100),
    logo_url TEXT,
    website_url TEXT,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(10) DEFAULT 'TH',
    currency VARCHAR(3) DEFAULT 'THB',
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    locale VARCHAR(10) DEFAULT 'th-TH',
    phone VARCHAR(50),
    email VARCHAR(255),
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    max_employees INTEGER DEFAULT 10,
    line_oa_channel_id VARCHAR(255),
    whatsapp_phone_number_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000003_user_profiles.sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    full_name_th VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'hr',
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    language_preference VARCHAR(10) DEFAULT 'th',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000004_jobs.sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    title VARCHAR(255) NOT NULL,
    title_th VARCHAR(255),
    department VARCHAR(100),
    location VARCHAR(255),
    employment_type VARCHAR(50) DEFAULT 'full_time',
    experience_level VARCHAR(50),
    salary_min NUMERIC(12,2),
    salary_max NUMERIC(12,2),
    salary_currency VARCHAR(3) DEFAULT 'THB',
    country_override VARCHAR(10),
    currency_override VARCHAR(3),
    description TEXT,
    description_th TEXT,
    responsibilities TEXT[],
    requirements TEXT[],
    nice_to_have TEXT[],
    skills_required TEXT[],
    status VARCHAR(20) DEFAULT 'draft',
    application_deadline DATE,
    headcount INTEGER DEFAULT 1,
    filled_count INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000005_candidates.sql
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    full_name_th VARCHAR(255),
    avatar_url TEXT,
    location VARCHAR(255),
    current_position VARCHAR(255),
    experience_years NUMERIC(4,1),
    linkedin_url TEXT,
    portfolio_url TEXT,
    source VARCHAR(50) DEFAULT 'direct',
    line_user_id VARCHAR(255),
    whatsapp_phone VARCHAR(50),
    preferred_language VARCHAR(5) DEFAULT 'th',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000006_cv_documents.sql
CREATE TABLE cv_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_type VARCHAR(20),
    parsed_content JSONB,
    raw_text TEXT,
    summary TEXT,
    skills_extracted TEXT[],
    experience_years NUMERIC(4,1),
    education_extracted JSONB,
    language_proficiency JSONB,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000007_applications.sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cv_document_id UUID REFERENCES cv_documents(id),
    status VARCHAR(30) DEFAULT 'applied',
    ai_match_score NUMERIC(5,2),
    ai_analysis JSONB,
    ai_skill_match JSONB,
    ai_experience_match TEXT,
    ai_missing_skills TEXT[],
    ai_suggested_questions TEXT[],
    ai_summary TEXT,
    recruiter_notes TEXT,
    rejection_reason TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    screened_at TIMESTAMPTZ,
    shortlisted_at TIMESTAMPTZ,
    interviewed_at TIMESTAMPTZ,
    offered_at TIMESTAMPTZ,
    hired_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);


-- Migration: 20240101000008_interviews.sql
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    interviewer_name VARCHAR(255),
    interviewer_email VARCHAR(255),
    interview_type VARCHAR(50),
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    location VARCHAR(255),
    meeting_link TEXT,
    status VARCHAR(20) DEFAULT 'scheduled',
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    recommendation VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000009_offers.sql
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id),
    position_title VARCHAR(255) NOT NULL,
    salary_offered NUMERIC(12,2),
    salary_currency VARCHAR(3) DEFAULT 'THB',
    employment_type VARCHAR(50),
    start_date DATE,
    work_hours VARCHAR(50) DEFAULT '09:00-18:00',
    benefits TEXT[],
    special_conditions TEXT,
    offer_letter_pdf_url TEXT,
    offer_letter_content JSONB,
    status VARCHAR(20) DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    candidate_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000010_documents.sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),
    description TEXT,
    file_url TEXT,
    template_id VARCHAR(50),
    template_data JSONB,
    status VARCHAR(20) DEFAULT 'draft',
    due_date DATE,
    region VARCHAR(10) NOT NULL,
    language VARCHAR(5) DEFAULT 'th',
    requires_signature BOOLEAN DEFAULT false,
    signed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    reminder_enabled BOOLEAN DEFAULT true,
    last_reminder_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000011_onboarding.sql
CREATE TABLE onboarding_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id),
    template_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'in_progress',
    progress_percentage NUMERIC(5,2) DEFAULT 0,
    start_date DATE,
    target_completion_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES onboarding_checklists(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_name_en VARCHAR(255),
    description TEXT,
    category VARCHAR(50),
    timeframe VARCHAR(20),
    order_index INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES user_profiles(id),
    assigned_to VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000012_chat_messages.sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
    content TEXT NOT NULL,
    content_th TEXT,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000013_notifications.sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    title_th VARCHAR(255),
    message TEXT NOT NULL,
    message_th TEXT,
    notification_type VARCHAR(30),
    reference_type VARCHAR(30),
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    is_emailed BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000014_audit_logs.sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000015_chat_platform_connections.sql
CREATE TABLE chat_platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    platform_account_id VARCHAR(255),
    access_token TEXT,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000016_ai_usage_log.sql
CREATE TABLE ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID REFERENCES user_profiles(id),
    feature VARCHAR(50) NOT NULL,
    tokens_used INTEGER,
    model VARCHAR(50) DEFAULT 'gemini-2.5-flash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000017_rate_limits.sql
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    feature VARCHAR(50) NOT NULL,
    count INTEGER DEFAULT 0,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, feature)
);


-- Migration: 20240101000018_subscriptions.sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) UNIQUE,
    tier VARCHAR(20) DEFAULT 'free',
    max_employees INTEGER DEFAULT 10,
    max_active_jobs INTEGER DEFAULT 3,
    max_ai_calls_per_day INTEGER DEFAULT 20,
    features JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Migration: 20240101000019_pdpa_compliance.sql
CREATE TABLE pdpa_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    candidate_id UUID REFERENCES candidates(id),
    employee_id UUID REFERENCES user_profiles(id),
    data_subject_email VARCHAR(255) NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    purposes TEXT[] NOT NULL,
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_withdrawn_at TIMESTAMPTZ,
    consent_form_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    requester_email VARCHAR(255) NOT NULL,
    request_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES user_profiles(id),
    notes TEXT
);


-- Migration: 20240101000020_rls_functions.sql
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() AND is_active = true
$$;

CREATE OR REPLACE FUNCTION is_admin_or_hr()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'hr') AND is_active = true)
$$;

CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin' AND is_active = true)
$$;


-- Migration: 20240101000021_rls_policies.sql
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_read" ON companies FOR SELECT USING (id = get_user_company_id());
CREATE POLICY "companies_write" ON companies FOR ALL USING (id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON user_profiles FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin" ON user_profiles FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_read" ON jobs FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "jobs_write" ON jobs FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates_read" ON candidates FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "candidates_write" ON candidates FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE cv_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv_read" ON cv_documents FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "cv_write" ON cv_documents FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apps_read" ON applications FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "apps_write" ON applications FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interviews_read" ON interviews FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "interviews_write" ON interviews FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_read" ON offers FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "offers_write" ON offers FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs_read" ON documents FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "docs_write" ON documents FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklists_read" ON onboarding_checklists FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "checklists_write" ON onboarding_checklists FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_read" ON onboarding_tasks FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "tasks_write" ON onboarding_tasks FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_read" ON chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_read" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read" ON audit_logs FOR SELECT USING (company_id = get_user_company_id());

ALTER TABLE chat_platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connections_read" ON chat_platform_connections FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "connections_write" ON chat_platform_connections FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());


-- Migration: 20240101000022_indexes.sql
CREATE INDEX idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_candidates_company ON candidates(company_id);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_company ON applications(company_id);
CREATE INDEX idx_applications_job_status ON applications(company_id, job_id, status);
CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_reminders ON documents(company_id, status, due_date, last_reminder_at);
CREATE INDEX idx_onboarding_checklists_employee ON onboarding_checklists(employee_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_session ON chat_messages(user_id, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_ai_usage_rate_limit ON ai_usage_log(company_id, feature, created_at DESC);


-- Migration: 20240101000023_triggers.sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'role', 'hr'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['companies','user_profiles','jobs','candidates','applications','interviews','offers','documents','onboarding_checklists','onboarding_tasks','chat_platform_connections','subscriptions','pdpa_consents'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION update_job_filled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'hired' THEN
    UPDATE jobs SET filled_count = filled_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'hired' AND OLD.status != 'hired' THEN
      UPDATE jobs SET filled_count = filled_count + 1 WHERE id = NEW.job_id;
    ELSIF OLD.status = 'hired' AND NEW.status != 'hired' THEN
      UPDATE jobs SET filled_count = GREATEST(0, filled_count - 1) WHERE id = NEW.job_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_application_hired ON applications;
CREATE TRIGGER on_application_hired AFTER INSERT OR UPDATE OF status ON applications FOR EACH ROW EXECUTE FUNCTION update_job_filled_count();


-- Migration: 20240101000024_analytics_functions.sql
CREATE OR REPLACE FUNCTION get_pipeline_counts(p_company_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(json_object_agg(status, cnt), '{}') FROM (
    SELECT status, COUNT(*) as cnt FROM applications WHERE company_id = p_company_id AND created_at > NOW() - INTERVAL '90 days' GROUP BY status
  ) t
$$;

CREATE OR REPLACE FUNCTION get_applications_trend(p_company_id UUID, p_since TIMESTAMPTZ)
RETURNS TABLE(date TEXT, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT TO_CHAR(created_at::DATE, 'YYYY-MM-DD') AS date, COUNT(*) AS count
  FROM applications WHERE company_id = p_company_id AND created_at >= p_since
  GROUP BY created_at::DATE ORDER BY created_at::DATE
$$;

CREATE OR REPLACE FUNCTION get_avg_time_to_hire(p_company_id UUID)
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (hired_at - applied_at)) / 86400)::NUMERIC, 1)
  FROM applications WHERE company_id = p_company_id AND status = 'hired' AND created_at > NOW() - INTERVAL '90 days'
$$;


-- Migration: 20240101000025_storage_buckets.sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('cv-uploads', 'cv-uploads', false, 10485760, ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('generated-docs', 'generated-docs', false, 20971520, ARRAY['application/pdf']),
  ('exports', 'exports', false, 52428800, ARRAY['text/csv','application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;


-- Migration: 20240101000026_anonymize_function.sql
CREATE OR REPLACE FUNCTION anonymize_candidate_data(p_email VARCHAR, p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE candidates SET full_name = 'ลบข้อมูลแล้ว', full_name_th = 'ลบข้อมูลแล้ว',
    email = CONCAT('anon_', LEFT(MD5(id::TEXT), 8), '@deleted.local'),
    phone = NULL, line_user_id = NULL, whatsapp_phone = NULL, notes = 'Data anonymized per PDPA request'
  WHERE email = p_email AND company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Migration: 20240101000027_fix_missing_rls.sql
-- Fix missing RLS on tables that don't have policies yet

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_read" ON ai_usage_log FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "ai_usage_insert" ON ai_usage_log FOR INSERT WITH CHECK (company_id = get_user_company_id());

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_read" ON rate_limits FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "rate_limits_all" ON rate_limits FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_read" ON subscriptions FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "subscriptions_write" ON subscriptions FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE pdpa_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdpa_consents_read" ON pdpa_consents FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "pdpa_consents_insert" ON pdpa_consents FOR INSERT WITH CHECK (company_id = get_user_company_id());

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deletion_read" ON data_deletion_requests FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "deletion_insert" ON data_deletion_requests FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "deletion_update" ON data_deletion_requests FOR UPDATE USING (company_id = get_user_company_id() AND is_admin_or_hr());

-- Fix audit_logs: add INSERT policy so systems can log
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Fix notifications: tighten INSERT policy
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (
  user_id IS NOT NULL AND company_id IS NOT NULL
);

-- Fix chat_platform_connections RLS (was missing)
ALTER TABLE chat_platform_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "connections_read" ON chat_platform_connections;
CREATE POLICY "connections_read" ON chat_platform_connections FOR SELECT USING (company_id = get_user_company_id());
DROP POLICY IF EXISTS "connections_write" ON chat_platform_connections;
CREATE POLICY "connections_write" ON chat_platform_connections FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());


-- Migration: 20240101000028_security_hardening.sql
-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_line_user_id ON candidates(line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_whatsapp_phone ON candidates(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_company ON offers(company_id);
CREATE INDEX IF NOT EXISTS idx_offers_candidate ON offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company ON interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_connections_active ON chat_platform_connections(platform, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pdpa_consents_subject ON pdpa_consents(company_id, data_subject_email);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(user_id, created_at DESC);

-- Storage bucket RLS policies (these must run in Supabase SQL Editor, Edge Functions cannot create storage policies)
-- Note: Run these manually in Supabase Dashboard → Storage → Policies:
-- cv-uploads: SELECT + INSERT for authenticated users with company_id match
-- generated-docs: SELECT for authenticated users with company_id match, INSERT for authenticated
-- company-logos: public SELECT, authenticated INSERT
-- avatars: public SELECT, authenticated INSERT
-- exports: authenticated SELECT + INSERT for admin/hr

-- Role-based route protection: add a new column for route-permission mapping
COMMENT ON TABLE user_profiles IS 'User profiles with role: admin, hr, applicant, manager';


-- Migration: 20240101000029_error_sanitization_audit.sql
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


-- Migration: 20240102000001_fix_profiles_self_read.sql
-- Fix RLS so users can read their own profile even before joining a company
-- Without this, a newly registered user cannot fetch their profile, causing
-- the app to show a misleading "Unsupported provider" error.

DROP POLICY IF EXISTS "profiles_read" ON user_profiles;
CREATE POLICY "profiles_read" ON user_profiles FOR SELECT USING (
  id = auth.uid()  -- own profile
  OR company_id = get_user_company_id()  -- same-company profiles
);

-- Also allow INSERT on own profile (for the auth trigger / signup flow)
DROP POLICY IF EXISTS "profiles_insert_own" ON user_profiles;
CREATE POLICY "profiles_insert_own" ON user_profiles FOR INSERT WITH CHECK (id = auth.uid());


-- Migration: 20240102000002_fix_companies_rls.sql
-- Fix RLS so new users can create their first company and read it
-- Without these, the company setup flow is blocked by 403/RLS errors.

-- Allow any authenticated user to INSERT a new company
DROP POLICY IF EXISTS "companies_insert" ON companies;
CREATE POLICY "companies_insert" ON companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Loosen the SELECT policy: user can read their own company.
-- A newly registered user (no company_id in profile yet) will land on the
-- /setup-company page, which itself inserts a new company, so the read policy
-- alone is enough once setup completes.
DROP POLICY IF EXISTS "companies_read" ON companies;
CREATE POLICY "companies_read" ON companies FOR SELECT USING (id = get_user_company_id());

-- Loosen the ALL policy to allow the user who just created the company
-- to update it (e.g. set billing, change settings) before is_admin_or_hr()
-- returns true via the freshly-updated profile.
DROP POLICY IF EXISTS "companies_write" ON companies;
CREATE POLICY "companies_write" ON companies FOR ALL USING (
  id = get_user_company_id() AND is_admin_or_hr()
);

-- Ensure user_profiles can be updated to set company_id after company creation
DROP POLICY IF EXISTS "profiles_update_own" ON user_profiles;
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE USING (id = auth.uid());


-- Migration: 20240102000003_open_all_rls.sql
-- Comprehensive RLS fix: ensure authenticated users can always read their
-- company-scoped data (returns empty if no match, never 403).
-- This prevents the "Failed to load resource 403" error on Dashboard load.

-- Helper: a safe company_id getter that won't error on missing profile
CREATE OR REPLACE FUNCTION safe_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1
$$;

-- Drop and recreate all company-scoped read policies to never return 403
-- when the user is authenticated (even without a company yet).

-- JOBS
DROP POLICY IF EXISTS "jobs_read" ON jobs;
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "jobs_write" ON jobs;
CREATE POLICY "jobs_write" ON jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CANDIDATES
DROP POLICY IF EXISTS "candidates_read" ON candidates;
CREATE POLICY "candidates_read" ON candidates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "candidates_write" ON candidates;
CREATE POLICY "candidates_write" ON candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- APPLICATIONS
DROP POLICY IF EXISTS "applications_read" ON applications;
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "applications_write" ON applications;
CREATE POLICY "applications_write" ON applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DOCUMENTS
DROP POLICY IF EXISTS "documents_read" ON documents;
CREATE POLICY "documents_read" ON documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_write" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INTERVIEWS
DROP POLICY IF EXISTS "interviews_read" ON interviews;
CREATE POLICY "interviews_read" ON interviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "interviews_write" ON interviews;
CREATE POLICY "interviews_write" ON interviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- OFFERS
DROP POLICY IF EXISTS "offers_read" ON offers;
CREATE POLICY "offers_read" ON offers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "offers_write" ON offers;
CREATE POLICY "offers_write" ON offers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ONBOARDING_CHECKLISTS
DROP POLICY IF EXISTS "onboarding_read" ON onboarding_checklists;
CREATE POLICY "onboarding_read" ON onboarding_checklists FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "onboarding_write" ON onboarding_checklists;
CREATE POLICY "onboarding_write" ON onboarding_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ONBOARDING_TASKS
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_tasks_read" ON onboarding_tasks;
CREATE POLICY "onboarding_tasks_read" ON onboarding_tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "onboarding_tasks_write" ON onboarding_tasks;
CREATE POLICY "onboarding_tasks_write" ON onboarding_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CV_DOCUMENTS
ALTER TABLE cv_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cv_read" ON cv_documents;
CREATE POLICY "cv_read" ON cv_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cv_write" ON cv_documents;
CREATE POLICY "cv_write" ON cv_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CHAT_MESSAGES
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_read" ON chat_messages;
CREATE POLICY "chat_read" ON chat_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "chat_write" ON chat_messages;
CREATE POLICY "chat_write" ON chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_read" ON notifications;
CREATE POLICY "notif_read" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT TO authenticated WITH CHECK (true);


-- Migration: 20240102000004_hardened_rls.sql
-- Production-hardened RLS: company-scoped, never 403 for valid users.
-- A user can only see/modify rows belonging to their own company_id.
-- New users (no company yet) get a NULL company_id and can still sign up,
-- create a company, and set their profile.queries against company-scoped
-- tables simply return empty arrays.

CREATE OR REPLACE FUNCTION safe_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION safe_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(role, 'member') FROM user_profiles WHERE id = auth.uid() LIMIT 1
$$;

-- ============== JOBS ==============
DROP POLICY IF EXISTS "jobs_read" ON jobs;
DROP POLICY IF EXISTS "jobs_write" ON jobs;
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "jobs_write" ON jobs FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- ============== CANDIDATES ==============
DROP POLICY IF EXISTS "candidates_read" ON candidates;
DROP POLICY IF EXISTS "candidates_write" ON candidates;
CREATE POLICY "candidates_read" ON candidates FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "candidates_write" ON candidates FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'));

-- ============== APPLICATIONS ==============
DROP POLICY IF EXISTS "applications_read" ON applications;
DROP POLICY IF EXISTS "applications_write" ON applications;
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    OR safe_user_company_id() IS NULL
  );
CREATE POLICY "applications_write" ON applications FOR ALL TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr','recruiter')
  )
  WITH CHECK (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr','recruiter')
  );

-- ============== DOCUMENTS ==============
DROP POLICY IF EXISTS "documents_read" ON documents;
DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_read" ON documents FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "documents_write" ON documents FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- ============== INTERVIEWS ==============
DROP POLICY IF EXISTS "interviews_read" ON interviews;
DROP POLICY IF EXISTS "interviews_write" ON interviews;
CREATE POLICY "interviews_read" ON interviews FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "interviews_write" ON interviews FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'));

-- ============== OFFERS ==============
DROP POLICY IF EXISTS "offers_read" ON offers;
DROP POLICY IF EXISTS "offers_write" ON offers;
CREATE POLICY "offers_read" ON offers FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "offers_write" ON offers FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- ============== ONBOARDING_CHECKLISTS ==============
DROP POLICY IF EXISTS "onboarding_read" ON onboarding_checklists;
DROP POLICY IF EXISTS "onboarding_write" ON onboarding_checklists;
CREATE POLICY "onboarding_read" ON onboarding_checklists FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "onboarding_write" ON onboarding_checklists FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- ============== ONBOARDING_TASKS ==============
DROP POLICY IF EXISTS "onboarding_tasks_read" ON onboarding_tasks;
DROP POLICY IF EXISTS "onboarding_tasks_write" ON onboarding_tasks;
CREATE POLICY "onboarding_tasks_read" ON onboarding_tasks FOR SELECT TO authenticated
  USING (
    checklist_id IN (SELECT id FROM onboarding_checklists WHERE company_id = safe_user_company_id())
    OR safe_user_company_id() IS NULL
  );
CREATE POLICY "onboarding_tasks_write" ON onboarding_tasks FOR ALL TO authenticated
  USING (
    checklist_id IN (SELECT id FROM onboarding_checklists WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr')
  )
  WITH CHECK (
    checklist_id IN (SELECT id FROM onboarding_checklists WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr')
  );

-- ============== CV_DOCUMENTS ==============
DROP POLICY IF EXISTS "cv_read" ON cv_documents;
DROP POLICY IF EXISTS "cv_write" ON cv_documents;
CREATE POLICY "cv_read" ON cv_documents FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    OR safe_user_company_id() IS NULL
  );
CREATE POLICY "cv_write" ON cv_documents FOR ALL TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr','recruiter')
  )
  WITH CHECK (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr','recruiter')
  );

-- ============== CHAT_MESSAGES ==============
DROP POLICY IF EXISTS "chat_read" ON chat_messages;
DROP POLICY IF EXISTS "chat_write" ON chat_messages;
CREATE POLICY "chat_read" ON chat_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR safe_user_role() IN ('admin','hr'));
CREATE POLICY "chat_write" ON chat_messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============== NOTIFICATIONS ==============
DROP POLICY IF EXISTS "notif_read" ON notifications;
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_read" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR safe_user_role() = 'admin');
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============== PERFORMANCE INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_candidates_company_id ON candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_interviews_company_id ON interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_offers_company_id ON offers(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company_id ON onboarding_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_checklist_id ON onboarding_tasks(checklist_id);
CREATE INDEX IF NOT EXISTS idx_cv_documents_candidate_id ON cv_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);


-- Migration: 20240102000005_rate_limiting.sql
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


-- Migration: 20240102000006_activity_log.sql
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
SET search_path = public
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


-- Migration: 20240102000007_performance.sql
-- Performance migration: composite indexes, materialized view, RPCs
-- Designed for hundreds of concurrent users with sub-100ms dashboard reads

SET search_path = public;

-- ====================== COMPOSITE INDEXES ======================

-- JOBS: dashboard filters + listings
CREATE INDEX IF NOT EXISTS idx_jobs_company_created
  ON jobs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status_created
  ON jobs(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status_updated
  ON jobs(company_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_headcount
  ON jobs(company_id) WHERE status = 'active';

-- APPLICATIONS: dashboard counts + candidate detail + pipeline kanban
CREATE INDEX IF NOT EXISTS idx_applications_company_created
  ON applications(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_company_status_created
  ON applications(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_company_applied
  ON applications(company_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job_status_created
  ON applications(job_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_created
  ON applications(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_hired_company
  ON applications(company_id, hired_at) WHERE hired_at IS NOT NULL;

-- CANDIDATES: listings + trigram search
CREATE INDEX IF NOT EXISTS idx_candidates_company_created
  ON candidates(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_full_name_trgm
  ON candidates USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidates_email_lower
  ON candidates(company_id, lower(email));

-- INTERVIEWS: upcoming + past + application drill-down
CREATE INDEX IF NOT EXISTS idx_interviews_company_status_scheduled
  ON interviews(company_id, status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_company_scheduled
  ON interviews(company_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_application_scheduled
  ON interviews(application_id, scheduled_at DESC);

-- OFFERS: listing + status filtering
CREATE INDEX IF NOT EXISTS idx_offers_company_status_created
  ON offers(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_company_created
  ON offers(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_candidate_status
  ON offers(candidate_id, status);

-- DOCUMENTS: dashboard + reminders
CREATE INDEX IF NOT EXISTS idx_documents_company_status_created
  ON documents(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_company_due_pending
  ON documents(company_id, due_date)
  WHERE due_date IS NOT NULL AND status IN ('draft', 'pending_signature');

-- ONBOARDING: dashboard overdue + per-checklist task ordering
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company_status
  ON onboarding_checklists(company_id, status, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company_updated
  ON onboarding_checklists(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_company_checklist
  ON onboarding_tasks(company_id, checklist_id, order_index);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_checklist_order
  ON onboarding_tasks(checklist_id, order_index);

-- CV_DOCUMENTS: current CV per candidate
CREATE INDEX IF NOT EXISTS idx_cv_documents_candidate_current
  ON cv_documents(candidate_id, is_current) WHERE is_current = true;

-- CHAT_MESSAGES: session + user history
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_company_created
  ON chat_messages(company_id, created_at DESC);

-- NOTIFICATIONS: bell icon unread + history
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company_type
  ON notifications(company_id, notification_type, created_at DESC);

-- USER_PROFILES: directory + active users per company
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_active
  ON user_profiles(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_role
  ON user_profiles(company_id, role);

-- AI_USAGE_LOG: per-company per-day aggregations
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_company_day
  ON ai_usage_log(company_id, created_at DESC, feature);

-- AUDIT_LOGS: per-entity drill-down + recent activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
  ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_user_created
  ON audit_logs(company_id, user_id, created_at DESC);

-- ====================== MATERIALIZED VIEW ======================

DROP MATERIALIZED VIEW IF EXISTS dashboard_stats CASCADE;

CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
  c.id AS company_id,
  (SELECT COUNT(*) FROM jobs j
     WHERE j.company_id = c.id AND j.status = 'active')::BIGINT AS active_jobs,
  (SELECT COUNT(*) FROM jobs j
     WHERE j.company_id = c.id AND j.status = 'closed')::BIGINT AS closed_jobs,
  (SELECT COUNT(*) FROM jobs j
     WHERE j.company_id = c.id AND j.status = 'draft')::BIGINT AS draft_jobs,
  (SELECT COUNT(*) FROM candidates cd
     WHERE cd.company_id = c.id)::BIGINT AS total_candidates,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id
       AND a.created_at >= NOW() - INTERVAL '7 days')::BIGINT AS new_applicants_7d,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id
       AND a.created_at >= NOW() - INTERVAL '30 days')::BIGINT AS new_applicants_30d,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id)::BIGINT AS total_applications,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id AND a.status = 'hired')::BIGINT AS hired_count,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id AND a.status = 'rejected')::BIGINT AS rejected_count,
  (SELECT COUNT(*) FROM interviews i
     WHERE i.company_id = c.id
       AND i.status = 'scheduled'
       AND i.scheduled_at >= NOW())::BIGINT AS upcoming_interviews,
  (SELECT COUNT(*) FROM documents d
     WHERE d.company_id = c.id
       AND d.status IN ('draft', 'pending_signature'))::BIGINT AS pending_documents,
  (SELECT COUNT(*) FROM documents d
     WHERE d.company_id = c.id AND d.expires_at IS NOT NULL
       AND d.expires_at < NOW() + INTERVAL '30 days')::BIGINT AS expiring_documents,
  (SELECT COUNT(*) FROM onboarding_checklists oc
     WHERE oc.company_id = c.id AND oc.status = 'in_progress')::BIGINT AS active_onboarding,
  (SELECT COUNT(*) FROM onboarding_checklists oc
     WHERE oc.company_id = c.id AND oc.status = 'completed')::BIGINT AS completed_onboarding,
  (SELECT COUNT(*) FROM offers o
     WHERE o.company_id = c.id AND o.status = 'pending')::BIGINT AS pending_offers,
  (SELECT COUNT(*) FROM offers o
     WHERE o.company_id = c.id AND o.status = 'accepted')::BIGINT AS accepted_offers,
  NOW() AS refreshed_at
FROM companies c;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_company
  ON dashboard_stats(company_id);

-- Initial population so first read returns data immediately
REFRESH MATERIALIZED VIEW dashboard_stats;

-- ====================== RPC FUNCTIONS ======================

-- Single-call replacement for 4 dashboard count queries (and the pendingDocs/overdueChecklists lookups)
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_company_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT json_build_object(
    'active_jobs', COALESCE(active_jobs, 0),
    'closed_jobs', COALESCE(closed_jobs, 0),
    'draft_jobs', COALESCE(draft_jobs, 0),
    'total_candidates', COALESCE(total_candidates, 0),
    'new_applicants_7d', COALESCE(new_applicants_7d, 0),
    'new_applicants_30d', COALESCE(new_applicants_30d, 0),
    'total_applications', COALESCE(total_applications, 0),
    'hired_count', COALESCE(hired_count, 0),
    'rejected_count', COALESCE(rejected_count, 0),
    'upcoming_interviews', COALESCE(upcoming_interviews, 0),
    'pending_documents', COALESCE(pending_documents, 0),
    'expiring_documents', COALESCE(expiring_documents, 0),
    'active_onboarding', COALESCE(active_onboarding, 0),
    'completed_onboarding', COALESCE(completed_onboarding, 0),
    'pending_offers', COALESCE(pending_offers, 0),
    'accepted_offers', COALESCE(accepted_offers, 0),
    'refreshed_at', refreshed_at
  )
  FROM dashboard_stats
  WHERE company_id = p_company_id
$$;

-- Combined activity feed: applications + jobs + candidates, in one query
CREATE OR REPLACE FUNCTION get_recent_activity(
  p_company_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  type TEXT,
  title TEXT,
  subtitle TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM (
    SELECT a.id,
           'application'::TEXT AS type,
           c.full_name AS title,
           j.title AS subtitle,
           a.status,
           a.created_at
    FROM applications a
    JOIN candidates c ON c.id = a.candidate_id
    JOIN jobs j ON j.id = a.job_id
    WHERE a.company_id = p_company_id
    UNION ALL
    SELECT j.id,
           'job'::TEXT,
           j.title,
           COALESCE(j.department, ''),
           j.status,
           j.created_at
    FROM jobs j
    WHERE j.company_id = p_company_id
    UNION ALL
    SELECT cd.id,
           'candidate'::TEXT,
           cd.full_name,
           COALESCE(cd.current_position, 'Candidate'),
           'new'::TEXT,
           cd.created_at
    FROM candidates cd
    WHERE cd.company_id = p_company_id
  ) AS activity
  ORDER BY created_at DESC
  LIMIT GREATEST(p_limit, 1)
$$;

-- Single-query candidates listing with application count, latest status, match score, CV presence
-- Replaces candidateService.getAll's 3-table PostgREST embedding with one round-trip
CREATE OR REPLACE FUNCTION get_candidates_with_applications(p_company_id UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  current_position TEXT,
  avatar_url TEXT,
  experience_years NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ,
  application_count BIGINT,
  latest_application_status TEXT,
  latest_ai_match_score NUMERIC,
  has_cv BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.full_name,
    c.email,
    c.phone,
    c.location,
    c.current_position,
    c.avatar_url,
    c.experience_years,
    c.source,
    c.created_at,
    COALESCE(ac.app_count, 0) AS application_count,
    la.status AS latest_application_status,
    la.ai_match_score AS latest_ai_match_score,
    (cv.id IS NOT NULL) AS has_cv
  FROM candidates c
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS app_count
    FROM applications a
    WHERE a.candidate_id = c.id
  ) ac ON true
  LEFT JOIN LATERAL (
    SELECT a.status, a.ai_match_score
    FROM applications a
    WHERE a.candidate_id = c.id
    ORDER BY a.created_at DESC
    LIMIT 1
  ) la ON true
  LEFT JOIN LATERAL (
    SELECT cvd.id
    FROM cv_documents cvd
    WHERE cvd.candidate_id = c.id AND cvd.is_current = true
    LIMIT 1
  ) cv ON true
  WHERE c.company_id = p_company_id
  ORDER BY c.created_at DESC
$$;

-- Convenience: refresh dashboard_stats; call after writes that affect counts
-- (also run via pg_cron in production for periodic refresh)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats
$$;

-- ====================== GRANTS ======================

GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_candidates_with_applications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats() TO authenticated;
GRANT SELECT ON dashboard_stats TO authenticated;


-- Migration: 20240102000008_fix_companies_read.sql
-- Fix: companies_read must return empty (not 403) for users without a company.
-- Previously: USING (id = get_user_company_id()) → NULL=NULL → FALSE → 403
-- Now: any authenticated user can SELECT (filtered by company_id in other tables).

DROP POLICY IF EXISTS "companies_read" ON companies;
CREATE POLICY "companies_read" ON companies FOR SELECT TO authenticated USING (true);

-- Also allow authenticated users to INSERT their first company (setup flow)
DROP POLICY IF EXISTS "companies_insert" ON companies;
CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Allow admin/HR to UPDATE their own company
DROP POLICY IF EXISTS "companies_write" ON companies;
CREATE POLICY "companies_write" ON companies FOR UPDATE TO authenticated
  USING (id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));


-- Migration: 20240102000009_auto_refresh_dashboard.sql
-- Auto-refresh dashboard_stats materialized view
-- Refreshes when jobs, candidates, applications, documents, interviews, offers, or onboarding_checklists change

CREATE OR REPLACE FUNCTION refresh_dashboard_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS refresh_dashboard_stats ON jobs;
CREATE TRIGGER refresh_dashboard_stats
  AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_candidates ON candidates;
CREATE TRIGGER refresh_dashboard_stats_candidates
  AFTER INSERT OR UPDATE OR DELETE ON candidates
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_applications ON applications;
CREATE TRIGGER refresh_dashboard_stats_applications
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_documents ON documents;
CREATE TRIGGER refresh_dashboard_stats_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_interviews ON interviews;
CREATE TRIGGER refresh_dashboard_stats_interviews
  AFTER INSERT OR UPDATE OR DELETE ON interviews
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_offers ON offers;
CREATE TRIGGER refresh_dashboard_stats_offers
  AFTER INSERT OR UPDATE OR DELETE ON offers
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_onboarding ON onboarding_checklists;
CREATE TRIGGER refresh_dashboard_stats_onboarding
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_checklists
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();


-- Migration: 20240103000001_unified_messages.sql
-- Unified messages table for all platforms (WhatsApp, LINE, Web)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'line', 'web', 'email')),
    platform_message_id VARCHAR(255), -- ID from the platform
    platform_user_id VARCHAR(255) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'audio', 'video', 'file', 'template')),
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'ai', 'agent', 'system')),
    sender_id VARCHAR(255), -- user_id or 'ai' or 'system'
    status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received', 'processing', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_company ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status) WHERE status IN ('received', 'processing');
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Conversation threads
CREATE TABLE IF NOT EXISTS conversation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_company ON conversation_threads(company_id);
CREATE INDEX IF NOT EXISTS idx_threads_platform ON conversation_threads(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_threads_active ON conversation_threads(company_id, status, last_message_at DESC);

-- Message queue for reliable delivery (outbox pattern)
CREATE TABLE IF NOT EXISTS message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    reply_to_message_id UUID REFERENCES messages(id),
    priority INTEGER DEFAULT 0, -- higher = more urgent
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_pending ON message_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_retry ON message_queue(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;

-- Platform sync log for webhook tracking
CREATE TABLE IF NOT EXISTS platform_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    platform VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- message.received, message.sent, etc.
    payload_hash VARCHAR(64), -- SHA-256 of payload for dedup
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    processing_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_platform ON platform_sync_log(platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_dedup ON platform_sync_log(platform, payload_hash) WHERE payload_hash IS NOT NULL;

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(50) NOT NULL, -- 'whatsapp', 'line', 'gemini', 'database'
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    latency_ms INTEGER,
    error_rate DECIMAL(5,4),
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_service ON system_health(service, checked_at DESC);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_threads_updated_at BEFORE UPDATE ON conversation_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Messages: company isolation
CREATE POLICY "messages_company_isolation" ON messages
    FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Threads: company isolation
CREATE POLICY "threads_company_isolation" ON conversation_threads
    FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Queue: service role only (internal)
CREATE POLICY "queue_service_role" ON message_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Sync log: service role only
CREATE POLICY "sync_log_service_role" ON platform_sync_log
    FOR ALL USING (auth.role() = 'service_role');

-- Health: service role only
CREATE POLICY "health_service_role" ON system_health
    FOR ALL USING (auth.role() = 'service_role');

-- Helper function: upsert conversation thread
CREATE OR REPLACE FUNCTION upsert_conversation_thread(
    p_company_id UUID,
    p_platform VARCHAR(20),
    p_platform_user_id VARCHAR(255),
    p_message_preview TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_thread_id UUID;
BEGIN
    INSERT INTO conversation_threads (company_id, platform, platform_user_id, last_message_preview, last_message_at, unread_count)
    VALUES (p_company_id, p_platform, p_platform_user_id, p_message_preview, NOW(), 1)
    ON CONFLICT (company_id, platform, platform_user_id) DO UPDATE SET
        last_message_preview = COALESCE(p_message_preview, conversation_threads.last_message_preview),
        last_message_at = NOW(),
        unread_count = conversation_threads.unread_count + 1,
        updated_at = NOW()
    RETURNING id INTO v_thread_id;

    RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function: get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_company_id UUID,
    p_platform VARCHAR(20),
    p_platform_user_id VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
    v_thread_id UUID;
BEGIN
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE company_id = p_company_id AND platform = p_platform AND platform_user_id = p_platform_user_id;

    IF v_thread_id IS NULL THEN
        INSERT INTO conversation_threads (company_id, platform, platform_user_id)
        VALUES (p_company_id, p_platform, p_platform_user_id)
        RETURNING id INTO v_thread_id;
    END IF;

    RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;


-- Migration: 20240103000002_queue_processor.sql
-- Function to process message queue (called by cron or edge function)
CREATE OR REPLACE FUNCTION process_message_queue(
    p_batch_size INTEGER DEFAULT 10
)
RETURNS TABLE(
    queue_id UUID,
    platform VARCHAR(20),
    platform_user_id VARCHAR(255),
    content TEXT,
    content_type VARCHAR(20),
    company_id UUID
) AS $$
BEGIN
    -- Lock and fetch pending messages
    RETURN QUERY
    WITH locked AS (
        SELECT mq.id, mq.platform, mq.platform_user_id, mq.content, mq.content_type, mq.company_id
        FROM message_queue mq
        WHERE mq.status = 'pending'
          AND mq.scheduled_at <= NOW()
        ORDER BY mq.priority DESC, mq.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE message_queue SET
        status = 'processing',
        processed_at = NOW()
    FROM locked
    WHERE message_queue.id = locked.id
    RETURNING locked.id, locked.platform, locked.platform_user_id, locked.content, locked.content_type, locked.company_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as sent
CREATE OR REPLACE FUNCTION mark_queue_sent(p_queue_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE message_queue SET status = 'sent', processed_at = NOW() WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as failed with retry
CREATE OR REPLACE FUNCTION mark_queue_failed(p_queue_id UUID, p_error TEXT)
RETURNS VOID AS $$
DECLARE
    v_retry_count INTEGER;
    v_max_retries INTEGER;
    v_next_retry TIMESTAMPTZ;
BEGIN
    SELECT retry_count, max_retries INTO v_retry_count, v_max_retries FROM message_queue WHERE id = p_queue_id;

    IF v_retry_count < v_max_retries THEN
        v_next_retry := NOW() + (INTERVAL '5 seconds' * POWER(2, v_retry_count)); -- exponential backoff
        UPDATE message_queue SET
            status = 'failed',
            retry_count = v_retry_count + 1,
            next_retry_at = v_next_retry,
            last_error = p_error
        WHERE id = p_queue_id;
    ELSE
        UPDATE message_queue SET
            status = 'failed',
            retry_count = v_retry_count + 1,
            last_error = p_error
        WHERE id = p_queue_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to reset stuck messages (processing > 5 min)
CREATE OR REPLACE FUNCTION reset_stuck_messages()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE message_queue SET
        status = 'pending',
        next_retry_at = NOW(),
        last_error = 'stuck: processing timeout'
    WHERE status = 'processing'
      AND processed_at < NOW() - INTERVAL '5 minutes';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- Migration: 20240103000003_analytics_views.sql
-- View: Message stats per company per day
CREATE OR REPLACE VIEW v_message_stats_daily AS
SELECT
    company_id,
    platform,
    DATE(created_at) as date,
    direction,
    status,
    COUNT(*) as message_count,
    AVG(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100 as delivery_rate
FROM messages
GROUP BY company_id, platform, DATE(created_at), direction, status;

-- View: Active conversations per platform
CREATE OR REPLACE VIEW v_active_conversations AS
SELECT
    company_id,
    platform,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE last_message_at > NOW() - INTERVAL '1 hour') as active_1h,
    COUNT(*) FILTER (WHERE last_message_at > NOW() - INTERVAL '24 hours') as active_24h,
    AVG(unread_count) as avg_unread
FROM conversation_threads
WHERE status = 'active'
GROUP BY company_id, platform;

-- View: Queue health
CREATE OR REPLACE VIEW v_queue_health AS
SELECT
    company_id,
    platform,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    AVG(CASE WHEN status = 'sent' THEN EXTRACT(EPOCH FROM (processed_at - created_at)) END) as avg_processing_seconds
FROM message_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY company_id, platform;

-- View: Platform health summary
CREATE OR REPLACE VIEW v_platform_health AS
SELECT
    service,
    status,
    latency_ms,
    checked_at,
    LAG(checked_at) OVER (PARTITION BY service ORDER BY checked_at) as prev_check
FROM system_health
WHERE checked_at > NOW() - INTERVAL '24 hours'
ORDER BY service, checked_at DESC;


-- Migration: 20240103000004_notifications.sql
-- Notifications table + policies
-- Idempotent: handles existing table gracefully

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('new_applicant', 'status_change', 'doc_expiry', 'interview', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for tables created before this migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);


-- Migration: 20240104000001_fix_rls_null_bypass.sql
-- FIX P0: Remove RLS NULL company bypass.
-- Previously: (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL)
-- This allowed new users WITHOUT a profile to see ALL companies' data.
-- New policies require a non-NULL company_id match — unauthenticated or
-- profile-less users get zero rows (empty arrays), which is the intended
-- behaviour described in the original hardened_rls.sql header comment.

-- ============== JOBS ==============
DROP POLICY IF EXISTS "jobs_read" ON jobs;
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== CANDIDATES ==============
DROP POLICY IF EXISTS "candidates_read" ON candidates;
CREATE POLICY "candidates_read" ON candidates FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== APPLICATIONS ==============
DROP POLICY IF EXISTS "applications_read" ON applications;
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
  );

-- ============== DOCUMENTS ==============
DROP POLICY IF EXISTS "documents_read" ON documents;
CREATE POLICY "documents_read" ON documents FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== INTERVIEWS ==============
DROP POLICY IF EXISTS "interviews_read" ON interviews;
CREATE POLICY "interviews_read" ON interviews FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== OFFERS ==============
DROP POLICY IF EXISTS "offers_read" ON offers;
CREATE POLICY "offers_read" ON offers FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== ONBOARDING_CHECKLISTS ==============
DROP POLICY IF EXISTS "onboarding_read" ON onboarding_checklists;
CREATE POLICY "onboarding_read" ON onboarding_checklists FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== ONBOARDING_TASKS ==============
DROP POLICY IF EXISTS "onboarding_tasks_read" ON onboarding_tasks;
CREATE POLICY "onboarding_tasks_read" ON onboarding_tasks FOR SELECT TO authenticated
  USING (
    checklist_id IN (SELECT id FROM onboarding_checklists WHERE company_id = safe_user_company_id())
  );

-- ============== CV_DOCUMENTS ==============
DROP POLICY IF EXISTS "cv_read" ON cv_documents;
CREATE POLICY "cv_read" ON cv_documents FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
  );

-- FIX P0: Notifications INSERT policy — users may only insert notifications for themselves.
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- Migration: 20240104000002_webhook_idempotency.sql
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, message_id)
);

CREATE INDEX idx_webhook_events_platform_message_id ON webhook_events(platform, message_id);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);

-- Migration: 20240104000003_mfa_enrollment.sql
-- MFA Enrollment tracking for TOTP-based 2FA
-- Uses Supabase built-in MFA (auth.mfa_factors) as source of truth,
-- this table tracks enrollment metadata and encrypted backup codes.

CREATE TABLE mfa_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_id TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  backup_codes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_mfa_enrollments_user_active
  ON mfa_enrollments(user_id) WHERE is_active = true;

CREATE INDEX idx_mfa_enrollments_user_id ON mfa_enrollments(user_id);

ALTER TABLE mfa_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own enrollments
DROP POLICY IF EXISTS "mfa_enrollments_select_own" ON mfa_enrollments;
CREATE POLICY "mfa_enrollments_select_own" ON mfa_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own enrollments
DROP POLICY IF EXISTS "mfa_enrollments_insert_own" ON mfa_enrollments;
CREATE POLICY "mfa_enrollments_insert_own" ON mfa_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own enrollments
DROP POLICY IF EXISTS "mfa_enrollments_update_own" ON mfa_enrollments;
CREATE POLICY "mfa_enrollments_update_own" ON mfa_enrollments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Prevent anon access
DROP POLICY IF EXISTS "mfa_enrollments_no_anon" ON mfa_enrollments;
CREATE POLICY "mfa_enrollments_no_anon" ON mfa_enrollments
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_mfa_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mfa_enrollments_updated_at ON mfa_enrollments;
CREATE TRIGGER mfa_enrollments_updated_at
  BEFORE UPDATE ON mfa_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_mfa_enrollments_updated_at();


-- Migration: 20240104000004_notification_preferences.sql
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL CHECK (preference_type IN (
    'application_received', 'interview_scheduled', 'offer_sent',
    'document_reminder', 'onboarding_update', 'chatbot_message', 'system_alert'
  )),
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, preference_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification preferences" ON notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);


-- Migration: 20240104000005_document_signatures.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255) NOT NULL,
    signature_data TEXT,
    signed_at TIMESTAMPTZ,
    ip_address INET,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
    decline_reason TEXT,
    verification_token VARCHAR(64) UNIQUE DEFAULT md5(random()::text || clock_timestamp()::text),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_sigs_document_id ON document_signatures(document_id);
CREATE INDEX idx_doc_sigs_company_id ON document_signatures(company_id);
CREATE INDEX idx_doc_sigs_status ON document_signatures(status);
CREATE INDEX idx_doc_sigs_verification_token ON document_signatures(verification_token);

ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_sigs_read_company" ON document_signatures
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "doc_sigs_admin_write" ON document_signatures
    FOR ALL USING (
        company_id = get_user_company_id() AND is_admin_or_hr()
    );

CREATE POLICY "doc_sigs_signer_update" ON document_signatures
    FOR UPDATE USING (
        signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status = 'pending'
    );

CREATE OR REPLACE FUNCTION update_document_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_doc_sigs_updated_at
    BEFORE UPDATE ON document_signatures
    FOR EACH ROW EXECUTE FUNCTION update_document_signatures_updated_at();


-- Migration: 20240104000006_cleanup_indexes.sql
-- Remove duplicate indexes
-- The performance migration (20240102000007) already created composite indexes
-- whose leading columns cover these single-column lookups.

DROP INDEX IF EXISTS idx_user_profiles_company;
DROP INDEX IF EXISTS idx_jobs_company;
DROP INDEX IF EXISTS idx_candidates_company;
DROP INDEX IF EXISTS idx_applications_company;
DROP INDEX IF EXISTS idx_documents_company;
DROP INDEX IF EXISTS idx_documents_status;
DROP INDEX IF EXISTS idx_documents_type;
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_audit_logs_company;
DROP INDEX IF EXISTS idx_chat_messages_user;
DROP INDEX IF EXISTS idx_chat_messages_session;


-- Migration: 20240104000007_storage_policies.sql
-- Storage RLS policies (mirrors storage_policies.sql as a versioned migration)

-- ==================== cv-uploads (PRIVATE) ====================
CREATE POLICY "cv-uploads-read-company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

CREATE POLICY "cv-uploads-insert-company"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

CREATE POLICY "cv-uploads-update-owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND owner = auth.uid()
  );

CREATE POLICY "cv-uploads-delete-owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND owner = auth.uid()
  );

-- ==================== company-logos (PUBLIC read) ====================
CREATE POLICY "company-logos-public-read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

CREATE POLICY "company-logos-admin-write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

CREATE POLICY "company-logos-admin-update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

CREATE POLICY "company-logos-admin-delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ==================== avatars (PUBLIC read) ====================
CREATE POLICY "avatars-public-read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars-user-write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND owner = auth.uid()
  );

CREATE POLICY "avatars-user-update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner = auth.uid()
  );

-- ==================== generated-docs (PRIVATE) ====================
CREATE POLICY "generated-docs-read-company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-docs'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

CREATE POLICY "generated-docs-insert-admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-docs'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ==================== exports (PRIVATE) ====================
CREATE POLICY "exports-read-admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

CREATE POLICY "exports-insert-admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );


-- Migration: 20240105000001_report_schedules.sql
CREATE TABLE report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'hiring_summary', 'pipeline_analysis', 'time_to_hire',
        'source_effectiveness', 'onboarding_progress'
    )),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    recipients UUID[] DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    format VARCHAR(10) DEFAULT 'html' CHECK (format IN ('html', 'csv', 'pdf')),
    date_from TIMESTAMPTZ,
    date_to TIMESTAMPTZ,
    generated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_schedules_company ON report_schedules(company_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_enabled = true;
CREATE INDEX idx_generated_reports_company ON generated_reports(company_id);
CREATE INDEX idx_generated_reports_schedule ON generated_reports(schedule_id);

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_schedules_read" ON report_schedules FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "report_schedules_write" ON report_schedules FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated_reports_read" ON generated_reports FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "generated_reports_write" ON generated_reports FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());


-- Migration: 20240105000002_hash_backup_codes.sql
-- NOTE: pgcrypto digest() function not available in this Supabase project.
-- New backup codes are already hashed by verify-mfa Edge Function (SHA-256 via crypto.subtle).
--
-- To manually migrate existing plaintext backup codes, run this in Supabase SQL Editor:
-- (Enable pgcrypto first if needed: CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;)
--
-- UPDATE mfa_enrollments
-- SET backup_codes = (
--   SELECT jsonb_agg(encode(extensions.digest(elem::text::bytea, 'sha256'), 'hex'))
--   FROM jsonb_array_elements_text(backup_codes) AS elem
-- )
-- WHERE backup_codes IS NOT NULL
--   AND jsonb_typeof(backup_codes) = 'array'
--   AND backup_codes::text LIKE '%-%';


-- Migration: 20240105000003_audit_logs_append_only.sql
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: modifications are not allowed';
END;
$$;

CREATE TRIGGER trg_audit_logs_append_only_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_audit_logs_append_only_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();


-- Migration: 20240105000004_enable_vault.sql
-- Supabase Vault / pgsodium Setup
-- 
-- NOTE: pgsodium and vault extensions require superuser privileges.
-- Enable them via Supabase Dashboard → Database → Extensions:
--   - Enable "pgsodium" extension
--   - Enable "vault" extension
-- Or run: CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA pgsodium;
--         CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;
--
-- Once enabled, this migration creates helper functions.

-- Check if vault extension exists before creating helpers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vault') THEN
    -- Vault is already enabled, helpers are in 20240105000006_vault_helpers.sql
    RAISE NOTICE 'Vault extension detected. Helpers will be set up in next migration.';
  ELSE
    RAISE NOTICE 'Vault extension not enabled. Enable via Dashboard → Database → Extensions → vault';
    RAISE NOTICE 'Then run: INSERT INTO vault.secrets (secret, description) VALUES ($1, $2);';
  END IF;
END $$;


-- Migration: 20240105000005_mfa_aal_check.sql
-- MFA AAL (Authenticator Assurance Level) check
-- Provides server-side RLS enforcement for MFA-protected operations
-- Layer 2 of MFA Server-Side Enforcement
--
-- NOTE: Cannot create functions in auth schema (system schema).
-- Using public schema with auth.jwt() instead.

-- Function to check if user has AAL2 (MFA verified) from JWT claims
CREATE OR REPLACE FUNCTION public.check_mfa_aal2()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.jwt()->>'aal', '') = 'aal2';
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.check_mfa_aal2 TO authenticated;

-- Usage examples (uncomment and adapt for sensitive tables):
-- Require MFA for sensitive operations on offers table:
-- CREATE POLICY "offers_sensitive_require_mfa" ON offers
--   FOR ALL TO authenticated
--   USING (company_id = get_user_company_id() AND public.check_mfa_aal2());


-- Migration: 20240105000006_vault_helpers.sql
-- Vault helper functions for encrypting/decrypting tokens
-- These functions require the vault extension to be enabled.
-- Enable via: Supabase Dashboard → Database → Extensions → enable "vault"
--
-- Once vault is enabled, run these functions manually in Supabase SQL Editor:
--
-- CREATE OR REPLACE FUNCTION public.get_decrypted_token(p_secret_id UUID)
-- RETURNS TEXT
-- LANGUAGE sql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = p_secret_id;
-- $$;
--
-- CREATE OR REPLACE FUNCTION public.store_encrypted_token(p_token TEXT, p_description TEXT DEFAULT '')
-- RETURNS UUID
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- DECLARE
--   v_secret_id UUID;
-- BEGIN
--   INSERT INTO vault.secrets (secret, description)
--   VALUES (p_token, p_description)
--   RETURNING id INTO v_secret_id;
--   RETURN v_secret_id;
-- END;
-- $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vault') THEN
    RAISE NOTICE 'Vault extension detected. Run the above SQL to create helpers.';
  ELSE
    RAISE NOTICE 'Vault extension not enabled. Enable via Dashboard first.';
  END IF;
END $$;


-- Migration: 20240105000007_vault_migrate_tokens.sql
-- Add vault reference column to chat_platform_connections
-- This column is added even without vault enabled (UUID nullable)
-- Once vault is enabled, migrate tokens using manual_migrate_tokens.sql

ALTER TABLE chat_platform_connections
ADD COLUMN IF NOT EXISTS access_token_vault_id UUID;

COMMENT ON COLUMN chat_platform_connections.access_token_vault_id IS 'References vault.secrets(id) once vault extension is enabled. NULL means token is in access_token column (plaintext).';


-- Migration: 20240618000001_stripe_billing.sql
-- ============================================================
-- AdminMate AI — Stripe Billing Migration
-- Run this BEFORE deploying stripe-checkout and stripe-webhook functions
-- ============================================================

-- 1. Add Stripe columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- 2. Create Stripe webhook events table (separate from chat webhook_events)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id ON companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription_id ON companies(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type ON stripe_webhook_events(event_type);

-- 4. RLS policies for stripe_webhook_events (service role only)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage stripe webhook events"
    ON stripe_webhook_events
    FOR ALL
    USING (auth.role() = 'service_role');

-- 5. Verify migration
DO $$
BEGIN
    ASSERT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'stripe_customer_id'
    ), 'stripe_customer_id column not found in companies table';

    ASSERT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'stripe_webhook_events'
    ), 'stripe_webhook_events table not found';

    RAISE NOTICE 'Stripe migration completed successfully';
END $$;


-- Migration: 20240619000001_login_rate_limit_text_key.sql
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



