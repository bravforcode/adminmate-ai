CREATE TABLE report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'hiring_summary', 'pipeline_analysis', 'time_to_hire',
        'source_effectiveness', 'onboarding_progress'
    )),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    recipients UUID[] DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    format VARCHAR(10) DEFAULT 'html' CHECK (format IN ('html', 'csv', 'pdf')),
    date_from TIMESTAMPTZ,
    date_to TIMESTAMPTZ,
    generated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_schedules_company ON report_schedules(company_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_enabled = true;
CREATE INDEX idx_generated_reports_company ON generated_reports(company_id);
CREATE INDEX idx_generated_reports_schedule ON generated_reports(schedule_id);

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_schedules_read" ON report_schedules FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "report_schedules_write" ON report_schedules FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated_reports_read" ON generated_reports FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "generated_reports_write" ON generated_reports FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());
