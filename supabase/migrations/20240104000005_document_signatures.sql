CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255) NOT NULL,
    signature_data TEXT,
    signed_at TIMESTAMPTZ,
    ip_address INET,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
    decline_reason TEXT,
    verification_token VARCHAR(64) UNIQUE DEFAULT md5(random()::text || clock_timestamp()::text),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_sigs_document_id ON document_signatures(document_id);
CREATE INDEX idx_doc_sigs_company_id ON document_signatures(company_id);
CREATE INDEX idx_doc_sigs_status ON document_signatures(status);
CREATE INDEX idx_doc_sigs_verification_token ON document_signatures(verification_token);

ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_sigs_read_company" ON document_signatures
    FOR SELECT USING (
        company_id = get_user_company_id()
        OR signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "doc_sigs_admin_write" ON document_signatures
    FOR ALL USING (
        company_id = get_user_company_id() AND is_admin_or_hr()
    );

CREATE POLICY "doc_sigs_signer_update" ON document_signatures
    FOR UPDATE USING (
        signer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND status = 'pending'
    );

CREATE OR REPLACE FUNCTION update_document_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_doc_sigs_updated_at
    BEFORE UPDATE ON document_signatures
    FOR EACH ROW EXECUTE FUNCTION update_document_signatures_updated_at();
