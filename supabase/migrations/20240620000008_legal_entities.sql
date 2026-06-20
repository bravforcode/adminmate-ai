-- RELEASE 1B — Legal Entities + Sub-tables
-- All company_id. No organization_id.

-- ============== LEGAL_ENTITIES ==============
CREATE TABLE IF NOT EXISTS legal_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    country_code VARCHAR(10) NOT NULL,
    default_currency VARCHAR(3) NOT NULL,
    default_timezone VARCHAR(100) NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== ENTITY_ADDRESSES ==============
CREATE TABLE IF NOT EXISTS entity_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    legal_entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
    address_type VARCHAR(30) NOT NULL CHECK (address_type IN ('registered', 'office', 'payroll', 'billing')),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country_code VARCHAR(10) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== ENTITY_REGISTRATION_NUMBERS ==============
CREATE TABLE IF NOT EXISTS entity_registration_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    legal_entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
    registration_type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== ENTITY_TAX_PROFILES ==============
CREATE TABLE IF NOT EXISTS entity_tax_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    legal_entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
    country_code VARCHAR(10) NOT NULL,
    tax_registration_number VARCHAR(100),
    social_security_registration_number VARCHAR(100),
    payroll_country_pack VARCHAR(50),
    compliance_country_pack VARCHAR(50),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_legal_entities_company ON legal_entities(company_id);
CREATE INDEX IF NOT EXISTS idx_legal_entities_country ON legal_entities(country_code);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_entity ON entity_addresses(legal_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_reg_numbers_entity ON entity_registration_numbers(legal_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tax_profiles_entity ON entity_tax_profiles(legal_entity_id);

-- ============== RLS ==============
ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_registration_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_entities_company_scoped" ON legal_entities FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY "entity_addresses_company_scoped" ON entity_addresses FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY "entity_reg_numbers_company_scoped" ON entity_registration_numbers FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY "entity_tax_profiles_company_scoped" ON entity_tax_profiles FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

-- ============== AUDIT TRIGGER ==============
CREATE OR REPLACE FUNCTION audit_legal_entity_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_legal_entities
  AFTER INSERT OR UPDATE OR DELETE ON legal_entities
  FOR EACH ROW EXECUTE FUNCTION audit_legal_entity_changes();
