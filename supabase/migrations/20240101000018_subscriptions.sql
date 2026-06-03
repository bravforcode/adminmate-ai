CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) UNIQUE,
    tier VARCHAR(20) DEFAULT 'free',
    max_employees INTEGER DEFAULT 10,
    max_active_jobs INTEGER DEFAULT 3,
    max_ai_calls_per_day INTEGER DEFAULT 20,
    features JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
