-- ============================================================
-- Release 33B.7: Provider Sandbox Verification
-- Functions for provider status, validation, capabilities, and readiness
-- ============================================================

-- 1. Provider status function — returns status of all integration providers
CREATE OR REPLACE FUNCTION get_provider_status()
RETURNS TABLE (
  provider_key VARCHAR(100),
  provider_name VARCHAR(255),
  category VARCHAR(50),
  is_active BOOLEAN,
  config_status VARCHAR(30),
  has_configs BIGINT,
  enabled_configs BIGINT,
  total_sync_jobs BIGINT,
  failed_sync_jobs BIGINT,
  last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.provider_key,
    ip.name AS provider_name,
    ip.category,
    ip.is_active,
    COALESCE(
      (SELECT ic.config_status
       FROM integration_configs ic
       WHERE ic.provider_id = ip.id
       ORDER BY ic.updated_at DESC
       LIMIT 1),
      'not_configured'
    ) AS config_status,
    (SELECT count(*) FROM integration_configs ic WHERE ic.provider_id = ip.id) AS has_configs,
    (SELECT count(*) FROM integration_configs ic WHERE ic.provider_id = ip.id AND ic.is_enabled = true) AS enabled_configs,
    (SELECT count(*) FROM integration_sync_jobs isj WHERE isj.provider_id = ip.id) AS total_sync_jobs,
    (SELECT count(*) FROM integration_sync_jobs isj WHERE isj.provider_id = ip.id AND isj.status = 'failed') AS failed_sync_jobs,
    (SELECT max(isj.completed_at) FROM integration_sync_jobs isj WHERE isj.provider_id = ip.id AND isj.status = 'completed') AS last_sync_at
  FROM integration_providers ip
  ORDER BY ip.category, ip.provider_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Validate provider adapter — checks if adapter exists and is properly configured
CREATE OR REPLACE FUNCTION validate_provider_adapter(p_provider_name VARCHAR)
RETURNS TABLE (
  provider_key VARCHAR(100),
  exists_in_catalog BOOLEAN,
  is_active BOOLEAN,
  has_adapter_code BOOLEAN,
  config_ready BOOLEAN,
  validation_status VARCHAR(30),
  validation_message TEXT
) AS $$
DECLARE
  v_provider RECORD;
  v_known_adapters TEXT[] := ARRAY[
    'line', 'whatsapp', 'email', 'sms', 'facebook', 'in_app',
    'slack', 'teams', 'google_calendar', 'microsoft_calendar',
    'xero', 'quickbooks', 'stripe'
  ];
  v_adapter_exists BOOLEAN;
BEGIN
  -- Check if provider exists in catalog
  SELECT * INTO v_provider
  FROM integration_providers ip
  WHERE ip.provider_key = p_provider_name;

  v_adapter_exists := p_provider_name = ANY(v_known_adapters);

  provider_key := p_provider_name;
  exists_in_catalog := (v_provider IS NOT NULL);
  is_active := COALESCE(v_provider.is_active, false);
  has_adapter_code := v_adapter_exists;

  -- Check if config exists and is ready
  SELECT EXISTS(
    SELECT 1 FROM integration_configs ic
    JOIN integration_providers ip2 ON ip2.id = ic.provider_id
    WHERE ip2.provider_key = p_provider_name
    AND ic.config_status IN ('configured', 'connected')
    AND ic.is_enabled = true
  ) INTO config_ready;

  -- Determine overall status
  IF NOT exists_in_catalog THEN
    validation_status := 'not_found';
    validation_message := 'Provider not found in integration_providers catalog';
  ELSIF NOT has_adapter_code THEN
    validation_status := 'no_adapter';
    validation_message := 'No adapter code found for this provider';
  ELSIF NOT is_active THEN
    validation_status := 'disabled';
    validation_message := 'Provider is disabled in catalog';
  ELSIF NOT config_ready THEN
    validation_status := 'not_configured';
    validation_message := 'Provider adapter exists but has no active configuration';
  ELSE
    validation_status := 'ready';
    validation_message := 'Provider is fully configured and ready for sandbox testing';
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Get provider capabilities — returns capabilities of a specific provider
CREATE OR REPLACE FUNCTION get_provider_capabilities(p_provider_name VARCHAR)
RETURNS TABLE (
  provider_key VARCHAR(100),
  can_send_messages BOOLEAN,
  can_receive_messages BOOLEAN,
  can_sync_data BOOLEAN,
  supports_templates BOOLEAN,
  supports_media BOOLEAN,
  supports_webhooks BOOLEAN,
  required_config_fields TEXT[],
  optional_config_fields TEXT[],
  rate_limit_per_minute INTEGER,
  max_message_length INTEGER
) AS $$
DECLARE
  v_channel_capabilities JSONB := '{
    "email":   {"send": true, "receive": true, "sync": false, "templates": true, "media": true,  "webhooks": true,  "required": ["smtp_host","smtp_port","smtp_user","smtp_password"], "optional": ["from_name","from_email","reply_to"], "rate_limit": 60, "max_length": 100000},
    "line":    {"send": true, "receive": true, "sync": false, "templates": true, "media": true,  "webhooks": true,  "required": ["channel_access_token","channel_secret"], "optional": ["rich_menu_id"], "rate_limit": 500, "max_length": 5000},
    "whatsapp":{"send": true, "receive": true, "sync": false, "templates": true, "media": true,  "webhooks": true,  "required": ["phone_number_id","access_token","verify_token"], "optional": ["business_account_id"], "rate_limit": 80, "max_length": 4096},
    "sms":     {"send": true, "receive": false,"sync": false, "templates": false,"media": false, "webhooks": false, "required": ["twilio_account_sid","twilio_auth_token","twilio_phone_number"], "optional": [], "rate_limit": 30, "max_length": 1600},
    "facebook":{"send": true, "receive": true, "sync": false, "templates": true, "media": true,  "webhooks": true,  "required": ["page_access_token","verify_token"], "optional": ["app_secret"], "rate_limit": 200, "max_length": 2000},
    "in_app":  {"send": true, "receive": false,"sync": false, "templates": true, "media": false, "webhooks": false, "required": [], "optional": [], "rate_limit": 1000, "max_length": 10000}
  }';
  v_integration_capabilities JSONB := '{
    "slack":              {"send": true, "receive": true, "sync": true,  "templates": true, "media": true,  "webhooks": true,  "required": ["bot_token","signing_secret"], "optional": ["app_id"], "rate_limit": 100, "max_length": 40000},
    "teams":              {"send": true, "receive": true, "sync": true,  "templates": true, "media": true,  "webhooks": true,  "required": ["tenant_id","client_id","client_secret"], "optional": ["team_id"], "rate_limit": 60, "max_length": 28000},
    "google_calendar":    {"send": false,"receive": false,"sync": true,  "templates": false,"media": false, "webhooks": true,  "required": ["client_id","client_secret","refresh_token"], "optional": ["calendar_id"], "rate_limit": 10, "max_length": 0},
    "microsoft_calendar": {"send": false,"receive": false,"sync": true,  "templates": false,"media": false, "webhooks": true,  "required": ["tenant_id","client_id","client_secret"], "optional": ["calendar_id"], "rate_limit": 10, "max_length": 0},
    "xero":               {"send": false,"receive": false,"sync": true,  "templates": false,"media": false, "webhooks": true,  "required": ["client_id","client_secret"], "optional": ["tenant_id"], "rate_limit": 60, "max_length": 0},
    "quickbooks":         {"send": false,"receive": false,"sync": true,  "templates": false,"media": false, "webhooks": true,  "required": ["client_id","client_secret","realm_id"], "optional": [], "rate_limit": 500, "max_length": 0},
    "stripe":             {"send": false,"receive": false,"sync": true,  "templates": false,"media": false, "webhooks": true,  "required": ["secret_key","webhook_secret"], "optional": ["publishable_key"], "rate_limit": 100, "max_length": 0}
  }';
  v_caps JSONB;
