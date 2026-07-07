# Release 26C.6 — Product Documentation

**Generated:** 2026-06-22
**Gate:** C — Product Documentation
**Tenant Key:** `company_id`

---

## Capability Matrix

### Core HR

| Module | Status | Plan | Country | Notes |
|--------|--------|------|---------|-------|
| Employee Directory | ✅ Active | All | All | Full CRUD, search, org chart |
| Company Settings | ✅ Active | All | All | Profile, branding, locale |
| Legal Entities | ✅ Active | All | All | Multi-entity support |
| Org Hierarchy | ✅ Active | All | All | Departments, cost centers |
| User Roles (RBAC) | ✅ Active | All | All | 5 built-in roles, custom roles |

### Recruitment

| Module | Status | Plan | Country | Notes |
|--------|--------|------|---------|-------|
| Job Postings | ✅ Active | All | All | CRUD, status management |
| Candidate Management | ✅ Active | All | All | Profile, pipeline, notes |
| Application Tracking | ✅ Active | All | All | Status workflow |
| Interview Scheduling | ✅ Active | All | All | Calendar integration |
| Offer Management | ✅ Active | All | All | Generate, send, track |
| Referral Program | ✅ Active | All | All | Employee referrals |
| Candidate Portal | ✅ Active | All | All | Self-service portal |

### Onboarding & Offboarding

| Module | Status | Plan | Country | Notes |
|--------|--------|------|---------|-------|
| Onboarding Workflows | ✅ Active | All | All | Task checklists, documents |
| Contract Generation | ✅ Active | All | All | Template-based |
| E-Signatures | ✅ Active | All | All | Digital signature |
| Document Requests | ✅ Active | All | All | Collect from new hires |
| Offboarding Checklists | ✅ Active | All | All | Exit management |
| Access Revocation | ✅ Active | All | All | System access cleanup |
| Final Settlement | ⚙️ Config Required | All | All | Requires payroll config |

### Payroll

| Module | Status | Plan | Country | Notes |
|--------|--------|------|---------|-------|
| Payroll Processing | ⚙️ Config Required | All | TH, SG | Requires country pack |
| Payroll Cycles | ⚙️ Config Required | All | All | Pay frequency setup |
| Thailand Payroll | 🌏 Country-Specific | All | TH | Social security, tax |
| Singapore Payroll | 🌏 Country-Specific | All | SG | CPF, IRAS |
| Statutory Filing | ⚙️ Config Required | All | TH, SG | Government integration |
| Compensation Mgmt | 🔜 Coming Soon | Pro+ | All | Salary bands, reviews |

### Attendance & Leave

| Module | Status | Plan | Country | Notes |
|--------|--------|------|---------|-------|
| Attendance Tracking | ⚙️ Config Required | All | All | Shift schedules |
| Leave Management | ⚙️ Config Required | All | All | Leave types, policies |
| Workforce Scheduling | 🔜 Coming Soon | Pro+ | All | Shift optimization |

### AI Features

| Module | Status | Plan | Country | Notes |
|--------|--------|------|---------|-------|
| AI Assistant | ⚡ Active (Sandbox) | All | All | Rate-limited |
| AI Resume Screening | ⚡ Active (Sandbox) | Pro+ | All | Credit-based |
| AI Candidate Matching | ⚡ Active (Sandbox) | Pro+ | All | Credit-based |
| AI People Analytics | 🔜 Coming Soon | Enterprise | All | Beta enrollment |

### Integrations

| Module | Status | Plan | Country | Notes |
|--------|--------|------|---------|-------|
| Email (SMTP) | ⚙️ Config Required | All | All | Provider setup |
| SMS (Twilio) | ⚙️ Config Required | All | All | Optional |
| Chat Platforms | ⚙️ Config Required | All | All | Line, WhatsApp, FB |
| SSO (SAML/OIDC) | 🏷️ Plan-Restricted | Enterprise | All | Enterprise only |
| API & Webhooks | 🏷️ Plan-Restricted | Pro+ | All | API key required |
| Stripe Billing | ✅ Active | All | All | Subscription mgmt |

### Compliance & Security

| Module | Status | Plan | Country | Notes |
|--------|--------|------|---------|-------|
| Audit Logs | ✅ Active | All | All | Append-only |
| PDPA Compliance | ✅ Active | All | TH | Thai data protection |
| MFA/2FA | ✅ Active | All | All | TOTP, backup codes |
| Data Export | ⚡ Active (Sandbox) | Admin | All | Logged, rate-limited |
| Document Retention | ✅ Active | All | All | Policy-based |

