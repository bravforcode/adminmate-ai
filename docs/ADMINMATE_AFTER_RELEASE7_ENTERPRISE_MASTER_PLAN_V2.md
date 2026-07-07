# AdminMate AI — Master Plan หลัง Release 7

**Version:** v2 — Enterprise Production Roadmap หลัง HRIS Core
**วันที่จัดทำ:** 2026-06-20
**Last updated:** 2026-06-22
**ใช้สำหรับ:** ส่งให้ Codex 5.5 / AI coding agent / auditor ใช้รันต่อแบบเป็น release train
**สถานะปัจจุบัน:** Gates A–H + Feature Releases complete. Gate L (Lifecycle Governance) in planning.

---

## 0. สรุปสถานะปัจจุบัน

ระบบ AdminMate AI ตอนนี้มีแกนหลักของ HR platform แล้ว + enterprise foundation:

```text
Core HR Platform (Complete):
→ Recruiting → Candidate Portal → AI Recruiting → Hiring
→ Messaging Approval → Onboarding → Documents → Contracts → E-Signature
→ HRIS Core → Employee Directory → Org Chart
→ Offboarding → Asset Return → Access Revocation → Exit Interview

Enterprise Foundation (Complete):
→ Gate A: Tenant Isolation & RLS (8 releases)
→ Gate B: Platform Foundation (10 releases)
→ Gate C: Configuration & Demo (8 releases)
→ Gate D: Observability & Recovery (12 releases)
→ Gate E: Quality & E2E (12 releases)
→ Gate F: Provider & Integration (14 releases)

HR Suite (Complete):
→ 26 modules: Benefits, L&D, Engagement, Compensation, Contractor, etc.

Thailand Validation (Complete):
→ Gate H: 10 releases covering compliance, legal, payroll, privacy

Lifecycle Governance (Planning):
→ Gate L: 6 releases (32A–32F) for operational maturity
```

สิ่งที่มีแล้วถือว่าเป็นฐานที่ดีมาก แต่ยังไม่ใช่ full enterprise HR platform เพราะยังขาด:

1. **Pending feature modules** — Attendance, Payroll, Data Import/Export, Performance, Internal Mobility, Compliance, Billing, Analytics, Integrations
2. **Lifecycle Governance (Gate L)** — Continuous security monitoring, policy review, DR exercises, provider governance, quality regression, annual review
3. **Operational maturity** — Automated monitoring, governance workflows, compliance frameworks

---

## 1. หลักการทำงานหลัง Release 7

### 1.1 Non-negotiable rules

ทุก release ต่อจากนี้ต้องทำตามกฎเหล่านี้:

- ห้ามแตะ `.env`, `.env.local`, `.env.production`
- ห้าม deploy
- ห้าม push ถ้าไม่ได้รับอนุมัติ
- ใช้ `company_id` เท่านั้น ห้ามสร้าง `organization_id`
- ทุก tenant-owned table ต้องมี `company_id`
- ทุก sensitive table ต้องมี RLS
- ทุก sensitive action ต้องมี audit log
- ห้าม fake integration
- ห้าม fake payroll calculation
- ห้าม fake compliance
- ห้าม auto-send message
- ห้าม auto-approve / auto-reject / auto-terminate
- AI เป็นผู้ช่วย ไม่ใช่ผู้ตัดสิน
- ข้อมูล sensitive ต้องถูก exclude จาก AI scoring และ predictive analytics
- ถ้า provider credentials ไม่มี ต้องแสดง `NeedsConfiguration` / disabled state
- ทุก release ต้องมี tests และ docs update

### 1.2 Stack จริงที่ต้องยึด

```text
Vite 6.4
React 19
React Router v7
TypeScript 5.8
Tailwind v4 CSS-based config
Supabase Auth / PostgreSQL / Storage
Raw SQL migrations
company_id tenant key
```

ห้ามให้ Codex สร้างโค้ดแบบ Next.js / Prisma / Tailwind v3 เพราะไม่ตรง repo จริง

### 1.3 Definition of Done ทุก release

Release จะถือว่าผ่านได้เมื่อ:

- migration apply ได้ตามลำดับ
- RLS ครบทุก table ใหม่
- service layer มี permission checks
- UI มี loading / empty / error / permission denied / needs configuration state
- tests ใหม่ผ่าน
- tests เดิมไม่ regress
- `npm run type-check` ผ่าน
- `npm run lint` ไม่มี error ใหม่
- `npm run build` ผ่าน
- `npm test -- --run` ผ่านโดยเหลือเฉพาะ 9 failures เดิมหรือน้อยกว่า
- docs update: `IMPLEMENTATION_REPORT.md`, `docs/phase-ledger.md`, `docs/security-baseline.md`, `docs/release-dependency-map.md`, `docs/adminmate-roadmap.md`

---

## 2. ลำดับ Release ที่แนะนำหลัง Release 7

ลำดับนี้ออกแบบให้ “ขายได้จริงกับ SME ไทย” และ “ไม่ปิดประตู enterprise/global”

