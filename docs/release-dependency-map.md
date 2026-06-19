# AdminMate AI — Release Dependency Map

**Last updated:** 2026-06-20

## Dependency Graph

```
Release 0 (Repo Audit) ✅
    │
    ▼
Release 1 (Multi-Tenant Core + RBAC + Audit + i18n + Country Framework) ✅
    │
    ├──► Release 1B (Legal Entity & Org Hierarchy)
    │        │
    │        ▼
    │    Release 7B (Global Mobility, Visa & Work Permit)
    │
    ├──► Release 2 (Recruiting Core + Referral) [PARTIAL EXISTS]
    │        │
    │        ├──► Release 3 (Candidate Portal)
    │        │        │
    │        │        ▼
    │        │    Release 4 (AI Recruiting Layer) [PARTIAL EXISTS]
    │        │
    │        └──► Release 5 (Messaging + Approval) [INFRA EXISTS]
    │
    ├──► Release 6 (Onboarding + Documents) [PARTIAL EXISTS]
    │        │
    │        └──► Release 6B (Offboarding)
    │
    ├──► Release 7 (HRIS Core + Directory + Org Chart)
    │
    ├──► Release 8 (Attendance + Leave)
    │        │
    │        └──► Release 8B (Workforce Scheduling)
    │
    ├──► Release 9A (Thailand Payroll Pack)
    │        │
    │        ├──► Release 9B (Global Payroll Framework)
    │        │
    │        └──► Release 9D (Statutory Filing Framework)
    │
    └──► Release 9C (Data Import/Export) [PARTIAL EXISTS]
             │
             ▼
         Release 10 (Performance + PIP + 9-Box)
              │
              ├──► Release 10B (Internal Mobility)
              │
              └──► Release 11 (Compliance + Grievance) [PARTIAL EXISTS]
                   │
                   ▼
               Release 12 (Billing + Usage) [PARTIAL EXISTS]
                    │
                    ├──► Release 12B (Platform Admin / Internal Ops)
                    │
                    └──► Release 13 (Analytics + Reports) [PARTIAL EXISTS]
                         │
                         ├──► Release 13B (People Analytics & Predictive)
                         │
                         └──► Release 14 (Integration Adapters) [PARTIAL EXISTS]
                              │
                              ▼
                          Release 15 (Benefits)
                               │
                               ▼
                           Release 16 (L&D)
                               │
                               ▼
                           Release 17 (Engagement + Surveys)
                               │
                               ▼
                           Release 18 (Asset & Expense)
                               │
                               ▼
                           Release 19 (Compensation & Workforce Planning)
                                │
                                ├──► Release 19B (Vendor & Contractor)
                                │
                                └──► Release 20 (Public API + Webhooks + Workflow)
                                     │
                                     ├──► Release 20B (Notification Center + Search)
                                     │
                                     └──► Release 21 (AI Platform Expansion)
                                          │
                                          ├──► Release 21B (HR Helpdesk)
                                          │
                                          └──► Release 22 (Enterprise Security / SSO / SCIM)
                                               │
                                               ▼
                                           Release 23 (Global Multi-Region + DR)
                                                │
                                                ▼
                                            Release 24 (Final Hardening)
```

## Parallel Work Opportunities (After Release 1)

| Track A (HR Operations) | Track B (Platform) | Track C (Compliance) |
|------------------------|--------------------|--------------------|
| Release 2 (Recruiting) | Release 9A (Payroll) | Release 11 (Compliance) |
| Release 3 (Candidate Portal) | Release 9C (Import/Export) | Release 12 (Billing) |
| Release 4 (AI Recruiting) | Release 13 (Analytics) | Release 12B (Platform Admin) |
| Release 5 (Messaging) | Release 14 (Integrations) | Release 22 (Enterprise Security) |
| Release 6/6B (Onboarding/Offboarding) | Release 20 (API/Webhooks) | Release 23 (Multi-Region) |
| Release 7/7B (HRIS/Mobility) | Release 20B (Notification Center) | |
| Release 8/8B (Attendance/Scheduling) | Release 21/21B (AI/Helpdesk) | |
| Release 10/10B (Performance/Mobility) | | |

## Existing Feature Overlap

| Planned Release | Existing Code | Gap |
|----------------|---------------|-----|
| Release 2 (Recruiting) | jobs, candidates, applications, interviews, offers tables + pages | Referral program, candidate comparison, talent pool, do-not-hire |
| Release 4 (AI Recruiting) | generate-jd, screen-resume, generate-offer-content edge functions | Match score weights, sensitive field exclusion ✅ (registry exists), evidence contract |
| Release 5 (Messaging) | chat_messages, messages, conversation_threads, message_queue | Approval workflow, provider adapter interface, multi-language templates |
| Release 6 (Onboarding) | onboarding_checklists, onboarding_tasks, documents | Contract templates, e-sign provider, AI document check |
| Release 7 (HRIS) | user_profiles with department/position | Org chart, custom fields, employee timeline, change requests |
| Release 8 (Attendance) | None | Must build from scratch |
| Release 9A (Payroll) | None | Must build from scratch |
| Release 9C (Import) | BulkImportPage exists | Column mapping, dry-run, validation, rollback |
| Release 11 (Compliance) | pdpa_compliance, consent_logs, data_deletion_requests | Grievance, whistleblower, health & safety |
| Release 12 (Billing) | subscriptions table, Stripe webhook edge function | Usage tracking, plan limits, module entitlements |
| Release 13 (Analytics) | ReportsPage, dashboard edge functions | Real metric definitions, export audit |
| Release 14 (Integrations) | LINE, WhatsApp, Facebook adapters (edge functions) | Adapter interface standardization, disabled states |
