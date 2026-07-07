-- Phase 3 Fix 2: Optimize applications_read RLS to use direct company_id
--
-- Problem: The applications_read policy uses a subquery:
--   candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
-- This causes a sequential scan through candidates for every row in applications.
--
-- Solution: applications table already has company_id (migration 20240101000007),
-- so we can filter directly: company_id = safe_user_company_id()
--
-- Risk: LOW — company_id on applications is NOT NULL and FK'd to companies(id).
-- All existing queries filter by company_id already.

-- Drop old subquery-based policies
DROP POLICY IF EXISTS "applications_read" ON applications;
DROP POLICY IF EXISTS "applications_write" ON applications;

-- Fast read: direct company_id check (index scan, no subquery)
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);

-- Write: direct company_id + role check
CREATE POLICY "applications_write" ON applications FOR ALL TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin','hr','recruiter')
  )
  WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin','hr','recruiter')
  );

-- Also add an index on applications.company_id if not present
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);