| Priority | Release | เหตุผล |
|---:|---|---|
| 1 | Release 7B — Global Mobility | รองรับ global-ready, visa/work permit, remote work, travel compliance |
| 2 | Release 8 — Attendance + Leave | ใช้งานจริงกับ SME ไทย, ร้านค้า, โรงงาน, clinic |
| 3 | Release 8B — Workforce Scheduling | สำคัญกับ frontline/shift workforce |
| 4 | Release 9A — Thailand Payroll Pack | ทำให้ระบบมี value สูงสุดและเก็บเงินได้มากขึ้น |
| 5 | Release 9B — Global Payroll Framework | เตรียม multi-country expansion |
| 6 | Release 9C — Data Import/Export | ย้ายลูกค้าจริงเข้าระบบได้ง่าย |
| 7 | Release 9D — Statutory Filing | ต่อ payroll/compliance ให้แข็งแรง |
| 8 | Release 10 — Performance | ใช้กับ HRIS ต่อเนื่อง |
| 9 | Release 10B — Internal Mobility | ทำให้ระบบเป็น talent platform |
| 10 | Release 11 — Compliance | ปิด risk ด้าน PDPA/GDPR/แรงงาน |
| 11 | Release 12 — Billing | เริ่ม monetize SaaS จริง |
| 12 | Release 12B — Platform Admin | ทีม AdminMate support ลูกค้าได้ |
| 13 | Release 13 — Analytics | ทำให้ผู้บริหารเห็น value |
| 14 | Release 13B — People Analytics | predictive แต่ต้องระวัง bias |
| 15 | Release 14 — Integrations | เชื่อม ecosystem |
| 16 | Release 15–19B | Full suite: benefits, L&D, engagement, asset/expense, compensation, contractor |
| 17 | Release 20–24 | Platform/API/AI assistant/enterprise security/DR/final hardening |

---

# Phase A — Global Workforce + Time Operations

---

## Release 7B — Global Mobility, Visa & Work Permit Tracking

### Goal

สร้างโมดูลสำหรับจัดการพนักงานที่ทำงานข้ามประเทศ, visa, work permit, business travel, remote work compliance, global assignment และ EOR relationship

Global mobility ในปี 2026 มีความเสี่ยงเพิ่มจาก digital border systems, tax/social security scrutiny และ business travel ที่กลับมามากขึ้น ระบบจึงต้อง tracking และ audit ได้ตั้งแต่ต้น ไม่ใช่แค่เก็บเอกสารเฉย ๆ

### Dependencies

- Release 1B legal entities
- Release 6 documents
- Release 7 employees
- Release 5 messaging approval
- Release 11 compliance จะมาต่อยอดภายหลัง

### Scope

#### A. Immigration case management

สร้างเคส immigration/work permit สำหรับ employee หรือ candidate ที่กำลังจะ hire:

- visa application
- work permit
- renewal
- transfer
- dependent visa
- business visitor classification
- remote work authorization
- EOR sponsorship

#### B. Business travel approval

ระบบ pre-travel approval:

- destination country
- travel dates
- purpose
- planned activities
- host entity
- inviter/contact person
- estimated working days
- allowed / risky activities
- required document checklist
- HR/global mobility approval

#### C. Day-count tracking

เตรียมข้อมูลสำหรับ tax/social security risk:

- country days per employee
- rolling 90/180 day windows
- work vs visitor activity
- remote work country
- payroll country vs work country

#### D. Visa/work permit expiry alerts

- configurable reminders: 180/90/60/30/14/7 days
- HR + employee notifications
- messaging drafts only, no auto-send
- escalation if overdue

#### E. EOR provider tracking

- EOR provider registry
- sponsored worker records
- provider contract documents
- contract expiry
- fee schedule
- worker country
- service status

### Database tables

Create or extend:

```sql
immigration_case_types
immigration_cases
visa_applications
work_permits
immigration_documents
business_travel_requests
business_travel_day_counts
global_assignments
eor_providers
eor_worker_engagements
mobility_alerts
mobility_country_rules
```

All tables:

- `company_id` required
- RLS enabled
- employee/candidate references nullable where appropriate
- audit every sensitive view/write

### Critical fields

`immigration_cases`:

- id
- company_id
- employee_id nullable
- candidate_id nullable
- legal_entity_id nullable
- case_type
- destination_country_code
- home_country_code
- status: draft / pending_documents / submitted / in_review / approved / rejected / expired / cancelled
- priority
- assigned_to
- opened_at
- target_start_date
- expiry_date nullable
- created_by
- created_at
- updated_at

`work_permits`:

- id
- company_id
- employee_id
- country_code
- permit_type
- permit_number encrypted/masked if needed
- status
- valid_from
- valid_until
- renewal_required boolean
- document_id nullable

`business_travel_requests`:

- id
- company_id
- employee_id
- destination_country_code
- start_date
- end_date
- activity_type
- risk_level: low / medium / high / unknown
- approval_status
- approved_by nullable
- compliance_notes

### Services

- `mobilityCaseService`
- `workPermitService`
- `visaApplicationService`
- `businessTravelService`
- `dayCountService`
- `eorProviderService`
- `mobilityAlertService`

Required methods:

