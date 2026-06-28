# Phase 3 Performance Follow-up: PDPA/Medium-Traffic Table select('*') Replacement

## Commit
`749b929` — perf: replace select('*') on PDPA-sensitive and medium-traffic tables

## Summary
Replaced 24 `select('*')` calls with explicit column selections across 6 service files containing PDPA-sensitive or medium-traffic data. This follows the earlier fix (`bd050c6`) that targeted PII and high-traffic tables.

## Files Modified

### 1. `src/services/attendance/leaveService.ts` (6 edits)
- **getLeaveTypes**: Explicit leave_types columns (12 cols)
- **createLeaveRequest** balance check: `id, total_days, used_days, pending_days`
- **approveLeaveRequest** fetch: `id, company_id, employee_id, leave_type_id, start_date, total_days, status`
- **approveLeaveRequest** balance: `id, pending_days, used_days`
- **rejectLeaveRequest** fetch: same as approve fetch
- **rejectLeaveRequest** balance: `id, pending_days`

### 2. `src/services/attendance/attendanceService.ts` (3 edits)
- **checkOut** fetch: `id, company_id, check_out`
- **requestCorrection** fetch original: `id, company_id, check_in, check_out`
- **approveCorrection** fetch: `id, company_id, attendance_record_id, status, corrected_check_in, corrected_check_out`

### 3. `src/services/benefits/benefitService.ts` (4 edits)
- **getBenefitPlans**: All plan columns (11 cols)
- **getEnrollments**: All enrollment columns (12 cols)
- **checkEligibility** rules fetch: `id, employment_type, min_service_months, department_ids`
- **getOpenEnrollmentPeriods**: All period columns (8 cols)

### 4. `src/services/learning/learningService.ts` (6 edits)
- **getCourses**: All course columns (10 cols)
- **completeModule** fetch: `id, company_id, course_id, progress_pct`
- **getEnrollments**: All enrollment columns (10 cols)
- **getCertifications**: All cert columns (11 cols)
- **checkExpiringCertifications**: All cert columns minus document_id (10 cols)
- **getSkillProfile**: All skill profile columns (7 cols)

### 5. `src/services/compensation/compensationService.ts` (2 edits)
- **getReviews**: All review columns (13 cols)
- **getHeadcountPlans**: All headcount columns (10 cols)

### 6. `src/services/helpdesk/helpdeskService.ts` (3 edits)
- **getCase**: All case columns (13 cols, includes description for detail view)
- **listCases**: All case columns except description (12 cols, list view optimization)
- **listComments**: All comment columns (7 cols)

## Design Decisions
- **Detail views** retain `description`/`reason` columns (needed for display)
- **List views** exclude large text fields (`description`) to reduce payload
- **Internal fetches** (pre-update validation) select only the columns actually read by the function
- **Balance lookups** select only numeric counters needed for arithmetic
- **No insert/update returns** were touched (these only return the written record via `.select()`)

## Verification
- `npx tsc --noEmit` — passed with zero errors
- All 6 files confirmed zero remaining `select('*')` calls
