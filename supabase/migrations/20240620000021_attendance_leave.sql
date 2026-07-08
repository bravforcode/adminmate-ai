-- ============================================================
-- Release 8: Attendance + Leave Core
-- Clock-in/out, corrections, leave requests, balances,
-- holiday calendars.
-- ============================================================

-- 1. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  work_date DATE NOT NULL,
  hours_worked NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE WHEN check_out IS NOT NULL THEN EXTRACT(EPOCH FROM (check_out - check_in)) / 3600 END
  ) STORED,
  overtime_hours NUMERIC(6,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'present',
  location_data JSONB,
  method VARCHAR(20) DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY att_read ON attendance_records FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY att_insert ON attendance_records FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY att_update ON attendance_records FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_att_company ON attendance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_att_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_work_date ON attendance_records(work_date);
CREATE INDEX IF NOT EXISTS idx_att_company_date ON attendance_records(company_id, work_date);

CREATE TRIGGER update_att_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Attendance Corrections
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES user_profiles(id),
  original_check_in TIMESTAMPTZ NOT NULL,
  original_check_out TIMESTAMPTZ,
  corrected_check_in TIMESTAMPTZ NOT NULL,
  corrected_check_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY att_corr_read ON attendance_corrections FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY att_corr_insert ON attendance_corrections FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY att_corr_update ON attendance_corrections FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_att_corr_company ON attendance_corrections(company_id);
CREATE INDEX IF NOT EXISTS idx_att_corr_record ON attendance_corrections(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_att_corr_status ON attendance_corrections(status);

CREATE TRIGGER update_att_corr_updated_at BEFORE UPDATE ON attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100),
  code VARCHAR(30) NOT NULL,
  description TEXT,
  is_paid BOOLEAN DEFAULT true,
  max_days_per_year INTEGER NOT NULL,
  carry_over_enabled BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY lt_read ON leave_types FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY lt_insert ON leave_types FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY lt_update ON leave_types FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_lt_company ON leave_types(company_id);
CREATE INDEX IF NOT EXISTS idx_lt_code ON leave_types(company_id, code);

CREATE TRIGGER update_lt_updated_at BEFORE UPDATE ON leave_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days NUMERIC(6,2) DEFAULT 0,
  used_days NUMERIC(6,2) DEFAULT 0,
  pending_days NUMERIC(6,2) DEFAULT 0,
  carried_over_days NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id, leave_type_id, year)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY lb_read ON leave_balances FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY lb_insert ON leave_balances FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY lb_update ON leave_balances FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_lb_company ON leave_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_lb_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_lb_type ON leave_balances(leave_type_id);

CREATE TRIGGER update_lb_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(6,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date),
  CHECK (total_days > 0)
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY lr_read ON leave_requests FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY lr_insert ON leave_requests FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY lr_update ON leave_requests FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_lr_company ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_lr_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_lr_type ON leave_requests(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_lr_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_lr_dates ON leave_requests(start_date, end_date);

CREATE TRIGGER update_lr_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Holiday Calendars
CREATE TABLE IF NOT EXISTS holiday_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  country_code VARCHAR(10) NOT NULL DEFAULT 'TH',
  year INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, year, country_code)
);

ALTER TABLE holiday_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY hc_read ON holiday_calendars FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY hc_insert ON holiday_calendars FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY hc_update ON holiday_calendars FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_hc_company ON holiday_calendars(company_id);
CREATE INDEX IF NOT EXISTS idx_hc_year ON holiday_calendars(company_id, year);

CREATE TRIGGER update_hc_updated_at BEFORE UPDATE ON holiday_calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Holiday Calendar Days
CREATE TABLE IF NOT EXISTS holiday_calendar_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES holiday_calendars(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100),
  type VARCHAR(30) DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_id, holiday_date)
);

ALTER TABLE holiday_calendar_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY hcd_read ON holiday_calendar_days FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY hcd_insert ON holiday_calendar_days FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY hcd_delete ON holiday_calendar_days FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_hcd_company ON holiday_calendar_days(company_id);
CREATE INDEX IF NOT EXISTS idx_hcd_calendar ON holiday_calendar_days(calendar_id);
CREATE INDEX IF NOT EXISTS idx_hcd_date ON holiday_calendar_days(holiday_date);

-- 8. RBAC: add leave_approve permission
INSERT INTO permissions (resource, action, display_name) VALUES
  ('leave', 'approve', 'Approve leave requests')
ON CONFLICT (resource, action) DO NOTHING;

-- Map to manager, hr_manager, admin, owner
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE p.resource = 'leave' AND p.action = 'approve'
  AND r.name IN ('owner', 'admin', 'hr_manager', 'manager')
ON CONFLICT DO NOTHING;

-- 9. Seed default leave types for each existing company
DO $$
DECLARE
  comp RECORD;
BEGIN
  FOR comp IN SELECT id FROM companies
  LOOP
    INSERT INTO leave_types (company_id, name, name_th, code, description, is_paid, max_days_per_year, carry_over_enabled, requires_approval)
    SELECT comp.id, v.name, v.name_th, v.code, v.description, v.is_paid, v.max_days, v.carry_over, v.requires_approval
    FROM (VALUES
      ('Annual Leave',         'ลากิจ',          'annual_leave',   'Paid annual leave',            true,  15, false, true),
      ('Sick Leave',           'ลาป่วย',         'sick_leave',     'Medical leave',                true,  30, false, false),
      ('Personal Leave',       'ลากิจส่วนตัว',    'personal_leave', 'Personal affairs leave',       true,   3, false, true),
      ('Maternity Leave',      'ลาคลอด',         'maternity_leave','Maternity leave',              true,  90, false, false),
      ('Unpaid Leave',         'ลาไม่รับค่าจ้าง',  'unpaid_leave',   'Unpaid leave',                 false,  0, false, true),
      ('Ordination Leave',     'ลาบวช',          'ordination_leave','Buddhist ordination leave',   true,  15, false, false)
    ) AS v(name, name_th, code, description, is_paid, max_days, carry_over, requires_approval)
    WHERE NOT EXISTS (
      SELECT 1 FROM leave_types WHERE company_id = comp.id AND code = v.code
    );
  END LOOP;
END $$;
