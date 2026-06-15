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
