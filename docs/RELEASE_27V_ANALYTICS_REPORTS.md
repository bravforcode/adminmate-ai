# Release 27V — Analytics & Reports

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Achieve production readiness for the Analytics and Reporting module, enabling HR and management to view dashboards, generate reports, and export data — with role-based access and sensitive data masking.

---

## Scope

### In Scope

1. **Dashboard Widgets** — Configurable dashboard with widget library (headcount, turnover, leave, payroll cost, etc.).
2. **Report Definitions** — Pre-built and custom report templates.
3. **Scheduled Reports** — Report scheduling with email delivery (requires configured provider).
4. **Export Formats** — CSV, Excel, PDF export with audit logging.
5. **Role-Based Metrics** — Metrics scoped by role (employee sees own, manager sees team, HR sees company).
6. **Sensitive Data Masking** — Salary and other sensitive data masked in exports unless authorized.
7. **Metric Snapshots** — Historical metric snapshots for trend analysis.
8. **UI States** — Analytics pages show correct truthful UI state.
9. **Permissions** — `analytics:read`, `analytics:export`, `analytics:manage`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit analytics tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify export masks sensitive data per `sensitive_field_registry` | P0 |
| 4 | Verify reports respect RLS (no cross-tenant data leakage) | P0 |
| 5 | Verify scheduled reports not sent without configured provider | P0 |
| 6 | Verify dashboard metrics are role-scoped | P0 |
| 7 | Fix any gaps identified in audit | P0 |
| 8 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real-time streaming analytics.
- This release does **not** implement AI-powered predictive analytics (covered in separate release).
- This release does **not** implement third-party BI tool integration.
- This release does **not** implement custom report builder with drag-and-drop.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
