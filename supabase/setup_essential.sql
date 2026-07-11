-- =====================================================
-- ADMINMATE AI — ESSENTIAL SCHEMA FOR NEW SUPABASE PROJECT
-- Run this in: https://supabase.com/dashboard/project/ajqpxgnlrpjhqsnoutpv/sql/new
-- =====================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Companies
CREATE TABLE IF NOT EXISTS companies (
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

-- 3. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
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

-- 4. Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    location VARCHAR(255),
    employment_type VARCHAR(50) DEFAULT 'full-time',
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'THB',
    status VARCHAR(20) DEFAULT 'open',
    posted_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Candidates
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    source VARCHAR(100),
    tags TEXT[],
    notes TEXT,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CV Documents
CREATE TABLE IF NOT EXISTS cv_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    file_url TEXT,
    file_name VARCHAR(255),
    parsed_text TEXT,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'applied',
    cover_letter TEXT,
    ai_screening_score DECIMAL(5,2),
    ai_screening_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Interviews
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    interviewer_name VARCHAR(255),
    scheduled_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    location VARCHAR(255),
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Offers
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    salary DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'THB',
    start_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    content TEXT,
    file_url TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Onboarding Checklists
CREATE TABLE IF NOT EXISTS onboarding_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Onboarding Tasks
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES onboarding_checklists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    due_date DATE,
    assigned_to VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    session_id UUID,
    sender VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Chat Platform Connections
CREATE TABLE IF NOT EXISTS chat_platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. AI Usage Log
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID,
    feature VARCHAR(100),
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Rate Limits
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    count INTEGER DEFAULT 1,
    UNIQUE(identifier, action, window_start)
);

-- 19. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    tier VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. PDPA Compliance
CREATE TABLE IF NOT EXISTS pdpa_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT false,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS FUNCTIONS
-- =====================================================
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

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (hardened — company-scoped)
-- =====================================================

-- user_profiles: users can read their own + admins can read company users
DROP POLICY IF EXISTS "profiles_read" ON user_profiles;
DROP POLICY IF EXISTS "profiles_write" ON user_profiles;
CREATE POLICY "profiles_read" ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "profiles_write" ON user_profiles FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- companies: members can read their company
DROP POLICY IF EXISTS "companies_read" ON companies;
DROP POLICY IF EXISTS "companies_write" ON companies;
CREATE POLICY "companies_read" ON companies FOR SELECT TO authenticated
  USING (id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "companies_write" ON companies FOR ALL TO authenticated
  USING (id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- jobs
DROP POLICY IF EXISTS "jobs_read" ON jobs;
DROP POLICY IF EXISTS "jobs_write" ON jobs;
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "jobs_write" ON jobs FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- candidates
DROP POLICY IF EXISTS "candidates_read" ON candidates;
DROP POLICY IF EXISTS "candidates_write" ON candidates;
CREATE POLICY "candidates_read" ON candidates FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "candidates_write" ON candidates FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'));

-- applications
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

-- documents
DROP POLICY IF EXISTS "documents_read" ON documents;
DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_read" ON documents FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "documents_write" ON documents FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- interviews
DROP POLICY IF EXISTS "interviews_read" ON interviews;
DROP POLICY IF EXISTS "interviews_write" ON interviews;
CREATE POLICY "interviews_read" ON interviews FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "interviews_write" ON interviews FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'));

-- offers
DROP POLICY IF EXISTS "offers_read" ON offers;
DROP POLICY IF EXISTS "offers_write" ON offers;
CREATE POLICY "offers_read" ON offers FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "offers_write" ON offers FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- onboarding_checklists
DROP POLICY IF EXISTS "onboarding_read" ON onboarding_checklists;
DROP POLICY IF EXISTS "onboarding_write" ON onboarding_checklists;
CREATE POLICY "onboarding_read" ON onboarding_checklists FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "onboarding_write" ON onboarding_checklists FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- onboarding_tasks
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

-- cv_documents
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

-- chat_messages
DROP POLICY IF EXISTS "chat_read" ON chat_messages;
DROP POLICY IF EXISTS "chat_write" ON chat_messages;
CREATE POLICY "chat_read" ON chat_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR safe_user_role() IN ('admin','hr'));
CREATE POLICY "chat_write" ON chat_messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- notifications
DROP POLICY IF EXISTS "notif_read" ON notifications;
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_read" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR safe_user_role() = 'admin');
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id());

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================
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

-- Done! 
