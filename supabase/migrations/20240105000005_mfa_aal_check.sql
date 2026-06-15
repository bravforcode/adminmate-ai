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
