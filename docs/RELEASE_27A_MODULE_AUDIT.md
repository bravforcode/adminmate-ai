# Release 27A — Module Audit

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Perform a comprehensive audit of all existing functional modules to establish a baseline of completion status, identify gaps, and generate a remediation plan before Gate G begins closing individual modules.

---

## Scope

### In Scope

1. **Module inventory** — Enumerate every feature module across all phases (Recruiting through Enterprise Admin) with current status (Implemented / Partial / Stub / Missing).
2. **Schema completeness check** — For each module, verify all required tables exist, have `company_id`, and have RLS policies.
3. **Service layer check** — Verify each module has a service layer with permission checks and audit logging.
4. **UI state check** — Confirm each module page uses truthful UI states (`ComingSoon`, `NeedsConfiguration`, `SandboxOnly`, `PlanRestricted`, `Active`).
5. **Permission mapping** — Confirm each module has defined permission strings and role mappings.
6. **Test coverage snapshot** — Record which modules have test files and approximate coverage.
7. **Integration dependency map** — Document which modules depend on which (e.g., payroll depends on attendance, leave, salary structures).
8. **Gap register** — Produce a prioritized list of gaps blocking Gate G closure.

### Module Categories

| Category | Modules |
|----------|---------|
| **Recruiting** | Jobs, Candidates, Applications, Interviews, Offers, Referrals, Talent Pool |
| **Onboarding** | Checklists, Documents, Contracts, E-Signature |
| **HRIS** | Employee Directory, Org Chart, Offboarding |
| **Time & Attendance** | Attendance, Leave, Holidays |
| **Scheduling** | Shift Templates, Rosters, Shift Swap, OT |
| **Payroll** | Thailand Pack, Global Framework, Payslips, Bank Export |
| **Statutory** | Filing, Government Submission |
| **Performance** | OKR, Reviews, Calibration, PIP, 9-Box, Succession |
| **Mobility** | Internal Jobs, Transfers |
| **Benefits** | Plans, Enrollment, Contributions |
| **Compensation** | Salary Bands, Merit, Bonus, Equity |
| **Assets & Expenses** | Asset Tracking, Expense Claims |
| **Vendors** | Contractor Management, Invoices |
| **Learning** | Courses, Certifications, Skills |
| **Engagement** | Surveys, Recognition |
| **Helpdesk** | Cases, Knowledge Base |
| **Compliance** | Privacy, PDPA, Grievance, H&S |
| **Analytics** | Reports, Dashboards, People Analytics |
| **Platform** | Notifications, Search, API, Webhooks |
| **AI** | Assistant, Knowledge Sources |
| **Enterprise** | SSO, SCIM, DR/BCP, Platform Admin |

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Create module status spreadsheet (module × attribute matrix) | P0 |
| 2 | Run `supabase/migrations/` audit for missing `company_id` or RLS | P0 |
| 3 | Audit `src/services/` for permission check and audit log presence | P0 |
| 4 | Audit `src/pages/` or `src/routes/` for UI state labels | P1 |
| 5 | Map module dependencies (blocking relationships) | P1 |
| 6 | Identify modules with zero tests | P1 |
| 7 | Produce gap register with severity and estimated effort | P0 |
| 8 | Review gap register with stakeholders | P0 |

---

## Non-Goals

- This release does **not** implement or fix any module — it only audits and documents.
- This release does **not** create new database tables or services.
- This release does **not** change any UI components.
- This release does **not** run deployment or push to any environment.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
