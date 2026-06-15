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