- createMobilityCase(employeeId, input)
- getMobilityCase(caseId)
- listMobilityCases(filters)
- requestImmigrationDocuments(caseId)
- uploadImmigrationDocument(caseId, document)
- updateCaseStatus(caseId, status, reason?)
- createBusinessTravelRequest(employeeId, input)
- approveBusinessTravelRequest(requestId)
- rejectBusinessTravelRequest(requestId, reason)
- calculateCountryDayCounts(employeeId, countryCode, period)
- generateVisaExpiryAlerts()

### UI

- Mobility Dashboard
- Immigration Case Detail
- Visa/Permit Expiry Calendar
- Business Travel Request Form
- Employee Mobility Tab
- EOR Providers Settings
- Country Rules Settings

### Permissions

- mobility:read
- mobility:write
- mobility:approve
- mobility:document_read
- mobility:document_write
- mobility:eor_manage
- mobility:export

Role mapping:

- owner/admin/hr_manager: all
- hr_staff: read/write limited
- manager: view assigned employee travel if permissioned
- employee: own travel/case summary only
- auditor: read only

### Tests

- cannot access mobility case across company
- employee can only see own mobility summary
- visa expiry alert generated correctly
- travel request requires destination/date/purpose
- high-risk travel needs HR approval
- day-count calculation respects date range
- EOR provider secrets/credentials not exposed
- AI checklist excludes sensitive scoring data

### Acceptance criteria

- Mobility cases can be created and tracked
- Visa/work permit expiry alerts work
- Business travel approval flow works
- Employee view is safe
- RLS works
- No auto-approval
- No legal claim that system guarantees immigration compliance

---

## Release 8 — Attendance + Leave Core

### Goal

สร้างระบบบันทึกเวลาเข้าออกและระบบลางานที่ใช้จริงได้สำหรับ SME ไทยและรองรับ multi-country leave policy ในอนาคต

### Dependencies

- Release 7 employees
- Release 1B locations/legal entities
- Release 5 messaging approval
- Release 9A payroll will consume outputs

### Scope

#### A. Attendance

- manual attendance
- web check-in/check-out
- mobile GPS check-in
- QR check-in
- reason for late/early leave
- attendance correction request
- HR approval for correction
- timezone-aware records

#### B. Leave

- leave types
- leave policies
- leave balances
- leave requests
- manager/HR approval
- leave calendar
- leave conflict detection
- leave accrual
- carry-over
- public holidays

#### C. Thai starter leave pack

Seed starter template, must be editable:

- annual leave
- sick leave
- personal/business leave
- maternity leave
- ordination leave if company enables
- unpaid leave
- custom leave

Do not claim legal completeness; label as starter requiring HR/legal review.

### Database tables

```sql
attendance_methods
attendance_records
attendance_corrections
leave_types
leave_policies
leave_policy_rules
leave_balances
leave_requests
leave_approvals
holiday_calendars
holiday_calendar_days
company_holiday_overrides
```

### Services

- `attendanceService`
- `attendanceCorrectionService`
- `leavePolicyService`
- `leaveRequestService`
- `leaveBalanceService`
- `holidayCalendarService`

### UI

- Attendance Dashboard
- Employee Check-in Page
- Leave Request Page
- Leave Calendar
- Manager Approval Queue
- HR Attendance Review
- Leave Policy Settings

### Rules

- client-provided location is untrusted; store metadata but mark confidence
- employee cannot edit attendance directly
- correction requires approval
- leave approval must respect manager hierarchy
- leave balance cannot go negative unless policy allows
- payroll must consume approved attendance/leave only

### Tests

- employee check-in creates record scoped by company
- cannot check in for another employee
- correction requires reason
- leave request reduces available balance only after approval or reserved state
- manager sees only direct reports
- holiday calendar excludes public holidays from leave days
- overlapping leave detected
- RLS isolation

### Acceptance criteria

- Attendance works for employee
- Leave request/approval works
- Leave balances update correctly
- Thailand starter leave policy seeded
- Holiday calendar foundation exists
- Payroll-ready approved outputs exist

---

## Release 8B — Workforce Scheduling + Shift Marketplace

### Goal

รองรับธุรกิจ frontline/shift เช่น ร้านอาหาร, retail, warehouse, factory, clinic ด้วยตารางกะ, rota, OT, shift swap และ coverage planning

### Scope

- shift templates
- shift scheduling
- recurring roster
- employee availability
- minimum staffing requirement
- shift swap requests
- open shift bidding
- overtime approval
- attendance-vs-schedule variance

### Database tables

```sql
shift_templates
shift_schedules
shift_assignments
employee_availability
staffing_requirements
shift_swap_requests
open_shift_bids
overtime_rules
overtime_requests
schedule_publish_events
```

### Services

- `shiftTemplateService`
- `shiftScheduleService`
- `rosterService`
- `shiftSwapService`
- `overtimeService`
- `coverageService`

### UI

- Roster Calendar
- Shift Builder
- Employee Availability Page
- Shift Swap Approval Queue
- Overtime Review Page
- Coverage Warnings Dashboard

### Tests

- no overlapping shift assignment
- employee availability respected
- shift swap needs manager approval
- overtime request needs approval
- attendance variance calculated
- multi-location timezone test
- RLS isolation

