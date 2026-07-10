-- Earned Wage Access (EWA) tables
-- ⚠️ LEGAL REVIEW REQUIRED BEFORE PRODUCTION USE
-- May be subject to BOT (Bank of Thailand) financial regulations

-- Company EWA configuration
CREATE TABLE IF NOT EXISTS company_ewa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT false,
  max_percentage NUMERIC(5,2) DEFAULT 50.00,
  fee_percentage NUMERIC(5,2) DEFAULT 1.50,
  min_withdrawal NUMERIC(12,2) DEFAULT 100.00,
  max_withdrawals_per_period INT DEFAULT 3,
  payment_method TEXT DEFAULT 'promptpay' CHECK (payment_method IN ('promptpay', 'bank_transfer')),
  legal_review_completed BOOLEAN DEFAULT false,
  legal_review_date DATE,
  legal_review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EWA withdrawal records
CREATE TABLE IF NOT EXISTS ewa_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES user_profiles(id),
  amount NUMERIC(12,2) NOT NULL,
  fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('promptpay', 'bank_transfer')),
  payment_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ewa_withdrawals_employee ON ewa_withdrawals(employee_id);
CREATE INDEX IF NOT EXISTS idx_ewa_withdrawals_company ON ewa_withdrawals(company_id);
CREATE INDEX IF NOT EXISTS idx_ewa_withdrawals_status ON ewa_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_ewa_withdrawals_period ON ewa_withdrawals(company_id, employee_id, created_at);

-- RLS policies
ALTER TABLE company_ewa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ewa_withdrawals ENABLE ROW LEVEL SECURITY;

-- Company isolation
CREATE POLICY "ewa_config_company_isolation" ON company_ewa_config
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "ewa_withdrawals_company_isolation" ON ewa_withdrawals
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Employee can view own withdrawals
CREATE POLICY "ewa_withdrawals_employee_read" ON ewa_withdrawals
  FOR SELECT USING (employee_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ewa_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ewa_config_updated_at
  BEFORE UPDATE ON company_ewa_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ewa_config_updated_at();
