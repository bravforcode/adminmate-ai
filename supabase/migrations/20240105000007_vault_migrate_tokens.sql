-- Add vault reference column to chat_platform_connections
-- This column is added even without vault enabled (UUID nullable)
-- Once vault is enabled, migrate tokens using manual_migrate_tokens.sql

ALTER TABLE chat_platform_connections
ADD COLUMN IF NOT EXISTS access_token_vault_id UUID;

COMMENT ON COLUMN chat_platform_connections.access_token_vault_id IS 'References vault.secrets(id) once vault extension is enabled. NULL means token is in access_token column (plaintext).';
