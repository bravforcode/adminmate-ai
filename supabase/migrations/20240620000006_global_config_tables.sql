-- RELEASE 1 — Task 6: Global Config Tables
-- Country, currency, timezone, locale, data residency, and feature flags.

-- ============== COUNTRY_CONFIGS ==============
CREATE TABLE IF NOT EXISTS country_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,           -- ISO 3166-1 alpha-2: TH, SG, VN, etc.
    name VARCHAR(255) NOT NULL,
    name_local VARCHAR(255),                     -- name in local language
    default_currency VARCHAR(3) NOT NULL,        -- ISO 4217: THB, SGD, VND, etc.
    default_timezone VARCHAR(100) NOT NULL,      -- IANA: Asia/Bangkok, Asia/Singapore, etc.
    default_locale VARCHAR(10) NOT NULL,         -- BCP 47: th-TH, en-SG, vi-VN, etc.
    phone_code VARCHAR(10),                      -- +66, +65, +84, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== CURRENCY_CONFIGS ==============
CREATE TABLE IF NOT EXISTS currency_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) NOT NULL UNIQUE,            -- ISO 4217: THB, SGD, VND, USD, etc.
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(10),                          -- ฿, S$, ₫, $, etc.
    decimal_places INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== TIMEZONE_CONFIGS ==============
CREATE TABLE IF NOT EXISTS timezone_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,          -- IANA: Asia/Bangkok
    utc_offset VARCHAR(10) NOT NULL,            -- +07:00
    country_code VARCHAR(10),                    -- ISO 3166-1 alpha-2
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== LOCALE_CONFIGS ==============
CREATE TABLE IF NOT EXISTS locale_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,           -- BCP 47: th-TH, en-US, vi-VN, etc.
    language_code VARCHAR(10) NOT NULL,          -- th, en, vi, etc.
    name VARCHAR(255) NOT NULL,
    name_local VARCHAR(255),                     -- name in its own language
    is_rtl BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== DATA_RESIDENCY_REGIONS ==============
CREATE TABLE IF NOT EXISTS data_residency_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,           -- e.g. 'ap-southeast-1', 'us-east-1'
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,              -- 'supabase', 'aws', 'gcp', etc.
    country_code VARCHAR(10),                    -- primary country
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== FEATURE_FLAGS ==============
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,           -- e.g. 'payroll_enabled', 'ai_matching'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,           -- global default
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== COMPANY_FEATURE_FLAGS ==============
-- Per-company override of feature flags (uses company_id, NOT organization_id)
CREATE TABLE IF NOT EXISTS company_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, feature_flag_id)
);

-- ============== INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_country_configs_code ON country_configs(code);
CREATE INDEX IF NOT EXISTS idx_currency_configs_code ON currency_configs(code);
CREATE INDEX IF NOT EXISTS idx_timezone_configs_name ON timezone_configs(name);
CREATE INDEX IF NOT EXISTS idx_locale_configs_code ON locale_configs(code);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_company_feature_flags_company ON company_feature_flags(company_id);

-- ============== RLS ==============
ALTER TABLE country_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timezone_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE locale_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_residency_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_feature_flags ENABLE ROW LEVEL SECURITY;

-- Config tables: readable by all authenticated users (needed for UI dropdowns)
CREATE POLICY "country_configs_read" ON country_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "currency_configs_read" ON currency_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "timezone_configs_read" ON timezone_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "locale_configs_read" ON locale_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "data_residency_read" ON data_residency_regions FOR SELECT TO authenticated USING (true);

-- Feature flags: readable by all authenticated users
CREATE POLICY "feature_flags_read" ON feature_flags FOR SELECT TO authenticated USING (true);
-- Feature flags: only admins can manage
CREATE POLICY "feature_flags_write" ON feature_flags FOR ALL TO authenticated
  USING (safe_user_role() = 'admin')
  WITH CHECK (safe_user_role() = 'admin');

-- Company feature flags: company-scoped read, admin-scoped write
CREATE POLICY "company_feature_flags_read" ON company_feature_flags FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());
CREATE POLICY "company_feature_flags_write" ON company_feature_flags FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() = 'admin')
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() = 'admin');

-- ============== SEED: Countries ==============
INSERT INTO country_configs (code, name, name_local, default_currency, default_timezone, default_locale, phone_code) VALUES
  ('TH', 'Thailand', 'ประเทศไทย', 'THB', 'Asia/Bangkok', 'th-TH', '+66'),
  ('SG', 'Singapore', 'Singapore', 'SGD', 'Asia/Singapore', 'en-SG', '+65'),
  ('VN', 'Vietnam', 'Việt Nam', 'VND', 'Asia/Ho_Chi_Minh', 'vi-VN', '+84'),
  ('PH', 'Philippines', 'Pilipinas', 'PHP', 'Asia/Manila', 'en-PH', '+63'),
  ('ID', 'Indonesia', 'Indonesia', 'IDR', 'Asia/Jakarta', 'id-ID', '+62'),
  ('MY', 'Malaysia', 'Malaysia', 'MYR', 'Asia/Kuala_Lumpur', 'ms-MY', '+60'),
  ('US', 'United States', 'United States', 'USD', 'America/New_York', 'en-US', '+1'),
  ('GB', 'United Kingdom', 'United Kingdom', 'GBP', 'Europe/London', 'en-GB', '+44'),
  ('JP', 'Japan', '日本', 'JPY', 'Asia/Tokyo', 'ja-JP', '+81');