### Acceptance criteria

- Shift schedule can be created/published
- Employee can see own shifts
- Manager can approve swap/OT
- Attendance can match scheduled shift
- Payroll-ready overtime outputs exist but payroll calculation not done here

---

# Phase B — Payroll + Data Operations

---

## Release 9A — Thailand Payroll Pack

### Goal

สร้าง payroll engine สำหรับประเทศไทยแบบ production-grade, versioned rules, audit-heavy, approval workflow, payslip และ bank export foundation

### Warning

Payroll เป็น high-risk module ห้าม fake calculation. ถ้ากฎใดไม่แน่ใจ ต้อง mark ว่า `requires_accounting_review` และสร้าง test fixture แยก ไม่ claim ว่าถูกกฎหมายสมบูรณ์

### Scope

- payroll cycles
- salary structures
- recurring earnings/deductions
- one-time adjustments
- OT/leave integration
- tax rule versioning
- social security rule versioning
- payroll draft
- payroll approval
- payslip generation
- employee payslip portal
- bank export adapter
- offboarding final settlement readiness handoff

### Database tables

```sql
payroll_cycles
payroll_employee_snapshots
salary_structures
salary_components
payroll_runs
payroll_run_items
payroll_adjustments
payroll_approvals
payslips
payroll_bank_exports
th_payroll_rule_versions
th_tax_brackets
th_social_security_rules
payroll_audit_events
```

### Services

- `payrollCycleService`
- `salaryStructureService`
- `thPayrollCalculationService`
- `payrollRunService`
- `payslipService`
- `bankExportService`
- `payrollApprovalService`

### UI

- Payroll Dashboard
- Payroll Cycle Setup
- Salary Structure Page
- Payroll Run Detail
- Employee Payslip View
- Payroll Approval Queue
- Bank Export Page

### Tests

- salary component effective dates
- approved leave affects payroll input
- OT input included but formula versioned
- payroll draft cannot be paid
- payroll requires approval
- payslip access limited to employee/self + payroll roles
- cross-company payroll denied
- bank export does not expose unauthorized data

### Acceptance criteria

- Thailand payroll draft can be created
- Calculations are versioned and test-covered
- Payslip generated
- Approval workflow enforced
- No fake tax/legal claims
- Payroll data access tightly permissioned

---

## Release 9B — Global Payroll Framework + Country Pack Builder

### Goal

เตรียมระบบ payroll ให้เพิ่มประเทศใหม่ได้โดยไม่ rewrite core engine

### Scope

- country pack model
- rule engine abstraction
- multi-currency payroll
- exchange rate snapshots
- statutory contribution abstraction
- local payslip templates
- country-specific employee tax profiles
- payroll provider adapter

### Database tables

```sql
payroll_country_packs
payroll_rule_sets
payroll_rule_versions
payroll_rule_inputs
payroll_rule_outputs
employee_tax_profiles
employee_social_security_profiles
exchange_rate_snapshots
payslip_templates
payroll_provider_configs
```

### Priority country pack stubs

- TH already real pack
- SG stub
- VN stub
- PH stub
- ID stub
- MY stub
- JP stub
- US/UK/EU architecture stubs only

### Tests

- correct country pack selected by legal entity/country
- effective date selects correct rule version
- exchange rate snapshot locked per payroll run
- missing country rule blocks payroll instead of fake calculation
- payslip template selected by country

### Acceptance criteria

- Country pack architecture exists
- Non-TH packs cannot fake calculation
- Multi-currency snapshot works
- Payroll module can expand safely

---

## Release 9C — Data Import / Export / Migration Tooling

### Goal

ทำให้ลูกค้าจริงย้ายข้อมูลเข้าระบบได้ง่ายและปลอดภัย โดยไม่พัง tenant isolation

### Scope

- import employees
- import candidates
- import jobs
- import documents metadata
- import attendance history
- import payroll history summary
- export data by module
- dry run validation
- mapping UI
- rollback/reconciliation log

### Database tables

```sql
import_jobs
import_files
import_column_mappings
import_validation_errors
import_row_results
export_jobs
export_files
migration_batches
```

### Services

- `importJobService`
- `csvMappingService`
- `importValidationService`
- `exportJobService`

### Tests

- dry-run does not write data
- invalid rows reported
- partial import reconciled
- cross-company import blocked
- export permission required
- sensitive fields masked in export

### Acceptance criteria

- HR can import employee CSV safely
- Validation preview works
- Rollback/reconciliation exists
- Export audited

---

## Release 9D — Statutory Filing + Government Submission Framework

### Goal

สร้าง framework สำหรับ statutory reporting และ government submission โดยเริ่มจาก manual export ก่อน ไม่ fake direct filing

### Scope

- statutory report templates
- government filing periods
- filing status tracking
- generated filing documents
- manual submission record
- provider adapter for future direct filing
- acknowledgement upload

### Database tables

```sql
statutory_report_definitions
statutory_filing_periods
statutory_filings
statutory_filing_documents
statutory_submission_adapters
statutory_acknowledgements
```

### Rules

