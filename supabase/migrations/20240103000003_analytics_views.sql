-- View: Message stats per company per day
CREATE OR REPLACE VIEW v_message_stats_daily AS
SELECT
    company_id,
    platform,
    DATE(created_at) as date,
    direction,
    status,
    COUNT(*) as message_count,
    AVG(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100 as delivery_rate
FROM messages
GROUP BY company_id, platform, DATE(created_at), direction, status;

-- View: Active conversations per platform
CREATE OR REPLACE VIEW v_active_conversations AS
SELECT
    company_id,
    platform,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE last_message_at > NOW() - INTERVAL '1 hour') as active_1h,
    COUNT(*) FILTER (WHERE last_message_at > NOW() - INTERVAL '24 hours') as active_24h,
    AVG(unread_count) as avg_unread
FROM conversation_threads
WHERE status = 'active'
GROUP BY company_id, platform;

-- View: Queue health
CREATE OR REPLACE VIEW v_queue_health AS
SELECT
    company_id,
    platform,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    AVG(CASE WHEN status = 'sent' THEN EXTRACT(EPOCH FROM (processed_at - created_at)) END) as avg_processing_seconds
FROM message_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY company_id, platform;

-- View: Platform health summary
CREATE OR REPLACE VIEW v_platform_health AS
SELECT
    service,
    status,
    latency_ms,
    checked_at,
    LAG(checked_at) OVER (PARTITION BY service ORDER BY checked_at) as prev_check
FROM system_health
WHERE checked_at > NOW() - INTERVAL '24 hours'
ORDER BY service, checked_at DESC;
