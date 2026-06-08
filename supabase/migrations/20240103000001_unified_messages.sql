-- Unified messages table for all platforms (WhatsApp, LINE, Web)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'line', 'web', 'email')),
    platform_message_id VARCHAR(255), -- ID from the platform
    platform_user_id VARCHAR(255) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'audio', 'video', 'file', 'template')),
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'ai', 'agent', 'system')),
    sender_id VARCHAR(255), -- user_id or 'ai' or 'system'
    status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received', 'processing', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_company ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status) WHERE status IN ('received', 'processing');
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Conversation threads
CREATE TABLE IF NOT EXISTS conversation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_company ON conversation_threads(company_id);
CREATE INDEX IF NOT EXISTS idx_threads_platform ON conversation_threads(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_threads_active ON conversation_threads(company_id, status, last_message_at DESC);

-- Message queue for reliable delivery (outbox pattern)
CREATE TABLE IF NOT EXISTS message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    reply_to_message_id UUID REFERENCES messages(id),
    priority INTEGER DEFAULT 0, -- higher = more urgent
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_pending ON message_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_retry ON message_queue(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;

-- Platform sync log for webhook tracking
CREATE TABLE IF NOT EXISTS platform_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    platform VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- message.received, message.sent, etc.
    payload_hash VARCHAR(64), -- SHA-256 of payload for dedup
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    processing_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_platform ON platform_sync_log(platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_dedup ON platform_sync_log(platform, payload_hash) WHERE payload_hash IS NOT NULL;

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(50) NOT NULL, -- 'whatsapp', 'line', 'gemini', 'database'
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
    latency_ms INTEGER,
    error_rate DECIMAL(5,4),
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_service ON system_health(service, checked_at DESC);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_threads_updated_at BEFORE UPDATE ON conversation_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Messages: company isolation
CREATE POLICY "messages_company_isolation" ON messages
    FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Threads: company isolation
CREATE POLICY "threads_company_isolation" ON conversation_threads
    FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Queue: service role only (internal)
CREATE POLICY "queue_service_role" ON message_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Sync log: service role only
CREATE POLICY "sync_log_service_role" ON platform_sync_log
    FOR ALL USING (auth.role() = 'service_role');

-- Health: service role only
CREATE POLICY "health_service_role" ON system_health
    FOR ALL USING (auth.role() = 'service_role');

-- Helper function: upsert conversation thread
CREATE OR REPLACE FUNCTION upsert_conversation_thread(
    p_company_id UUID,
    p_platform VARCHAR(20),
    p_platform_user_id VARCHAR(255),
    p_message_preview TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_thread_id UUID;
BEGIN
    INSERT INTO conversation_threads (company_id, platform, platform_user_id, last_message_preview, last_message_at, unread_count)
    VALUES (p_company_id, p_platform, p_platform_user_id, p_message_preview, NOW(), 1)
    ON CONFLICT (company_id, platform, platform_user_id) DO UPDATE SET
        last_message_preview = COALESCE(p_message_preview, conversation_threads.last_message_preview),
        last_message_at = NOW(),
        unread_count = conversation_threads.unread_count + 1,
        updated_at = NOW()
    RETURNING id INTO v_thread_id;

    RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function: get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_company_id UUID,
    p_platform VARCHAR(20),
    p_platform_user_id VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
    v_thread_id UUID;
BEGIN
    SELECT id INTO v_thread_id
    FROM conversation_threads
    WHERE company_id = p_company_id AND platform = p_platform AND platform_user_id = p_platform_user_id;

    IF v_thread_id IS NULL THEN
        INSERT INTO conversation_threads (company_id, platform, platform_user_id)
        VALUES (p_company_id, p_platform, p_platform_user_id)
        RETURNING id INTO v_thread_id;
    END IF;

    RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;
