-- Clean webhook events older than 30 days
-- Requires pg_cron extension (should already be enabled)

-- Schedule cleanup daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-webhook-events',
  '0 3 * * *',
  $$
  DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM stripe_webhook_events WHERE created_at < NOW() - INTERVAL '30 days';
  $$
);
