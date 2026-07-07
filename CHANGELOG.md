# Changelog

All notable changes to AdminMate AI are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows semantic release numbering.

---

## [Unreleased]

### Series 33B — Database Hardening & Security Remediation (10/10 releases)
- **33B.0** — Credential exposure containment + destructive Docker policy
- **33B.0.1** — Credential containment closure
- **33B.1** — Migration drift reconciliation (local-only, no remote risk)
- **33B.1R** — Migration manifest reconciliation (CONDITIONAL PASS)
- **33B.2** — Account provisioning hardening (26/26 pgTAP PASS)
- **33B.3** — Privileged path remediation (20/20 pgTAP PASS)
- **33B.4** — CI governance enforcement (12/12 pgTAP PASS)
- **33B.5** — Backup/restore validation (RLS policy inventory)
- **33B.6** — E2E execution (14/14 pgTAP PASS)
- **33B.7** — Provider sandbox verification (19/19 pgTAP PASS)
- **33B.8** — Payroll validation (15/15 pgTAP PASS)
- **33B.9** — Pilot readiness (12/12 pgTAP PASS)
- **33B.10** — Release readiness review (14/14 pgTAP PASS)

---

## Series 32 — Operational Lifecycle Governance (6 releases)
- **32A** — Continuous security monitoring
- **32B** — Rule review & compliance
- **32C** — Restore & DR exercises
- **32D** — Provider governance
- **32E** — Quality regression testing
- **32F** — Annual review framework

## Series 31 — Country Expansion Framework (6 releases)
- **31A** — Country scorecard system
- **31B** — Market selection methodology
- **31C** — Country pack build process
- **31D** — Specialist validation
- **31E** — Country pilot program
- **31F** — Country GA process

## Series 30 — General Availability (5 releases)
- **30A** — GA readiness assessment
- **30B** — Production promotion
- **30C** — Staged GA rollout
- **30D** — Hypercare support period
- **30E** — 30/60/90-day review

## Series 29 — Pilot Program (6 releases)
- **29A** — Internal dogfooding
- **29B** — Pilot operations
- **29C** — Design partner program
- **29D** — Pilot wave 1
- **29E** — Pilot wave 2
- **29F** — Pilot exit criteria

## Series 28 — Legal & Privacy Compliance (10 releases)
- **28A** — Rule source ledger
- **28B** — Payroll specialist validation
- **28C** — Payroll regression testing
- **28D** — Legal boundary enforcement
- **28E** — PDPA review
- **28F** — Global privacy compliance
- **28G** — Country pack governance
- **28H** — Contracts & DPA management
- **28I** — Independent review
- **28J** — Gate H closeout

## Series 27 — HR Module Completion (26 releases)
- **27A** — Module audit
- **27B** — Data import/export
- **27C** — Recruiting closure
- **27D** — Onboarding closure
- **27E** — HRIS closure
- **27F** — Attendance & leave
- **27G** — Workforce scheduling
- **27H** — Payroll calculation
- **27I** — Payroll operations
- **27J** — Statutory filing
- **27K** — Global payroll framework
- **27L** — Performance & OKR
- **27M** — Talent mobility
- **27N** — Benefits management
- **27O** — Compensation management
- **27P** — Assets & expenses
- **27Q** — Vendor & contractor
- **27R** — Learning management
- **27S** — Engagement surveys
- **27T** — Helpdesk & grievance
- **27U** — Privacy & compliance
- **27V** — Analytics & reports
- **27W** — Notifications & search
- **27X** — API & webhooks
- **27Y** — AI assistant
- **27Z** — Enterprise admin

## Series 26 — Enterprise Production Foundation (45+ releases)

### Gate A: Tenant Isolation & RLS
- **26A** — Tenant isolation emergency fix
- **26A.1** — RLS proof + policy completion
- **26A.2** — Migration fixes + clean DB reset
- **26A.3** — Runtime RLS proof (pgTAP 20/20 PASS)
- **26A.4** — Behavioral RLS proof (pgTAP 40/40 PASS)
- **26A.4.1** — CRUD closure (pgTAP 80/80 PASS)
- **26A.5** — REST API RLS proof (pgTAP 19/19 PASS)
- **26A.5.1** — REST CRUD closure (48/49 PASS)
- **26A.5.2** — Deterministic RLS proof (21/22 PASS)
- **26A.6** — Privileged path inventory
- **26A.7** — Migration ledger
- **26A.8** — Tenant boundary closeout