BEGIN
  v_caps := COALESCE(v_channel_capabilities -> p_provider_name, v_integration_capabilities -> p_provider_name);

  provider_key := p_provider_name;

  IF v_caps IS NULL THEN
    can_send_messages := false;
    can_receive_messages := false;
    can_sync_data := false;
    supports_templates := false;
    supports_media := false;
    supports_webhooks := false;
    required_config_fields := ARRAY[]::TEXT[];
    optional_config_fields := ARRAY[]::TEXT[];
    rate_limit_per_minute := 0;
    max_message_length := 0;
  ELSE
    can_send_messages := (v_caps ->> 'send')::BOOLEAN;
    can_receive_messages := (v_caps ->> 'receive')::BOOLEAN;
    can_sync_data := (v_caps ->> 'sync')::BOOLEAN;
    supports_templates := (v_caps ->> 'templates')::BOOLEAN;
    supports_media := (v_caps ->> 'media')::BOOLEAN;
    supports_webhooks := (v_caps ->> 'webhooks')::BOOLEAN;
    rate_limit_per_minute := (v_caps ->> 'rate_limit')::INTEGER;
    max_message_length := (v_caps ->> 'max_length')::INTEGER;

    SELECT array_agg(elem::TEXT)
    INTO required_config_fields
    FROM jsonb_array_elements_text(v_caps -> 'required') AS elem;

    SELECT array_agg(elem::TEXT)
    INTO optional_config_fields
    FROM jsonb_array_elements_text(v_caps -> 'optional') AS elem;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Audit provider readiness — returns readiness assessment for all providers
