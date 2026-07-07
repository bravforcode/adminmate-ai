-- ============================================================
-- SSO Certificate Encryption at Rest
-- Encrypts the certificate column in sso_provider_configs using pgcrypto.
--
-- SECURITY: SAML certificates are sensitive cryptographic material.
-- This migration encrypts them at rest using pgcrypto's pgp_sym_encrypt.
--
-- PREREQUISITES:
--   - The pgcrypto extension must be enabled (already present via extensions migration).
--   - Set the app setting 'app.sso_encryption_key' to a strong passphrase.
--     In production, use Supabase Vault or environment variable injection.
--
-- ROLLBACK: Run the down-migration section (commented at bottom).
-- ============================================================

-- 1. Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create helper functions for encrypting/decrypting SSO certificates
-- These use pgp_sym_encrypt/decrypt with AES-256.

CREATE OR REPLACE FUNCTION public.encrypt_sso_certificate(p_plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Get encryption key from app settings (set via Supabase Dashboard or Vault)
  v_key := current_setting('app.sso_encryption_key', true);

  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'SSO encryption key not configured. Set app.sso_encryption_key.';
  END IF;

  IF p_plaintext IS NULL OR p_plaintext = '' THEN
    RETURN p_plaintext;
  END IF;

  RETURN pgp_sym_encrypt(p_plaintext, v_key, 'cipher-algo=aes256');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_sso_certificate(p_ciphertext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := current_setting('app.sso_encryption_key', true);

  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'SSO decryption key not configured. Set app.sso_encryption_key.';
  END IF;

  IF p_ciphertext IS NULL OR p_ciphertext = '' THEN
    RETURN p_ciphertext;
  END IF;

  -- Check if the value looks like a pgp-encrypted blob (starts with -----BEGIN PGP MESSAGE-----)
  -- If not, it's an unencrypted legacy value — return as-is for backward compatibility.
  IF p_ciphertext LIKE '-----BEGIN PGP MESSAGE-----%' THEN
    RETURN pgp_sym_decrypt(p_ciphertext::bytea, v_key);
  ELSE
    RETURN p_ciphertext;
  END IF;
END;
$$;

-- 3. Create a view that auto-decrypts certificates for authorized reads
-- SECURITY INVOKER ensures RLS on the base table is enforced — the view
-- runs with the querying user's privileges, not the view owner's.
-- Without this, any authenticated user could bypass RLS and read all SSO certs.
CREATE OR REPLACE VIEW public.sso_provider_configs_decrypted
  WITH (security_invoker = true)
AS
SELECT
  id,
  company_id,
  provider_type,
  provider_name,
  metadata_url,
  entity_id,
  public.decrypt_sso_certificate(certificate) AS certificate,
  is_enabled,
  config_status,
  created_at,
  updated_at
FROM public.sso_provider_configs;

-- 4. Grant SELECT on the decrypted view to authenticated users (RLS still applies via the base table)
GRANT SELECT ON public.sso_provider_configs_decrypted TO authenticated;

-- 5. Document: to encrypt existing plaintext certificates, run:
--    UPDATE sso_provider_configs
--    SET certificate = public.encrypt_sso_certificate(certificate)
--    WHERE certificate IS NOT NULL
--      AND certificate NOT LIKE '-----BEGIN PGP MESSAGE-----%';
--    (This is a one-time data migration — run manually after setting the encryption key.)

-- ============================================================
-- ROLLBACK (uncomment to undo):
--
-- DROP VIEW IF EXISTS public.sso_provider_configs_decrypted;
-- DROP FUNCTION IF EXISTS public.decrypt_sso_certificate;
-- DROP FUNCTION IF EXISTS public.encrypt_sso_certificate;
-- ============================================================