- default is manual file generation
- direct submission requires configured provider
- never fake government acknowledgement
- every export/download audited

### Tests

- filing document generated from payroll run
- missing approved payroll blocks filing
- manual submission can record acknowledgement
- unconfigured provider returns not_configured
- RLS isolation

### Acceptance criteria

- Statutory report framework exists
- Manual export works
- Direct filing safely disabled unless configured

---

# Phase C — Talent, Performance, Compliance, Monetization

---

## Release 10 — Performance Management + PIP + 9-box + Succession

### Goal

ทำระบบ performance ให้ครบ: OKR/KPI, review cycles, self/manager reviews, 360 feedback, calibration, PIP, disciplinary tracking, 9-box, succession

### Database tables

```sql
performance_cycles
performance_templates
performance_goals
okr_objectives
okr_key_results
performance_reviews
review_responses
performance_scores
calibration_sessions
pip_cases
disciplinary_actions
nine_box_assessments
succession_plans
successor_candidates
```

### Services

- `performanceCycleService`
- `okrService`
- `reviewService`
- `calibrationService`
- `pipService`
- `disciplinaryService`
- `successionService`

### AI rules

- AI can summarize feedback
- AI can draft development plan
- AI cannot decide rating
- AI cannot recommend termination
- no sensitive fields
- evidence + confidence required

### UI

- Performance Dashboard
- Goal/OKR Page
- Review Form Builder
- Self Review Page
- Manager Review Page
- Calibration Board
- PIP Case Detail
- 9-box Talent Grid
- Succession Planning Page

### Tests

- review visibility by role
- employee cannot edit manager rating
- calibration audit log
- PIP requires reason and approval
- 9-box cannot use sensitive fields
- succession plan access restricted

### Acceptance criteria

- Performance cycle works end-to-end
- Review results scoped correctly
- AI assistance safe
- PIP/disc actions are audit-heavy

---

## Release 10B — Internal Mobility + Internal Job Board

### Goal

ให้พนักงานสมัครงานภายใน, โยกย้ายทีม, talent marketplace ภายในองค์กร โดยไม่เสี่ยง retaliation

### Database tables

```sql
internal_jobs
internal_applications
internal_mobility_preferences
internal_transfer_requests
internal_hiring_reviews
mobility_privacy_settings
```

### Critical privacy rule

ผู้จัดการปัจจุบันห้ามเห็นว่าพนักงานสมัครงานภายใน เว้นแต่พนักงาน opt-in หรือ company policy อนุญาตชัดเจน

### Tests

- current manager cannot see private internal application
- HR can review
- employee can apply
- transfer approval workflow
- RLS isolation

### Acceptance criteria

- Internal job board works
- Privacy protection works
- Transfer workflow exists

---

## Release 11 — Compliance Framework + Grievance + Whistleblower + Health & Safety

### Goal

ยกระดับ compliance จาก PDPA tables เป็น operational compliance platform

### Scope

- privacy requests
- retention policies
- deletion workflows
- legal hold
- sensitive access logs
- grievance cases
- whistleblower reports
- anonymous reporting
- health & safety incidents
- compliance evidence registry
- country compliance packs

### Database tables

```sql
privacy_requests
data_retention_policies
data_purge_jobs
legal_holds
sensitive_field_access_logs
grievance_cases
whistleblower_reports
health_safety_incidents
compliance_evidence
compliance_country_packs
compliance_audit_reviews
```

### Tests

- anonymous report cannot be deanonymized by normal roles
- deletion request requires approval
- legal hold blocks purge
- sensitive field access logged
- compliance evidence export audited

### Acceptance criteria

- PDPA/GDPR-ready workflows exist
- no claim of full legal compliance without review
- whistleblower access is strict

---

## Release 12 — Billing + Pricing + Usage Limits

### Goal

ทำระบบ SaaS monetization จริง

### Plans

Thailand starter:

- Trial 14 days
- Starter 990 THB/month
- Growth 2,990 THB/month
- Pro 5,900 THB/month
- Enterprise custom

Global starter:

- Trial
- Starter $29/month
- Growth $99/month
- Pro $299/month
- Enterprise custom

### Database tables

```sql
plans
plan_features
plan_limits
subscriptions
subscription_items
usage_records
invoices
invoice_items
billing_events
payment_provider_configs
module_entitlements
```

### Rules

- missing Stripe/payment config = disabled state
- no fake payment success
- usage limits enforced server-side
- module entitlements checked server-side

### Tests

- plan limit blocks overuse
- trial expiry blocks paid modules
- module entitlement required
- webhook idempotency
- invoice generation

### Acceptance criteria

- Subscription and usage gating work
- billing safe if provider not configured

---

## Release 12B — Platform Admin / Internal Ops Console

### Goal

สร้าง console สำหรับทีม AdminMate support ลูกค้า โดยไม่รั่ว tenant data

### Scope

- tenant search
- subscription status
- feature flags
- support access grants
- impersonation with reason/time-box
- audit all internal ops actions
- incident notes

### Database tables

```sql
platform_admin_users
support_access_grants
tenant_support_notes
platform_audit_logs
customer_health_scores
```

