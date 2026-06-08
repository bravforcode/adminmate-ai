-- Function to process message queue (called by cron or edge function)
CREATE OR REPLACE FUNCTION process_message_queue(
    p_batch_size INTEGER DEFAULT 10
)
RETURNS TABLE(
    queue_id UUID,
    platform VARCHAR(20),
    platform_user_id VARCHAR(255),
    content TEXT,
    content_type VARCHAR(20),
    company_id UUID
) AS $$
BEGIN
    -- Lock and fetch pending messages
    RETURN QUERY
    WITH locked AS (
        SELECT mq.id, mq.platform, mq.platform_user_id, mq.content, mq.content_type, mq.company_id
        FROM message_queue mq
        WHERE mq.status = 'pending'
          AND mq.scheduled_at <= NOW()
        ORDER BY mq.priority DESC, mq.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE message_queue SET
        status = 'processing',
        processed_at = NOW()
    FROM locked
    WHERE message_queue.id = locked.id
    RETURNING locked.id, locked.platform, locked.platform_user_id, locked.content, locked.content_type, locked.company_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as sent
CREATE OR REPLACE FUNCTION mark_queue_sent(p_queue_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE message_queue SET status = 'sent', processed_at = NOW() WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as failed with retry
CREATE OR REPLACE FUNCTION mark_queue_failed(p_queue_id UUID, p_error TEXT)
RETURNS VOID AS $$
DECLARE
    v_retry_count INTEGER;
    v_max_retries INTEGER;
    v_next_retry TIMESTAMPTZ;
BEGIN
    SELECT retry_count, max_retries INTO v_retry_count, v_max_retries FROM message_queue WHERE id = p_queue_id;

    IF v_retry_count < v_max_retries THEN
        v_next_retry := NOW() + (INTERVAL '5 seconds' * POWER(2, v_retry_count)); -- exponential backoff
        UPDATE message_queue SET
            status = 'failed',
            retry_count = v_retry_count + 1,
            next_retry_at = v_next_retry,
            last_error = p_error
        WHERE id = p_queue_id;
    ELSE
        UPDATE message_queue SET
            status = 'failed',
            retry_count = v_retry_count + 1,
            last_error = p_error
        WHERE id = p_queue_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to reset stuck messages (processing > 5 min)
CREATE OR REPLACE FUNCTION reset_stuck_messages()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE message_queue SET
        status = 'pending',
        next_retry_at = NOW(),
        last_error = 'stuck: processing timeout'
    WHERE status = 'processing'
      AND processed_at < NOW() - INTERVAL '5 minutes';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
