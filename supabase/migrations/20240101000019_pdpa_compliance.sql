CREATE TABLE pdpa_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    candidate_id UUID REFERENCES candidates(id),
    employee_id UUID REFERENCES user_profiles(id),
    data_subject_email VARCHAR(255) NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    purposes TEXT[] NOT NULL,
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_withdrawn_at TIMESTAMPTZ,
    consent_form_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    requester_email VARCHAR(255) NOT NULL,
    request_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES user_profiles(id),
    notes TEXT
);