### Rule

Internal admin impersonation must be visible to customer Owner/Admin audit log.

### Tests

- no silent impersonation
- support access expires
- internal ops cannot bypass audit

---

## Release 13 — Analytics + Reports

### Goal

สร้าง reporting layer จริงสำหรับผู้บริหารและ HR

### Scope

- dashboard widgets
- report definitions
- scheduled reports
- export CSV/Excel/PDF
- audit export
- role-based metrics

### Database tables

```sql
report_definitions
dashboard_layouts
analytics_widgets
scheduled_reports
report_exports
analytics_metric_snapshots
```

### Metrics

- headcount
- hires
- exits
- turnover
- time-to-hire
- onboarding completion
- leave usage
- attendance variance
- payroll cost
- mobility cases
- performance distribution

### Tests

- export masks sensitive data
- report respects RLS
- scheduled report not sent without approval/config

---

## Release 13B — People Analytics + Predictive Insights

### Goal

สร้าง predictive analytics แบบระวัง bias: attrition risk, engagement risk, hiring forecast, workforce planning

### Rules

- no hidden score
- evidence + confidence
- no sensitive fields
- no automated negative action
- HR review required

### Database tables

```sql
people_analytics_models
people_analytics_runs
risk_indicators
predictive_insights
insight_reviews
```

### Tests

- sensitive fields excluded
- prediction includes evidence
- no auto-PIP/termination
- manager visibility restricted

---

## Release 14 — Integration Adapters

### Goal

ทำ integration layer ให้ standardized ก่อนขยาย platform API เต็ม

### Adapters

- Google Calendar
- Microsoft Calendar
- Slack
- Microsoft Teams
- LINE OA
- WhatsApp
- Facebook Messenger
- SMS
- Email
- DocuSign / e-sign
- Accounting: Xero / QuickBooks
- LMS
- Payroll providers
- Bank export providers
- Background check provider

### Database tables

```sql
integration_providers
integration_configs
integration_connection_status
integration_event_logs
integration_sync_jobs
provider_webhook_events
```

### Rules

- provider_not_configured state
- no fake success
- secrets not stored plaintext
- webhook idempotency
- retry/backoff

---

# Phase D — Full Suite Modules

---

## Release 15 — Benefits Administration

### Goal

จัดการสวัสดิการ, enrollment, eligibility, provider, dependents, benefit deductions, self-service

### Database tables

```sql
benefit_plans
benefit_plan_options
benefit_eligibility_rules
benefit_enrollments
benefit_dependents
benefit_contributions
benefit_provider_configs
benefit_open_enrollment_periods
```

### Tests

- eligibility correct
- dependent data protected
- enrollment requires approval if configured
- payroll deduction handoff

---

## Release 16 — Learning & Development

### Goal

จัดการ training, compliance learning, skill matrix, certifications

### Database tables

```sql
learning_courses
learning_modules
learning_enrollments
training_assignments
certifications
certification_expiries
skill_profiles
skill_gap_analyses
```

### Tests

- mandatory training assigned
- completion tracked
- certificate expiry reminder
- skill data not used unfairly

---

## Release 17 — Engagement, Recognition & Surveys

### Goal

ทำ pulse surveys, eNPS, engagement, recognition, anonymous feedback

### Database tables

```sql
survey_templates
survey_campaigns
survey_questions
survey_responses
anonymous_response_groups
engagement_scores
recognition_events
reward_points
```

### Critical rule

Anonymous survey ต้องไม่สามารถ reverse identify ได้ง่ายจาก timestamp/department small group

### Tests

- anonymous mode hides identity
- minimum group size threshold
- manager cannot see individual anonymous responses

---

## Release 18 — Asset & Expense Management

### Goal

รวม asset tracking + expenses ใน platform เดียว เพราะ onboarding/offboarding มี asset return แล้ว

### Database tables

```sql
assets
asset_assignments
asset_maintenance_logs
asset_depreciation_records
expense_policies
expense_claims
expense_receipts
expense_approvals
expense_reimbursements
```

### Tests

- asset assigned to employee
- asset return links to offboarding
- expense approval required
- reimbursement handoff to payroll

---

## Release 19 — Compensation & Workforce Planning

### Goal

salary bands, compensation cycles, merit increase, bonus, equity, total rewards, headcount planning

### Database tables

```sql
salary_bands
compensation_cycles
compensation_reviews
compensation_change_requests
bonus_plans
equity_grants
vesting_schedules
total_rewards_statements
headcount_plans
workforce_forecasts
```

### Rules

- salary data highly sensitive
- no manager broad access unless permissioned
- market data must be labeled imported/reference unless real provider integrated

---

## Release 19B — Vendor & Contractor / Non-Employee Workforce

### Goal

จัดการ contractor, vendor worker, freelancers แยกจาก employees แต่เชื่อมกับ HRIS/payroll/expense/access

### Database tables

```sql
vendor_companies
vendor_workers
contractor_engagements
contractor_contracts
contractor_invoices
vendor_access_reviews
```

### Tests

- contractor not treated as employee by default
- access expiry tracked
- invoice approval workflow

---

