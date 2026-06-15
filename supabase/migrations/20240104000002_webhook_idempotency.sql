CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, message_id)
);

CREATE INDEX idx_webhook_events_platform_message_id ON webhook_events(platform, message_id);
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);