CREATE OR REPLACE FUNCTION audit_provider_readiness()
RETURNS TABLE (
  provider_key VARCHAR(100),
  provider_name VARCHAR(255),
  category VARCHAR(50),
  readiness_level VARCHAR(30),
  has_catalog_entry BOOLEAN,
  has_adapter BOOLEAN,
  has_configuration BOOLEAN,
  has_sync_history BOOLEAN,
  has_recent_errors BOOLEAN,
  blockers TEXT[],
  recommendations TEXT[]
) AS $$
DECLARE
  v_provider RECORD;
  v_known_adapters TEXT[] := ARRAY[
    'line', 'whatsapp', 'email', 'sms', 'facebook', 'in_app',
    'slack', 'teams', 'google_calendar', 'microsoft_calendar',
    'xero', 'quickbooks', 'stripe'
  ];
  v_blockers TEXT[];
  v_recommendations TEXT[];
  v_level VARCHAR(30);
  v_config_count BIGINT;
  v_sync_count BIGINT;
  v_fail_count BIGINT;
BEGIN
  FOR v_provider IN
    SELECT * FROM integration_providers ORDER BY category, provider_key
  LOOP
    v_blockers := ARRAY[]::TEXT[];
    v_recommendations := ARRAY[]::TEXT[];

    -- Check adapter existence
    has_adapter := v_provider.provider_key = ANY(v_known_adapters);

    -- Check configuration
    SELECT count(*) INTO v_config_count
    FROM integration_configs ic WHERE ic.provider_id = v_provider.id;

    has_configuration := v_config_count > 0;

    -- Check sync history
    SELECT count(*) INTO v_sync_count
    FROM integration_sync_jobs isj WHERE isj.provider_id = v_provider.id;

    has_sync_history := v_sync_count > 0;

    -- Check recent errors
    SELECT count(*) INTO v_fail_count
    FROM integration_sync_jobs isj
    WHERE isj.provider_id = v_provider.id AND isj.status = 'failed';

    has_recent_errors := v_fail_count > 0;

    -- Determine blockers and level
    IF NOT has_adapter THEN
      v_blockers := array_append(v_blockers, 'No adapter implementation found');
      v_recommendations := array_append(v_recommendations, 'Create adapter in src/services/messaging/providers/');
    END IF;

    IF NOT v_provider.is_active THEN
      v_blockers := array_append(v_blockers, 'Provider is disabled in catalog');
      v_recommendations := array_append(v_recommendations, 'Enable provider in integration_providers table');
    END IF;

    IF NOT has_configuration THEN
      v_blockers := array_append(v_blockers, 'No company configuration exists');
      v_recommendations := array_append(v_recommendations, 'Configure provider via integration_configs for a test company');
    END IF;

    IF has_recent_errors THEN
      v_recommendations := array_append(v_recommendations, 'Review failed sync jobs and resolve errors');
    END IF;

    -- Determine readiness level
    IF array_length(v_blockers, 1) > 0 THEN
      v_level := 'blocked';
    ELSIF NOT has_sync_history THEN
      v_level := 'configured';
    ELSIF has_recent_errors THEN
      v_level := 'degraded';
    ELSE
      v_level := 'production_ready';
    END IF;

    provider_key := v_provider.provider_key;
    provider_name := v_provider.name;
    category := v_provider.category;
    readiness_level := v_level;
    has_catalog_entry := true;
    blockers := v_blockers;
    recommendations := v_recommendations;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
