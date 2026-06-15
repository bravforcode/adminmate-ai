-- ═══════════════════════════════════════════════════════════════
-- MANUAL SCRIPT: Migrate existing plaintext tokens to Supabase Vault
-- ═══════════════════════════════════════════════════════════════
-- ⚠️  รันใน Supabase SQL Editor เท่านั้น
-- ⚠️  ตรวจสอบ tokens ก่อน migrate:
--      SELECT id, platform, platform_account_id,
--             substring(access_token, 1, 8) || '...' AS token_preview,
--             access_token_vault_id
--      FROM chat_platform_connections
--      WHERE access_token IS NOT NULL;
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  conn RECORD;
  v_secret_id UUID;
  v_count INT := 0;
BEGIN
  FOR conn IN
    SELECT id, access_token, platform, platform_account_id
    FROM chat_platform_connections
    WHERE access_token IS NOT NULL
      AND access_token_vault_id IS NULL
  LOOP
    INSERT INTO vault.secrets (secret, description)
    VALUES (
      conn.access_token,
      'chat_platform_token:' || conn.platform || ':' || conn.id
    )
    RETURNING id INTO v_secret_id;

    UPDATE chat_platform_connections
    SET access_token_vault_id = v_secret_id,
        access_token = NULL
    WHERE id = conn.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % token(s) to Vault', v_count;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- VERIFY:
-- SELECT id, platform, access_token_vault_id,
--        access_token IS NULL AS token_cleared
-- FROM chat_platform_connections
-- WHERE access_token_vault_id IS NOT NULL;
-- ═══════════════════════════════════════════════════════════════