# Phase E — Platform, AI, Enterprise Readiness

---

## Release 20 — Public API + Webhooks + No-Code Workflow

### Goal

เปิด platform layer ให้ integrate กับลูกค้า/partner

### Database tables

```sql
api_clients
api_keys
api_scopes
webhook_subscriptions
webhook_events
webhook_delivery_attempts
workflow_definitions
workflow_runs
workflow_steps
```

### Rules

- API key hashed
- scopes enforced
- webhooks HMAC signed
- retry/backoff
- no webhook secrets plaintext

### Tests

- API cannot bypass RLS
- webhook signature valid
- failed webhook retries
- workflow cannot perform unauthorized action

---

## Release 20B — Notification Center + Global Search

### Goal

รวม notification ทั้งระบบและค้นหาข้อมูลทั่ว platform แบบ permission-aware

### Database tables

```sql
notifications_v2
notification_preferences_v2
notification_delivery_logs
global_search_index
saved_searches
```

### Search scope

- employees
- candidates
- jobs
- documents metadata
- onboarding/offboarding cases
- payroll records metadata only if permissioned

### Tests

- search respects permission
- no sensitive data leaked in snippets
- notification preferences respected

---

## Release 21 — AI Platform Expansion / Employee AI Assistant

### Goal

สร้าง AI assistant สำหรับ employee/manager/HR ที่ตอบจาก policy และ data ที่ permissioned เท่านั้น

### Rules

- cite internal policy/source record
- no legal/payroll guarantee
- ask HR if uncertain
- no sensitive data leak
- no cross-tenant data
- human review for high-risk outputs

### Database tables

```sql
ai_assistant_conversations
ai_assistant_messages
ai_knowledge_sources
ai_policy_documents
ai_answer_audit_logs
```

### Use cases

- “เหลือวันลากี่วัน”
- “ขอลายังไง”
- “เอกสาร onboarding ขาดอะไร”
- “policy remote work คืออะไร”
- “payslip อธิบายแต่ละรายการให้หน่อย”

---

## Release 21B — HR Helpdesk & Case Management

### Goal

ticketing สำหรับ HR questions, employee requests, SLA, assignment, knowledge base

### Database tables

```sql
hr_helpdesk_cases
hr_case_categories
hr_case_comments
hr_case_attachments
hr_sla_policies
knowledge_base_articles
knowledge_base_feedback
```

### Tests

- employee sees own case
- HR sees assigned/company cases
- private HR comments hidden
- SLA escalation works

---

## Release 22 — Enterprise Security: SSO / SAML / SCIM / Session Policy

### Goal

พร้อมขาย enterprise

### Scope

- SAML SSO adapter
- OIDC provider config
- SCIM provisioning
- session policy
- device/session management
- IP allowlist
- audit export
- admin security dashboard

### Database tables

```sql
sso_provider_configs
scim_tokens
scim_provisioning_events
session_policies
user_sessions
ip_allowlists
security_events
```

### Tests

- disabled SSO if not configured
- SCIM cannot bypass company scope
- session expiry policy enforced

---

## Release 23 — Global Multi-Region, Data Residency, DR/BCP

### Goal

รองรับ enterprise/data residency/disaster recovery

### Scope

- data residency settings
- region mapping
- backup policy
- restore drills
- audit log export
- RPO/RTO documentation
- incident readiness

### Database tables

```sql
data_residency_policies
backup_jobs
restore_test_runs
disaster_recovery_plans
incident_response_events
```

### Tests

- region setting cannot be changed without approval
- backup job audit
- restore drill recorded

---

## Release 24 — Final Security, QA, E2E, Production Hardening

### Goal

ทำให้ระบบพร้อม production enterprise จริง

### Workstreams

1. Security audit
2. RLS matrix verification
3. RBAC matrix verification
4. Full E2E workflows
5. Load testing
6. Accessibility WCAG 2.1 AA
7. RTL smoke test
8. i18n completeness check
9. Performance budget
10. Bundle size optimization
11. Sentry/observability readiness
12. CI/CD pipeline
13. Release notes
14. Rollback plan
15. Beta launch checklist

### Must-fix before GA

- all 9 pre-existing failures must be fixed or formally waived with reason
- no unprotected route
- no missing RLS on tenant table
- no public storage URL for sensitive documents
- no secret leak
- no fake integration state

---

# Gate L — Lifecycle Governance & Operational Maturity

**Status:** ⬜ Planning — 6 releases (32A–32F)
**Added:** 2026-06-22

Gate L closes the operational maturity gap — ensuring the platform has continuous monitoring, governance processes, and review frameworks beyond feature delivery.

## 32A — Continuous Security Monitoring
- RLS drift detection (pg_policies vs migration baseline)
- Privilege escalation monitor (role grant anomalies)
- Secret-scan CI gate (pre-commit + pipeline)
- Anomaly detection rules (login patterns, API volumes, export rates)
- Tables: `security_monitor_rules`, `security_alerts`, `rls_audit_log`
- Edge function: `security-scan` (pg_cron every 6h)
- Dashboard: Security Monitor page

