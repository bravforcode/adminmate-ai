-- ============================================================
-- Release 8B: Workforce Scheduling & Shift Marketplace
-- 7 tables: templates, schedules, assignments, availability,
-- staffing requirements, shift swaps, overtime requests
-- ============================================================

-- 1. Shift Templates
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60 CHECK (break_minutes >= 0),
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY st_read ON shift_templates FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY st_insert ON shift_templates FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY st_update ON shift_templates FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_st_company ON shift_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_st_active ON shift_templates(company_id, is_active);

CREATE TRIGGER update_st_updated_at BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Shift Schedules
CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY ss_read ON shift_schedules FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ss_insert ON shift_schedules FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ss_update ON shift_schedules FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ss_company ON shift_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_ss_dates ON shift_schedules(company_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ss_status ON shift_schedules(company_id, status);

CREATE TRIGGER update_ss_updated_at BEFORE UPDATE ON shift_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Shift Assignments
CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES shift_schedules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  shift_template_id UUID NOT NULL REFERENCES shift_templates(id),
  work_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed', 'absent', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY sa_read ON shift_assignments FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sa_insert ON shift_assignments FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY sa_update ON shift_assignments FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_sa_company ON shift_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_sa_schedule ON shift_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_sa_employee ON shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_sa_date ON shift_assignments(company_id, work_date);
CREATE UNIQUE INDEX idx_sa_no_overlap ON shift_assignments(employee_id, work_date) WHERE status != 'cancelled';

CREATE TRIGGER update_sa_updated_at BEFORE UPDATE ON shift_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Employee Availability
CREATE TABLE IF NOT EXISTS employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  available_from TIME NOT NULL,
  available_to TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY ea_read ON employee_availability FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ea_insert ON employee_availability FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ea_update ON employee_availability FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ea_company ON employee_availability(company_id);
CREATE INDEX IF NOT EXISTS idx_ea_employee ON employee_availability(employee_id);
CREATE UNIQUE INDEX idx_ea_emp_day ON employee_availability(employee_id, day_of_week);

CREATE TRIGGER update_ea_updated_at BEFORE UPDATE ON employee_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Staffing Requirements
CREATE TABLE IF NOT EXISTS staffing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL,
  shift_template_id UUID NOT NULL REFERENCES shift_templates(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  min_staff INTEGER DEFAULT 1 CHECK (min_staff >= 1),
  max_staff INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staffing_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY sr_read ON staffing_requirements FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sr_insert ON staffing_requirements FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY sr_update ON staffing_requirements FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_sr_company ON staffing_requirements(company_id);
CREATE INDEX IF NOT EXISTS idx_sr_location ON staffing_requirements(location_id);
CREATE INDEX IF NOT EXISTS idx_sr_template ON staffing_requirements(shift_template_id);
CREATE UNIQUE INDEX idx_sr_loc_shift_day ON staffing_requirements(location_id, shift_template_id, day_of_week);

CREATE TRIGGER update_sr_updated_at BEFORE UPDATE ON staffing_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Shift Swap Requests
CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requester_assignment_id UUID NOT NULL REFERENCES shift_assignments(id),
  target_assignment_id UUID REFERENCES shift_assignments(id),
  requester_id UUID NOT NULL,
  target_id UUID,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY sss_read ON shift_swap_requests FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sss_insert ON shift_swap_requests FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY sss_update ON shift_swap_requests FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_sss_company ON shift_swap_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_sss_requester ON shift_swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_sss_status ON shift_swap_requests(company_id, status);

CREATE TRIGGER update_sss_updated_at BEFORE UPDATE ON shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Overtime Requests
CREATE TABLE IF NOT EXISTS overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  request_date DATE NOT NULL,
  hours NUMERIC(4,2) NOT NULL CHECK (hours > 0),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY ot_read ON overtime_requests FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ot_insert ON overtime_requests FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ot_update ON overtime_requests FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_oreq_company ON overtime_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_ot_employee ON overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_ot_status ON overtime_requests(company_id, status);

CREATE TRIGGER update_ot_updated_at BEFORE UPDATE ON overtime_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RBAC: schedule permissions
-- ============================================================
INSERT INTO permissions (resource, action, display_name) VALUES
  ('schedule', 'read',   'View schedules and shift templates'),
  ('schedule', 'write',  'Create/edit schedules and assignments'),
  ('schedule', 'approve','Approve shift swaps and overtime requests')
ON CONFLICT (resource, action) DO NOTHING;

-- Owner gets everything (already covered by wildcard)

-- Admin gets schedule permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'schedule';

-- HR Manager gets schedule read/write/approve
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'schedule';

-- HR Staff gets schedule read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'schedule' AND p.action IN ('read', 'write');

-- Manager gets schedule read/write/approve
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'schedule';

-- Employee gets schedule read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'schedule' AND p.action = 'read';

-- ============================================================
-- Audit trigger for schedule-sensitive actions
-- ============================================================
CREATE OR REPLACE FUNCTION log_schedule_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('operation', TG_OP, 'ts', NOW())
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_shift_swap_requests
  AFTER INSERT OR UPDATE OR DELETE ON shift_swap_requests
  FOR EACH ROW EXECUTE FUNCTION log_schedule_audit();

CREATE TRIGGER audit_overtime_requests
  AFTER INSERT OR UPDATE OR DELETE ON overtime_requests
  FOR EACH ROW EXECUTE FUNCTION log_schedule_audit();