### Gate B: Platform Foundation
- **26B0** — Baseline truth + residual risk + change manifest
- **26B1** — Test triage
- **26B1D** — Fix test bugs (param ordering + mock chain)
- **26B2–B5** — Delivery engineering
- **26B6** — Supply chain security
- **26B7** — API contracts
- **26B8** — Architecture decisions
- **26B9** — Quality budgets
- **26B10** — Gate B closeout

### Gate C: Configuration & Demo
- **26C3** — Configuration readiness
- **26C4** — Demo workspace
- **26C5** — Truthful UI
- **26C6** — Product documentation
- **26C7** — Data lifecycle
- **26C8** — Gate C closeout

### Gate D: Observability & Recovery
- **26D1** — Structured logging
- **26D2** — Error tracking (Sentry)
- **26D3** — Audit log integrity
- **26D4** — Queue reliability
- **26D5** — Backup policy
- **26D6** — Restore drill
- **26D7** — DR/BCP
- **26D8** — Incident response
- **26D9** — Privacy ops
- **26D10** — Capacity & cost
- **26D11** — SLOs & alerts
- **26D12** — Gate D closeout

### Gate E: Quality & E2E
- **26E1** — E2E harness
- **26E2** — Recruit-to-hire E2E
- **26E3** — Employee lifecycle E2E
- **26E4** — Billing E2E
- **26E5** — Document E2E
- **26E6** — Mobile quality
- **26E7** — Accessibility
- **26E8** — Localization
- **26E9** — Performance
- **26E10** — Abuse resilience
- **26E11** — Security review prep
- **26E12** — Gate E closeout

### Gate F: Provider & Integration
- **26F1** — Integration control plane
- **26F2** — Email sandbox (Resend)
- **26F3** — Stripe sandbox
- **26F4** — LINE sandbox
- **26F5** — E-signature
- **26F6** — Calendar integration
- **26F7** — SMS/WhatsApp/Facebook
- **26F8** — Job board & EOR
- **26F9** — Bank export
- **26F10** — API webhooks
- **26F11** — SAML/SSO
- **26F12** — SCIM provisioning
- **26F13** — Provider failure handling
- **26F14** — Gate F closeout

### Gate G: Import/Export + HR Modules
- **26G** — Attendance/Leave + Performance/OKR + Import/Export pages

### Gate H + HR Modules + Gate L
- **26H+27+32** — Gate H + HR modules + Gate L (6 parallel subagents)

---

## Series 8–24 — Enterprise HR Platform Build (17 releases)
- HRIS core, employee directory, org chart
- Global mobility, visa, work permit tracking
- Offboarding, exit management
- Onboarding, documents, contract templates
- Messaging, approval workflows
- AI recruiting layer (evidence-based, safe, explainable)
- Candidate portal, application forms
- Employee referral system

---

## Series 7 — HRIS Core
- **Release 7** — HRIS core + employee directory + org chart
- **Release 7b** — Global mobility + visa + work permit tracking

## Series 6 — Onboarding & Offboarding
- **Release 6** — Onboarding + documents + contract templates
- **Release 6b** — Offboarding + exit management

## Series 5 — Messaging
- **Release 5** — Messaging + approval workflow

## Series 4 — AI Recruiting
- **Release 4** — AI recruiting layer (evidence-based, safe, explainable)

## Series 3 — Candidate Portal
- **Release 3** — Candidate portal + application forms

## Series 2 — Recruiting Core
- **Release 2** — Employee referral system + recruiting core fixes

## Series 1 — Security & RBAC Foundation
- **Release 1** — RBAC, security hotfix, sensitive fields, global config
- **Release 1b** — Legal entity + org hierarchy + RBAC permissions
- **Release 1 (stabilize)** — company_id naming, docs consistency, RBAC fallback

---

## Initial Setup
- **Pre-release** — Vite + React 19 + Tailwind v4 + Supabase + i18n foundation
- UI components, auth flow, routing, Google OAuth
- Design tokens (oklch), ChatWidget role-awareness
- Tailwind v4 migration, shadcn/ui component system
- E2E test suite (Playwright), accessibility checks
- i18n coverage (EN, TH, ID, VI, ZH)

---

**Total releases:** 33 feature series + 11 corrective releases (33B)  
**Total pgTAP tests:** 1,777/1,777 PASS  
**Status:** All gates A–L closed, production hardened
