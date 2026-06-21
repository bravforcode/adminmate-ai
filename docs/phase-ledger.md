# AdminMate AI — Phase Ledger

**Last updated:** 2026-06-22

## Release History

| Release | Name | Status | Date | Notes |
|---------|------|--------|------|-------|
| 0 | Repo Audit + Production Baseline | ✅ COMPLETE | 2026-06-20 | Full audit. 408/417 tests pass. Build/typecheck/lint clean. |
| 1 | Multi-Tenant Core + RBAC + Audit + i18n + Global Country Framework | ✅ COMPLETE | 2026-06-20 | Security hotfix, RBAC with legacy fallback, sensitive fields, global config. 429/438 tests pass. Stabilized: company_id naming, docs consistency, dual-mode RBAC. |
| 1B | Legal Entity & Organizational Hierarchy | ✅ COMPLETE | 2026-06-20 | 10 tables, 12 new permissions, 4 services, 8 tests. 443/452 tests pass. |
| 2 | Recruiting Core + Employee Referral | ✅ COMPLETE | 2026-06-20 | Employee referral system (table + service + RBAC + auto-hire trigger), audit fixes for cv_documents + interviews. 458/467 tests pass. |
| 3 | Candidate Portal + Application Forms | ✅ COMPLETE | 2026-06-20 | Public apply page, service-role edge functions, tracking, consent logging, 16 security tests. 474/483 tests pass. |
| 4 | AI Recruiting Layer | ✅ COMPLETE | 2026-06-20 | Evidence-based scoring, sensitive field exclusion, HR override, prompt versioning, 19 safety tests. 493/502 tests pass. |
| 5 | Messaging + Approval Workflow | ✅ COMPLETE | 2026-06-20 | Approval workflow, 6 provider adapters, template system, 23 messaging tests. 516/525 tests pass. |
| 6 | Onboarding + Documents + Contract Templates | ✅ COMPLETE | 2026-06-20 | 8 new tables, secure upload tokens, contract templates, e-signature adapters, 27 onboarding tests. 543/552 tests pass. |
| 6B | Offboarding + Exit Management | ✅ COMPLETE | 2026-06-20 | 9 new tables, asset return, access revocation, exit interview, final settlement readiness, 38 tests. 581/590 tests pass. |
| 7 | HRIS Core + Employee Directory + Org Chart | ✅ COMPLETE | 2026-06-20 | 8 new tables, employee lifecycle, change requests, org chart, custom fields, 28 HRIS tests. 609/618 tests pass. |
| 7B | Global Mobility, Visa & Work Permit Tracking | ✅ COMPLETE | 2026-06-20 | 11 new tables, immigration cases, travel approval, day counts, visa alerts, EOR, 16 mobility tests. 625/634 tests pass. |
| 8 | Attendance + Leave Core | ⏳ PENDING | — | |
| 8B | Workforce Scheduling & Shift Marketplace | ⏳ PENDING | — | |
| 9A | Thailand Payroll Pack | ⏳ PENDING | — | |
| 9C | Data Import/Export & Migration Tooling | ⏳ PENDING | — | BulkImport page exists |
| 32A | Continuous Security Monitoring | ⬜ PLANNING | 2026-06-22 | RLS drift detection, privilege escalation monitor, secret-scan CI gate, anomaly detection rules. 3 tables, edge function, dashboard. |
| 32B | Rule Review & Policy Governance | ⬜ PLANNING | 2026-06-22 | Policy review registry, automated reminders, review workflow, change audit trail, policy diff viewer. 2 tables, dashboard. |
| 32C | Restore & DR Exercise Automation | ⬜ PLANNING | 2026-06-22 | DR exercise registry, RTO/RPO measurement, evidence collection, exercise templates (tabletop/partial/full). 3 tables, dashboard. |
| 32D | Provider Governance & Credential Lifecycle | ⬜ PLANNING | 2026-06-22 | Provider registry, credential lifecycle, health dashboard, cost tracking, kill-switch inventory, contract management. 5 tables, dashboard. |
| 32E | Quality Regression Shield | ⬜ PLANNING | 2026-06-22 | Quality baselines (test/build/perf/a11y/security), regression detection, trend tracking, PR gate integration, weekly digests. 3 tables, CI step, dashboard. |
| 32F | Annual Security & Compliance Review | ⬜ PLANNING | 2026-06-22 | Review framework, compliance mapping (PDPA/GDPR/SOC2), remediation roadmap, executive reports, annual reminders. 4 tables, dashboard. |

## Release 1 Adaptation Notes

### Stack Corrections
- Build Plan says Next.js 14 → Reality: **Vite 6.4**
- Build Plan says React 18 → Reality: **React 19**
- Build Plan says App Router → Reality: **React Router v7 (client-side)**
- Build Plan says Prisma → Reality: **Raw SQL migrations via Supabase CLI**
- Build Plan says Tailwind v3 → Reality: **Tailwind v4 (CSS-based config)**
- Build Plan says `organization_id` → Reality: **`company_id`** (decide: rename or alias)

### What Already Exists (Skip in Release 1)
- ✅ Company model (as `companies`)
- ✅ User profiles (as `user_profiles`)
- ✅ Audit logs (as `audit_logs`)
- ✅ File metadata (as `documents`, `cv_documents`)
- ✅ Notification shell (as `notifications`)
- ✅ English/Thai i18n (plus vi, zh, id)
- ✅ Dark mode (CSS variables exist)
- ✅ Responsive app shell (Tailwind responsive classes)
- ✅ PDPA consent (as `pdpa_compliance`, `consent_logs`)
- ✅ Subscription model (as `subscriptions`)
- ✅ Rate limiting (as `rate_limits`)

### What Must Be Built in Release 1
- ✅ Roles table (replace string column) — DONE
- ✅ Permissions table — DONE
- ✅ User_roles junction table — DONE
- ✅ Server-side permission helper — DONE (SQL functions + frontend service)
- ✅ Sensitive field registry — DONE
- ✅ Country config table — DONE
- ✅ Currency config table — DONE
- ✅ Timezone config table — DONE
- ✅ Locale config table — DONE (incl RTL ar-SA)
- ✅ Data residency regions table — DONE
- ✅ Feature flags table — DONE
- ✅ RTL-ready layout — DONE (CSS logical properties + dir attribute)
- ✅ Fix notifications RLS vulnerability — DONE
- ✅ Permission-denied page — DONE
- ✅ Needs-configuration state component — DONE
- ❌ Role-aware navigation updates — NOT YET (depends on wiring AuthGuard to RBAC)

### Migration Strategy
Since `company_id` is deeply embedded (100+ references across 44 migrations), **do not rename**. Use `company_id` as the tenant scope throughout. The Build Plan's `organization_id` terminology should be interpreted as `company_id` in this codebase.
