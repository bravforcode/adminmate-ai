# AdminMate AI — Enterprise Production Roadmap

**Supersedes:** Build Plan v1, v2, v3  
**Status:** Release 0 complete, Release 1 ready to begin  
**Last updated:** 2026-06-20

## Corrections to Build Plan v4

The Build Plan v4 assumed a Next.js 14 stack. The actual repo is:

| Assumed | Actual |
|---------|--------|
| Next.js 14 | Vite 6.4 |
| React 18 | React 19 |
| App Router | React Router v7 (CSR) |
| Prisma | Raw SQL migrations |
| Tailwind v3 | Tailwind v4 (CSS config) |
| `organization_id` | `company_id` |

All Release specs below are adapted to the real stack.

---

## Phase I — Foundation and Thailand Commercial Launch

### Release 0 — Repo Audit + Production Baseline ✅
Completed 2026-06-20.

### Release 1 — Multi-Tenant Core + RBAC + Audit + i18n + Global Country Framework
**Goal:** Platform foundation for every future module.

**New tables:** roles, permissions, user_roles, sensitive_field_registry, country_configs, currency_configs, timezone_configs, locale_configs, data_residency_regions, feature_flags

**Must fix:** notifications RLS `WITH CHECK (true)` vulnerability

**Must adapt:** AuthGuard to support granular permissions (not just role strings)

### Release 1B — Legal Entity & Organizational Hierarchy
**Depends:** Release 1

**New tables:** legal_entities, entity_addresses, entity_registration_numbers, entity_tax_profiles, organization_units, business_units, cost_centers, locations, reporting_lines

### Release 2 — Recruiting Core + Employee Referral
**Depends:** Release 1  
**Partial exists:** jobs, candidates, applications, interviews, offers

**New tables:** referral_campaigns, employee_referrals, referral_rewards, talent_pool, do_not_hire_records, candidate_comparisons, candidate_tags

### Release 3 — Candidate Portal + Application Forms
**Depends:** Release 2

**New tables:** candidate_auth_profiles, candidate_application_sessions, application_form_versions, form_questions, form_answers, consent_logs (扩展)

### Release 4 — AI Recruiting Layer
**Depends:** Release 2  
**Partial exists:** generate-jd, screen-resume, generate-offer-content

**New:** AIEvidenceResult contract, match score with configurable weights, sensitive field exclusion

### Release 5 — Messaging + Approval Workflow
**Depends:** Release 1  
**Partial exists:** chat_messages, messages, conversation_threads

**New tables:** message_templates, message_translations, message_drafts, message_approvals, message_logs

### Release 6 — Onboarding + Documents + Contract Templates
**Depends:** Release 1  
**Partial exists:** onboarding_checklists, onboarding_tasks, documents

**New tables:** onboarding_templates, contract_templates, generated_contracts, esignature_requests

### Release 6B — Offboarding + Exit Management
**Depends:** Release 6

### Release 7 — HRIS Core + Directory + Org Chart
**Depends:** Release 1

### Release 7B — Global Mobility, Visa & Work Permit
**Depends:** Release 1B

### Release 8 — Attendance + Leave Core
**Depends:** Release 1  
**Must build from scratch.**

### Release 8B — Workforce Scheduling & Shift Marketplace
**Depends:** Release 8

### Release 9A — Thailand Payroll Pack
**Depends:** Release 1, Release 1B  
**Must build from scratch.**

### Release 9C — Data Import/Export & Migration Tooling
**Depends:** Release 1  
**Partial exists:** BulkImportPage

---

## Phase II — Core HR Operating System

### Release 9B — Global Payroll Expansion Framework
### Release 9D — Statutory Filing & Government Submission
### Release 10 — Performance + PIP + 9-Box + Succession
### Release 10B — Internal Mobility
### Release 11 — Compliance Framework + Grievance + Health & Safety
### Release 12 — Billing + Usage Limits
### Release 12B — Platform Admin / Internal Ops Console
### Release 13 — Analytics + Reports
### Release 13B — People Analytics & Predictive Insights
### Release 14 — Integration Adapters

---

## Phase III — Full Suite / Enterprise Differentiation

### Release 15 — Benefits Administration
### Release 16 — Learning & Development
### Release 17 — Engagement, Recognition & Surveys
### Release 18 — Asset & Expense Management
### Release 19 — Compensation & Workforce Planning
### Release 19B — Vendor & Contractor Management

---

## Phase IV — Platform, AI and Enterprise Readiness

### Release 20 — Public API, Webhooks & No-Code Workflow
### Release 20B — Notification Center & Global Search
### Release 21 — AI Platform Expansion / Employee AI Assistant
### Release 21B — HR Helpdesk & Case Management
### Release 22 — Enterprise Security / SSO / SAML / SCIM
### Release 23 — Global Multi-Region, Data Residency & DR/BCP
### Release 24 — Security, QA, E2E, Production Hardening
