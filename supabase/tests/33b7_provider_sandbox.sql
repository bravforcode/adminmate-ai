-- ============================================================
-- 33B.7: Provider Sandbox Verification Tests
-- pgTAP tests for provider status, validation, capabilities, readiness
-- ============================================================

SELECT plan(19);

-- ============================================================
-- Test 1: get_provider_status() is callable and returns rows
-- ============================================================
SELECT ok(
  (SELECT count(*) FROM get_provider_status()) > 0,
  'get_provider_status() returns provider rows'
);

-- ============================================================
-- Test 2: get_provider_status() includes known providers
-- ============================================================
SELECT ok(
  EXISTS(SELECT 1 FROM get_provider_status() WHERE provider_key = 'line'),
  'get_provider_status() includes LINE provider'
);

SELECT ok(
  EXISTS(SELECT 1 FROM get_provider_status() WHERE provider_key = 'whatsapp'),
  'get_provider_status() includes WhatsApp provider'
);

-- ============================================================
-- Test 3: get_provider_status() has provider_key and category columns
-- ============================================================
SELECT ok(
  (SELECT count(*) FROM get_provider_status() WHERE provider_key IS NOT NULL) > 0,
  'get_provider_status() returns non-null provider_key column'
);

SELECT ok(
  (SELECT count(*) FROM get_provider_status() WHERE category IS NOT NULL) > 0,
  'get_provider_status() returns non-null category column'
);

-- ============================================================
-- Test 4: validate_provider_adapter() — known adapter returns ready/not_configured
-- ============================================================
SELECT lives_ok(
  $$SELECT * FROM validate_provider_adapter('line')$$,
  'validate_provider_adapter() is callable for LINE'
);

SELECT is(
  (SELECT exists_in_catalog FROM validate_provider_adapter('line')),
  true,
  'validate_provider_adapter(line) finds LINE in catalog'
);

-- ============================================================
-- Test 5: validate_provider_adapter() — unknown provider returns not_found
-- ============================================================
SELECT is(
  (SELECT validation_status FROM validate_provider_adapter('nonexistent_provider')),
  'not_found',
  'validate_provider_adapter(nonexistent) returns not_found'
);

-- ============================================================
-- Test 6: validate_provider_adapter() — unknown provider returns correct message
-- ============================================================
SELECT is(
  (SELECT validation_message FROM validate_provider_adapter('nonexistent_provider')),
  'Provider not found in integration_providers catalog',
  'validate_provider_adapter(nonexistent) returns correct message'
);

-- ============================================================
-- Test 7: get_provider_capabilities() — LINE returns correct data
-- ============================================================
SELECT lives_ok(
  $$SELECT * FROM get_provider_capabilities('line')$$,
  'get_provider_capabilities() is callable for LINE'
);

SELECT is(
  (SELECT can_send_messages FROM get_provider_capabilities('line')),
  true,
  'LINE can send messages'
);

SELECT is(
  (SELECT can_receive_messages FROM get_provider_capabilities('line')),
  true,
  'LINE can receive messages'
);

-- ============================================================
-- Test 8: get_provider_capabilities() — unknown provider returns defaults
-- ============================================================
SELECT is(
  (SELECT can_send_messages FROM get_provider_capabilities('nonexistent')),
  false,
  'Unknown provider cannot send messages'
);

-- ============================================================
-- Test 9: get_provider_capabilities() — required config fields exist
-- ============================================================
SELECT ok(
  (SELECT array_length(required_config_fields, 1) FROM get_provider_capabilities('line')) >= 1,
  'LINE has at least 1 required config field'
);

-- ============================================================
-- Test 10: get_provider_capabilities() — WhatsApp capabilities
-- ============================================================
SELECT is(
  (SELECT can_send_messages FROM get_provider_capabilities('whatsapp')),
  true,
  'WhatsApp can send messages'
);

-- ============================================================
-- Test 11: audit_provider_readiness() is callable
-- ============================================================
SELECT lives_ok(
  $$SELECT * FROM audit_provider_readiness() LIMIT 5$$,
  'audit_provider_readiness() is callable'
);

-- ============================================================
-- Test 12: audit_provider_readiness() returns rows for all providers
-- ============================================================
SELECT is(
  (SELECT count(*) FROM audit_provider_readiness()),
  (SELECT count(*) FROM integration_providers),
  'audit_provider_readiness() returns one row per provider'
);

-- ============================================================
-- Test 13: audit_provider_readiness() — readiness levels are valid
-- ============================================================
SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM audit_provider_readiness()
    WHERE readiness_level NOT IN ('blocked', 'configured', 'degraded', 'production_ready')
  ),
  'All readiness levels are valid enum values'
);

-- ============================================================
-- Test 14: audit_provider_readiness() — LINE has known adapters detected
-- ============================================================
SELECT is(
  (SELECT has_adapter FROM audit_provider_readiness() WHERE provider_key = 'line'),
  true,
  'audit_provider_readiness detects LINE adapter'
);