---

## Integration Status

### Production-Ready

| Integration | Provider | Status | Notes |
|------------|----------|--------|-------|
| Authentication | Supabase Auth | ✅ Live | Email, Google OAuth |
| Database | Supabase PostgreSQL | ✅ Live | RLS enforced |
| Storage | Supabase Storage | ✅ Live | File uploads |
| Billing | Stripe | ✅ Live | Subscriptions, invoices |
| Email | SMTP | ✅ Live | Configurable provider |
| Error Tracking | Sentry | ✅ Live | Frontend errors |

### In Development

| Integration | Provider | Status | Notes |
|------------|----------|--------|-------|
| SMS | Twilio | 🔧 Ready | Not yet activated |
| Line Messaging | Line API | 🔧 Ready | Not yet activated |
| WhatsApp | WhatsApp Business | 🔧 Ready | Not yet activated |

### Planned

| Integration | Provider | Status | Notes |
|------------|----------|--------|-------|
| SSO | SAML/OIDC | 📋 Planned | Enterprise feature |
| Google Calendar | Google API | 📋 Planned | Interview scheduling |
| Xero | Xero API | 📋 Planned | Accounting sync |

---

## AI Boundary Statement

> **AdminMate AI uses artificial intelligence as an assistive tool, not as a decision-maker.**

### What AI Does

- Screens resumes against job requirements (pattern matching)
- Generates interview questions based on job descriptions
- Summarizes candidate profiles and interview notes
- Drafts offer letters and contracts from templates
- Provides HR policy recommendations based on uploaded documents
- Answers natural language questions about workforce data

### What AI Does NOT Do

- **Make hiring decisions** — All hiring decisions are made by human users
- **Evaluate candidates** — AI provides data; humans assess fit
- **Process payroll** — All payroll calculations use deterministic rules
- **File statutory documents** — All filings are human-initiated
- **Access sensitive data** — AI is blocked from salary, medical, disciplinary records
- **Replace legal counsel** — AI recommendations are not legal advice

### AI Transparency

- Every AI-generated content is labeled "AI-generated"
- Users can review and edit all AI outputs before saving
- AI usage is logged in `ai_usage_log` for audit
- AI features can be disabled via feature flags
- AI model responses are not used for training

### AI Data Boundaries

| Data Type | AI Access | Reason |
|-----------|-----------|--------|
| Job descriptions | ✅ Yes | Public information |
| Candidate resumes | ✅ Yes | User-provided |
| Employee names/emails | ✅ Yes | Operational data |
| Salary information | ❌ No | Sensitive PII |
| Medical records | ❌ No | Protected health data |
| Disciplinary records | ❌ No | Confidential |
| Performance reviews | ❌ No | Confidential |
| Banking details | ❌ No | Financial PII |

---

## Payroll Boundary Statement

> **AdminMate AI provides payroll calculation tools, not payroll services.**

### What Payroll Module Does

- Calculates gross-to-net salary based on country-specific tax rules
- Applies statutory deductions (social security, income tax, CPF)
- Generates payslips and payroll summaries
- Tracks payroll cycles and payment dates
- Supports multi-country payroll via country packs
- Provides payroll reports for accounting

### What Payroll Module Does NOT Do

- **File tax returns** — All statutory filings are human-initiated and human-approved
- **Make payments** — Integration with banking/payment systems is out of scope
- **Provide tax advice** — Calculations are based on published rates; not advisory
- **Handle expatriate tax** — Complex international tax scenarios require professional advice
- **Guarantee accuracy** — All payroll runs require human review and approval before processing

### Country Pack Scope

| Country | Tax | Social Security | Filing | Status |
|---------|-----|----------------|--------|--------|
| Thailand | ✅ | ✅ | ⚙️ Config | Ready |
| Singapore | ✅ | ✅ (CPF) | ⚙️ Config | Ready |
| Vietnam | 📋 Planned | 📋 Planned | 📋 Planned | Q3 2026 |
| Philippines | 📋 Planned | 📋 Planned | 📋 Planned | Q4 2026 |
| Indonesia | 📋 Planned | 📋 Planned | 📋 Planned | Q4 2026 |

### Payroll Disclaimer

> AdminMate AI payroll calculations are based on publicly available tax rates and statutory contribution schedules. Users are responsible for verifying all calculations before processing payments. AdminMate AI does not accept liability for incorrect payroll calculations. Always consult with a qualified accountant or payroll specialist for complex scenarios.