-- ============== SEED: Currencies ==============
INSERT INTO currency_configs (code, name, symbol, decimal_places) VALUES
  ('THB', 'Thai Baht', '฿', 2),
  ('SGD', 'Singapore Dollar', 'S$', 2),
  ('VND', 'Vietnamese Dong', '₫', 0),
  ('PHP', 'Philippine Peso', '₱', 2),
  ('IDR', 'Indonesian Rupiah', 'Rp', 0),
  ('MYR', 'Malaysian Ringgit', 'RM', 2),
  ('USD', 'US Dollar', '$', 2),
  ('GBP', 'British Pound', '£', 2),
  ('JPY', 'Japanese Yen', '¥', 0);

-- ============== SEED: Timezones ==============
INSERT INTO timezone_configs (name, utc_offset, country_code) VALUES
  ('Asia/Bangkok', '+07:00', 'TH'),
  ('Asia/Singapore', '+08:00', 'SG'),
  ('Asia/Ho_Chi_Minh', '+07:00', 'VN'),
  ('Asia/Manila', '+08:00', 'PH'),
  ('Asia/Jakarta', '+07:00', 'ID'),
  ('Asia/Kuala_Lumpur', '+08:00', 'MY'),
  ('America/New_York', '-05:00', 'US'),
  ('Europe/London', '+00:00', 'GB'),
  ('Asia/Tokyo', '+09:00', 'JP');

-- ============== SEED: Locales ==============
INSERT INTO locale_configs (code, language_code, name, name_local, is_rtl) VALUES
  ('th-TH', 'th', 'Thai (Thailand)', 'ภาษาไทย', false),
  ('en-US', 'en', 'English (US)', 'English', false),
  ('en-GB', 'en', 'English (UK)', 'English', false),
  ('en-SG', 'en', 'English (Singapore)', 'English', false),
  ('vi-VN', 'vi', 'Vietnamese', 'Tiếng Việt', false),
  ('id-ID', 'id', 'Indonesian', 'Bahasa Indonesia', false),
  ('ms-MY', 'ms', 'Malay', 'Bahasa Melayu', false),
  ('ja-JP', 'ja', 'Japanese', '日本語', false),
  ('zh-CN', 'zh', 'Chinese (Simplified)', '简体中文', false),
  ('ar-SA', 'ar', 'Arabic', 'العربية', true);

-- ============== SEED: Data Residency Regions ==============
INSERT INTO data_residency_regions (code, name, provider, country_code) VALUES
  ('ap-southeast-1', 'Southeast Asia (Singapore)', 'supabase', 'SG'),
  ('us-east-1', 'US East (Virginia)', 'supabase', 'US'),
  ('eu-west-1', 'Europe (Ireland)', 'supabase', 'GB');

-- ============== SEED: Feature Flags ==============
INSERT INTO feature_flags (key, name, description, is_enabled) VALUES
  ('payroll_enabled',      'Payroll Module',      'Enable payroll processing features', false),
  ('ai_matching',          'AI Candidate Matching', 'Enable AI-powered candidate matching', false),
  ('ai_resume_screening',  'AI Resume Screening',  'Enable AI resume screening', false),
  ('attendance_enabled',   'Attendance Module',    'Enable attendance tracking', false),
  ('leave_enabled',        'Leave Module',         'Enable leave management', false),
  ('performance_enabled',  'Performance Module',   'Enable performance reviews', false),
  ('compliance_enabled',   'Compliance Module',    'Enable compliance tools', false),
  ('billing_enabled',      'Billing Module',       'Enable billing and subscriptions', false),
  ('messaging_enabled',    'Messaging Module',     'Enable messaging channels', false),
  ('onboarding_enabled',   'Onboarding Module',    'Enable onboarding workflows', true),
  ('recruitment_enabled',  'Recruitment Module',   'Enable recruiting features', true);

-- ============== HELPER: Check if feature is enabled for a company ==============
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_key TEXT, p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    -- Check company-level override first
    (SELECT CFF.is_enabled
     FROM company_feature_flags CFF
     JOIN feature_flags FF ON FF.id = CFF.feature_flag_id
     WHERE FF.key = p_feature_key
       AND CFF.company_id = p_company_id
     LIMIT 1),
    -- Fall back to global default
    (SELECT FF.is_enabled
     FROM feature_flags FF
     WHERE FF.key = p_feature_key
     LIMIT 1),
    false
  )
$$;
