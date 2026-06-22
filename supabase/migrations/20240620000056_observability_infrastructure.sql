-- ============================================================================
-- Migration: 20240620000056_observability_infrastructure.sql
-- Gate D: Observability, Recovery, and Operational Readiness
-- ============================================================================
-- Adds:
--   1. correlation_id columns on key tenant-facing tables
--   2. audit_log_retention policy table
--   3. idempotency_keys table
--   4. dead_letter_queue table
--   5. usage_metrics table
--   6. tenant_quotas table
--   7. cost_attribution table
-- ============================================================================

-- ─── 1. correlation_id columns ───────────────────────────────────────────────
-- Only add to tables that exist (skip if table doesn't exist)

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS correlation_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS correlation_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS correlation_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS correlation_id UUID;
  END IF;
END $$;

-- ─── 2. audit_log_retention policy table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 2555,
  legal_hold BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_audit_retention_company
  ON audit_log_retention(company_id);

-- ─── 3. idempotency_keys table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key
  ON idempotency_keys(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires
  ON idempotency_keys(expires_at);

-- ─── 4. dead_letter_queue table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  queue_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reprocessed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dlq_company
  ON dead_letter_queue(company_id);

CREATE INDEX IF NOT EXISTS idx_dlq_status
  ON dead_letter_queue(status);

CREATE INDEX IF NOT EXISTS idx_dlq_created
  ON dead_letter_queue(created_at);

-- ─── 5. usage_metrics table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_company
  ON usage_metrics(company_id);

CREATE INDEX IF NOT EXISTS idx_usage_metric
  ON usage_metrics(metric_name);

CREATE INDEX IF NOT EXISTS idx_usage_period
  ON usage_metrics(period_start, period_end);

-- ─── 6. tenant_quotas table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  quota_limit NUMERIC NOT NULL,
  quota_period TEXT NOT NULL
    CHECK (quota_period IN ('hourly', 'daily', 'monthly')),
  enforcement TEXT NOT NULL DEFAULT 'soft'
    CHECK (enforcement IN ('soft', 'hard')),
  alert_threshold NUMERIC DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, metric_name)
);

-- ─── 7. cost_attribution table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cost_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  cost_usd NUMERIC NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cost_company
  ON cost_attribution(company_id);

CREATE INDEX IF NOT EXISTS idx_cost_service
  ON cost_attribution(service);

CREATE INDEX IF NOT EXISTS idx_cost_period
  ON cost_attribution(period_start, period_end);