## 32B — Rule Review & Policy Governance
- Policy review registry (RLS, RBAC, compliance rules)
- Automated review reminders (weekly pg_cron)
- Structured review workflow (approve / needs_change / deprecated / escalate)
- Change audit trail (immutable `policy_review_history`)
- Tables: `policy_review_registry`, `policy_review_history`
- Dashboard: Policy Review page

## 32C — Restore & DR Exercise Automation
- DR exercise registry (tabletop / partial restore / full DR)
- Step-by-step runbook with pass/fail checkpoints
- RTO/RPO actual vs. target measurement
- Exercise reports (auto-generated markdown)
- Tables: `dr_exercises`, `dr_exercise_checkpoints`, `dr_exercise_findings`
- Dashboard: DR Exercise page

## 32D — Provider Governance & Credential Lifecycle
- Provider registry (all third-party integrations)
- Credential lifecycle (expiry tracking, rotation reminders)
- Provider health dashboard (latency, error rate, last success)
- Cost tracking (API call volumes, estimated costs)
- Contract management (renewal dates, SLAs, compliance)
- Kill-switch inventory (centralized toggle view)
- Tables: `provider_registry`, `provider_credentials`, `provider_health_log`, `provider_cost_log`, `provider_contracts`
- Dashboard: Provider Governance page

## 32E — Quality Regression Shield
- Quality baselines (test pass rate, build health, bundle size, perf metrics, a11y scores)
- Regression detection engine (configurable tolerance thresholds)
- Trend tracking (30-day historical metrics)
- PR gate integration (CI fails on regression)
- Weekly regression digest reports
- Tables: `quality_baselines`, `quality_measurements`, `quality_regression_alerts`
- CI step: `quality-gate.yml`
- Dashboard: Quality Regression page

## 32F — Annual Security & Compliance Review
- Structured review framework (security, privacy, compliance, operational, vendor, data protection)
- Compliance mapping (PDPA, GDPR, SOC 2, ISO 27001)
- Risk register refresh (all prior gates)
- Remediation roadmap (prioritized, owner-assigned, target-dated)
- Executive summary report (auto-generated)
- Annual review reminders (pg_cron)
- Tables: `annual_reviews`, `review_checklist_items`, `compliance_mappings`, `remediation_items`
- Dashboard: Annual Review page

### Gate L Evidence Documents

| Release | Document | Status |
|---------|----------|--------|
| 32A | `docs/RELEASE_32A_CONTINUOUS_SECURITY.md` | ⬜ Planning |
| 32B | `docs/RELEASE_32B_RULE_REVIEW.md` | ⬜ Planning |
| 32C | `docs/RELEASE_32C_RESTORE_DR_EXERCISES.md` | ⬜ Planning |
| 32D | `docs/RELEASE_32D_PROVIDER_GOVERNANCE.md` | ⬜ Planning |
| 32E | `docs/RELEASE_32E_QUALITY_REGRESSION.md` | ⬜ Planning |
| 32F | `docs/RELEASE_32F_ANNUAL_REVIEW.md` | ⬜ Planning |

---

# Codex Master Prompt สำหรับ Release ถัดไป

ใช้ prompt นี้เป็นหัวทุกครั้ง แล้วเติม release-specific section จากเอกสารนี้:

```text
You are working on AdminMate AI.

Proceed to [RELEASE_NAME] only.
Do not start the next release.
Do not touch .env or any secret file.
Do not deploy.
Do not push unless explicitly approved.

Use the real repo stack:
- Vite 6.4
- React 19
- React Router v7
- TypeScript 5.8
- Tailwind v4 CSS-based config
- Supabase Auth/PostgreSQL/Storage
- Raw SQL migrations
- Tenant key is company_id, not organization_id

Rules:
- All company-owned tables must use company_id.
- All sensitive tables must have RLS.
- All sensitive actions must write audit logs.
- Do not create fake UI-only features.
- Do not fake integrations.
- Do not fake payroll/compliance/legal calculations.
- AI assists only; no automated high-impact decisions.
- Build/typecheck/lint/tests must pass.

Before coding:
1. Audit existing tables/services/pages related to this release.
2. Reuse existing patterns.
3. Document schema decisions.
4. Create migration(s), services, UI, tests, docs.

After implementation, report:
- Commit hash if committed
- Files changed
- Migrations added
- Services added
- UI added
- Tests added
- Commands run
- Results
- Security impact
- Known gaps
- Next recommendation
```

---

# Recommended immediate next command for Codex

```text
Proceed to Release 32A — Continuous Security Monitoring only.
Use this master plan as the source of truth.
Do not start Release 32B yet.
```

---

# Reference notes used for roadmap validation

- Global mobility platforms in 2026 emphasize visa/immigration tracking, expiry alerts, document upload, case tracking, notifications, benefits, multi-currency payroll, relocation expense management, training, and performance tracking.
- 2026 global mobility risk is shaped by digital border systems, tax/social security scrutiny, business travel compliance, and the need for travel/day-count monitoring.
- Multi-country payroll needs local compliance, multi-currency, country-specific rules, payroll reporting, and HR/Finance alignment.
- Global leave management needs policy controls, holiday calendars, payroll integration, and compliance reporting.

