-- ============================================================
-- Release 3: Candidate Portal — Schema Changes
-- ============================================================

-- 1. Public token for jobs (for /apply/:token links)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_token VARCHAR(32) UNIQUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Generate public_token for existing active jobs
UPDATE jobs SET public_token = substring(gen_random_uuid()::text, 1, 32) WHERE public_token IS NULL;
ALTER TABLE jobs ALTER COLUMN public_token SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_public_token ON jobs(public_token);
CREATE INDEX IF NOT EXISTS idx_jobs_published ON jobs(is_published) WHERE is_published = true;

-- 2. Tracking token for applications (for /portal/track/:token links)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(32) UNIQUE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;

-- Generate tracking_token for existing applications
UPDATE applications SET tracking_token = substring(gen_random_uuid()::text, 1, 32) WHERE tracking_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_applications_tracking_token ON applications(tracking_token);

-- 3. Public-safe job view function (anonymized, no sensitive data)
CREATE OR REPLACE FUNCTION get_public_job(p_token VARCHAR)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  title_th VARCHAR,
  department VARCHAR,
  location VARCHAR,
  employment_type VARCHAR,
  experience_level VARCHAR,
  description TEXT,
  description_th TEXT,
  responsibilities TEXT[],
  requirements TEXT[],
  nice_to_have TEXT[],
  skills_required TEXT[],
  application_deadline DATE,
  company_name VARCHAR,
  company_logo_url TEXT,
  salary_visible BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.title_th,
    j.department,
    j.location,
    j.employment_type,
    j.experience_level,
    j.description,
    j.description_th,
    j.responsibilities,
    j.requirements,
    j.nice_to_have,
    j.skills_required,
    j.application_deadline,
    c.name AS company_name,
    c.logo_url AS company_logo_url,
    (j.salary_min IS NOT NULL AND j.salary_max IS NOT NULL) AS salary_visible
  FROM jobs j
  JOIN companies c ON c.id = j.company_id
  WHERE j.public_token = p_token
    AND j.status = 'active'
    AND j.is_published = true
    AND c.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Public application tracking view (limited fields)
CREATE OR REPLACE FUNCTION get_public_application(p_token VARCHAR)
RETURNS TABLE (
  id UUID,
  status VARCHAR,
  applied_at TIMESTAMPTZ,
  job_title VARCHAR,
  company_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.status,
    a.applied_at,
    j.title AS job_title,
    c.name AS company_name
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  JOIN companies c ON c.id = a.company_id
  WHERE a.tracking_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
