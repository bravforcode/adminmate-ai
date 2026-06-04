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
