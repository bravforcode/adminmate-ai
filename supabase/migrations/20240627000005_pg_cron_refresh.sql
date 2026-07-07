-- Phase 3 Fix 3: Add pg_cron refresh for materialized views + rate limit cleanup
--
-- Enables pg_cron extension and schedules:
--   1. Dashboard stats materialized view refresh every minute
--   2. Rate limit cleanup every hour

-- Enable pg_cron (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule dashboard_stats materialized view refresh every minute
SELECT cron.schedule(
  'refresh-dashboard',
  '* * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats'
);

-- Schedule rate limit cleanup every hour (remove entries older than 24h)
SELECT cron.schedule(
  'cleanup-rate-limits',
  '0 * * * *',
  $$SELECT cleanup_rate_limits(24)$$
);
