-- E-Signature Audit Trail tables
-- Legal compliance for Thai Electronic Transactions Act (พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์)

-- E-Signature audit log
CREATE TABLE IF NOT EXISTS esignature_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES esignature_requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'signed', 'declined')),
  signature_storage_path TEXT,
  ip_address TEXT,
  user_agent TEXT,
  signer_name TEXT,
  signer_email TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_esignature_audit_request ON esignature_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_esignature_audit_company ON esignature_audit_log(company_id);

-- RLS policies
ALTER TABLE esignature_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esignature_audit_company_isolation" ON esignature_audit_log
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Ensure audit log is append-only (no updates/deletes)
CREATE OR REPLACE FUNCTION prevent_esignature_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'E-signature audit log entries cannot be modified or deleted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_esignature_audit_immutable
  BEFORE UPDATE OR DELETE ON esignature_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_esignature_audit_modification();
