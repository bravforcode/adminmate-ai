-- RELEASE 1 — Task 5: Sensitive Field Registry
-- Central registry of fields that must never be used in AI scoring/prediction.
-- AI and scoring services MUST query this table before processing candidate data.

CREATE TABLE sensitive_field_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name VARCHAR(255) NOT NULL UNIQUE,
    field_category VARCHAR(100) NOT NULL,  -- e.g. 'demographic', 'health', 'immigration', 'financial'
    description TEXT,
    exclusion_reason TEXT,                 -- why this field must be excluded from AI scoring
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== INDEXES ==============
CREATE INDEX idx_sensitive_fields_name ON sensitive_field_registry(field_name);
CREATE INDEX idx_sensitive_fields_category ON sensitive_field_registry(field_category);
CREATE INDEX idx_sensitive_fields_active ON sensitive_field_registry(is_active) WHERE is_active = true;

-- ============== RLS ==============
ALTER TABLE sensitive_field_registry ENABLE ROW LEVEL SECURITY;
-- Readable by all authenticated users (AI services need to check)
CREATE POLICY "sensitive_fields_read" ON sensitive_field_registry FOR SELECT TO authenticated USING (true);
-- Only admins can manage the registry
CREATE POLICY "sensitive_fields_write" ON sensitive_field_registry FOR ALL TO authenticated
  USING (safe_user_role() = 'admin')
  WITH CHECK (safe_user_role() = 'admin');

-- ============== SEED: Fields excluded from AI scoring ==============
INSERT INTO sensitive_field_registry (field_name, field_category, description, exclusion_reason) VALUES
  -- Demographic
  ('age',                'demographic',   'Date of birth or calculated age', 'Age discrimination risk; not job-related'),
  ('gender',             'demographic',   'Gender identity', 'Gender discrimination risk; not job-related'),
  ('marital_status',     'demographic',   'Marital or relationship status', 'Personal information; not job-related'),
  ('nationality',        'demographic',   'Nationality or citizenship', 'National origin discrimination risk'),
  ('race',               'demographic',   'Race or ethnicity', 'Race discrimination risk; not job-related'),
  ('religion',           'demographic',   'Religious belief or affiliation', 'Religious discrimination risk; not job-related'),
  ('photo',              'demographic',   'Profile photo or image', 'Visual bias risk; not job-related'),

  -- Health
  ('health_data',        'health',        'Medical conditions, disabilities, or health status', 'Health discrimination risk; disability rights'),
  ('pregnancy',          'health',        'Pregnancy status or maternity plans', 'Pregnancy discrimination risk'),
  ('disability',         'health',        'Disability status or accommodations', 'Disability discrimination risk; ADA/Equality Act'),

  -- Dependent health
  ('dependent_health_data', 'health',     'Dependent health information', 'Personal information; not job-related'),

  -- Immigration
  ('immigration_status', 'immigration',   'Visa, work permit, or immigration status', 'Immigration discrimination risk; not job-related unless legally required'),

  -- Financial (for candidates)
  ('salary_history',     'financial',     'Previous salary or compensation history', 'Pay equity risk; not indicative of future performance'),

  -- Union
  ('union_status',       'employment',    'Union membership or activity', 'Labor rights protection; not job-related');

-- ============== HELPER: Get all active sensitive field names ==============
CREATE OR REPLACE FUNCTION get_sensitive_field_names()
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ARRAY_AGG(field_name)
  FROM sensitive_field_registry
  WHERE is_active = true
$$;

-- ============== HELPER: Check if a field is sensitive ==============
CREATE OR REPLACE FUNCTION is_sensitive_field(p_field_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sensitive_field_registry
    WHERE field_name = p_field_name AND is_active = true
  )
$$;
