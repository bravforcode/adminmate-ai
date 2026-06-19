-- RELEASE 1B — Org Hierarchy
-- business_units, cost_centers, locations, departments, teams, reporting_lines.
-- All company_id. No organization_id.

-- ============== BUSINESS_UNITS ==============
CREATE TABLE business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    legal_entity_id UUID REFERENCES legal_entities(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== COST_CENTERS ==============
CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    legal_entity_id UUID REFERENCES legal_entities(id) ON DELETE SET NULL,
    business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== LOCATIONS ==============
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    legal_entity_id UUID REFERENCES legal_entities(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    location_type VARCHAR(30) DEFAULT 'office' CHECK (location_type IN ('office', 'branch', 'store', 'factory', 'warehouse', 'remote')),
    country_code VARCHAR(10) NOT NULL,
    timezone VARCHAR(100),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== DEPARTMENTS ==============
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    legal_entity_id UUID REFERENCES legal_entities(id) ON DELETE SET NULL,
    business_unit_id UUID REFERENCES business_units(id) ON DELETE SET NULL,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== TEAMS ==============
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== REPORTING_LINES ==============
CREATE TABLE reporting_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) DEFAULT 'direct' CHECK (relationship_type IN ('direct', 'functional', 'dotted_line')),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_user_id, manager_user_id, relationship_type)
);

-- ============== INDEXES ==============
CREATE INDEX idx_business_units_company ON business_units(company_id);
CREATE INDEX idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX idx_cost_centers_bu ON cost_centers(business_unit_id);
CREATE INDEX idx_locations_company ON locations(company_id);
CREATE INDEX idx_locations_entity ON locations(legal_entity_id);
CREATE INDEX idx_departments_company ON departments(company_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_bu ON departments(business_unit_id);
CREATE INDEX idx_teams_company ON teams(company_id);
CREATE INDEX idx_teams_department ON teams(department_id);
CREATE INDEX idx_teams_manager ON teams(manager_user_id);
CREATE INDEX idx_reporting_lines_company ON reporting_lines(company_id);
CREATE INDEX idx_reporting_lines_employee ON reporting_lines(employee_user_id);
CREATE INDEX idx_reporting_lines_manager ON reporting_lines(manager_user_id);

-- ============== RLS ==============
ALTER TABLE business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_units_company_scoped" ON business_units FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY "cost_centers_company_scoped" ON cost_centers FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY "locations_company_scoped" ON locations FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY "departments_company_scoped" ON departments FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY "teams_company_scoped" ON teams FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY "reporting_lines_company_scoped" ON reporting_lines FOR ALL TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

-- ============== AUDIT TRIGGERS ==============
-- ponytail: one trigger fn reused across all org tables
CREATE OR REPLACE FUNCTION audit_org_structure_changes()
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

CREATE TRIGGER audit_business_units AFTER INSERT OR UPDATE OR DELETE ON business_units FOR EACH ROW EXECUTE FUNCTION audit_org_structure_changes();
CREATE TRIGGER audit_cost_centers AFTER INSERT OR UPDATE OR DELETE ON cost_centers FOR EACH ROW EXECUTE FUNCTION audit_org_structure_changes();
CREATE TRIGGER audit_locations AFTER INSERT OR UPDATE OR DELETE ON locations FOR EACH ROW EXECUTE FUNCTION audit_org_structure_changes();
CREATE TRIGGER audit_departments AFTER INSERT OR UPDATE OR DELETE ON departments FOR EACH ROW EXECUTE FUNCTION audit_org_structure_changes();
CREATE TRIGGER audit_teams AFTER INSERT OR UPDATE OR DELETE ON teams FOR EACH ROW EXECUTE FUNCTION audit_org_structure_changes();
CREATE TRIGGER audit_reporting_lines AFTER INSERT OR UPDATE OR DELETE ON reporting_lines FOR EACH ROW EXECUTE FUNCTION audit_org_structure_changes();
