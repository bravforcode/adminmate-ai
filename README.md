# AdminMate AI — HR Management Platform for SEA SMEs

AI-powered HR platform covering recruitment, hiring, onboarding, compliance, payroll, and workforce management for Thailand, Vietnam, and Indonesia.

**Version:** 1.0.0  
**Status:** Release 0 complete — Core HRIS + Recruitment + Payroll functional for Thailand. Release 1 (multi-country, advanced features) in progress.  
**Last updated:** 2026-07-09

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript 5.8 | 19.0.1 |
| Build | Vite | 6.4.3 |
| Styling | Tailwind CSS v4 | 4.1.14 |
| State | Zustand (auth/UI) + TanStack React Query (server state) | 5.0 / 5.60 |
| Router | React Router v7 (lazy-loaded routes) | 7.1.0 |
| UI | Radix UI + shadcn-style components | — |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) | 2.46 |
| AI | Google Gemini 2.5 Flash | — |
| Email | Resend | — |
| Chat | LINE Messaging API, WhatsApp Cloud API | — |
| Monitoring | Sentry | 10.56 |
| i18n | i18next (EN, TH, ID, VI, ZH) | 24 |
| Testing | Vitest (unit) + Playwright (E2E) + pgTAP (DB) | 2.1 / 1.49 |
| Deployment | Vercel (frontend) + Supabase (backend) | — |

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Git
- Supabase CLI (optional, for local dev)
- Docker Desktop (optional, for local Supabase)

### Setup

```bash
# 1. Clone
git clone <repo-url>
cd adminmate-ai

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL + anon key

# 4. Run dev server
npm run dev
# → http://localhost:5173
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_APP_URL` | Yes | App URL (default: `http://localhost:5173`) |
| `VITE_APP_NAME` | Yes | App name (`AdminMate AI`) |
| `VITE_ENABLE_LINE` | No | Enable LINE integration |
| `VITE_ENABLE_WHATSAPP` | No | Enable WhatsApp integration |
| `VITE_ENABLE_ZALO` | No | Enable Zalo integration |
| `VITE_SENTRY_DSN` | No | Sentry error monitoring DSN |
| `GEMINI_API_KEY` | Yes | Google Gemini API key *(Edge Function secret only)* |
| `LINE_CHANNEL_ACCESS_TOKEN` | No | LINE OA channel token *(secret)* |
| `LINE_CHANNEL_SECRET` | No | LINE OA channel secret *(secret)* |
| `WHATSAPP_API_TOKEN` | No | WhatsApp Cloud API token *(secret)* |
| `WHATSAPP_PHONE_NUMBER_ID` | No | WhatsApp phone number ID *(secret)* |
| `WHATSAPP_VERIFY_TOKEN` | No | WhatsApp webhook verify token *(secret)* |
| `RESEND_API_KEY` | Yes | Resend email API key *(secret)* |
| `CRON_SECRET_KEY` | Yes | Shared secret for cron-triggered functions *(secret)* |

### Database Migration

```bash
# Link to Supabase project
supabase link --project-ref <your-project-ref>

# Push all 65+ migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

### Edge Functions

```bash
# Set secrets
supabase secrets set GEMINI_API_KEY=<your-key>
supabase secrets set RESEND_API_KEY=<your-key>
supabase secrets set CRON_SECRET_KEY=<random-secret>
# ... set other secrets as needed

# Deploy all functions
supabase functions deploy
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run type-check` | TypeScript type check |
| `npm run test` | Run unit tests (watch mode) |
| `npm run test:ui` | Vitest UI runner |
| `npm run test:coverage` | Test coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright with debug UI |
| `npm run clean` | Remove dist directory |

---

## Architecture

```
src/
├── App.tsx                    # Root component
├── main.tsx                   # Entry point (Vite + Sentry + QueryClient + i18n)
├── index.css                  # Tailwind v4 + global styles
├── types.ts                   # Shared TypeScript types
├── components/                # UI components (19 subdirectories)
│   ├── layout/                # AppLayout, Sidebar, Header, MobileNav, UserMenu
│   ├── auth/                  # Login, Register, ForgotPassword, MFA
│   ├── dashboard/             # KPI cards, recent activity widgets
│   ├── jobs/                  # Job creation, listing, detail cards
│   ├── candidates/            # Candidate list, detail, CV upload
│   ├── pipeline/              # Kanban board with drag-and-drop
│   ├── interviews/            # Interview scheduler, calendar
│   ├── offers/                # Offer letter builder, PDF generation
│   ├── documents/             # Document tracking, status badges
│   ├── onboarding/            # Checklist, task verifier, AI assistant
│   ├── reports/               # Recharts analytics
│   ├── settings/              # Company profile, account, compliance, security
│   ├── chat/                  # Mate AI chat widget (floating)
│   ├── pdf/                   # @react-pdf/renderer templates
│   └── shared/                # DataTable, EmptyState, ErrorBoundary, ConfirmDialog
├── pages/                     # Route-level page components (lazy-loaded)
├── hooks/                     # Custom React hooks (17 files)
├── services/                  # Supabase API service layer (65+ services)
├── stores/                    # Zustand stores (authStore, uiStore)
├── lib/                       # Core utilities (supabase client, i18n, sentry, session API)
├── router/                    # React Router v7 config + AuthGuard
├── types/                     # TypeScript models & database types
├── utils/                     # Pure utility functions
└── test-utils/                # Test factories and mocks
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture reference.

### Route Map

| Route | Page | Auth |
|-------|------|------|
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/forgot-password` | ForgotPasswordPage | Public |
| `/reset-password` | ResetPasswordPage | Public |
| `/setup-company` | CompanySetupPage | Authenticated (no company) |
| `/pricing` | PricingPage | Public |
| `/terms` | TermsPage | Public |
| `/privacy` | PrivacyPage | Public |
| `/cookies` | CookiesPage | Public |
| `/auth/callback` | OAuthCallbackPage | Public |
| `/apply/:jobToken` | ApplyPage | Public |
| `/portal/track/:trackingToken` | TrackApplicationPage | Public |
| `/dashboard` | DashboardPage | HR/Admin/Manager |
| `/employees` | EmployeeListPage | HR/Admin/Manager |
| `/employees/:id` | EmployeeDetailPage | HR/Admin/Manager |
| `/recruitment/jobs` | JobsPage | HR/Admin/Manager |
| `/recruitment/jobs/:id` | JobDetailPage | HR/Admin/Manager |
| `/recruitment/candidates` | CandidatesPage | HR/Admin/Manager |
| `/recruitment/candidates/:id` | CandidateDetailPage | HR/Admin/Manager |
| `/recruitment/pipeline` | PipelinePage | HR/Admin/Manager |
| `/recruitment/interviews` | InterviewsPage | HR/Admin/Manager |
| `/hiring` | HiringPage | HR/Admin/Manager |
| `/onboarding` | OnboardingMgmtPage | HR/Admin/Manager |
| `/documents` | DocumentsPage | HR/Admin/Manager |
| `/documents/sign/:id` | DocumentSigningPage | HR/Admin/Manager |
| `/performance` | PerformancePage | HR/Admin/Manager |
| `/okrs` | OKRPage | HR/Admin/Manager |
| `/attendance` | AttendancePage | HR/Admin/Manager |
| `/leave` | LeavePage | HR/Admin/Manager |
| `/benefits` | BenefitsPage | HR/Admin/Manager |
| `/learning` | LearningPage | HR/Admin/Manager |
| `/engagement` | EngagementPage | HR/Admin/Manager |
| `/reports` | ReportsPage | HR/Admin/Manager |
| `/people-analytics` | PeopleAnalyticsPage | HR/Admin/Manager |
| `/analytics` | AnalyticsDashboardPage | HR/Admin/Manager |
| `/messages` | MessagesPage | HR/Admin/Manager |
| `/notifications` | NotificationCenterPage | HR/Admin/Manager |
| `/health` | HealthPage | HR/Admin/Manager |
| `/monitoring` | GeminiMonitoringPage | HR/Admin/Manager |
| `/automation` | WorkflowAutomationPage | HR/Admin/Manager |
| `/portal` | EmployeePortalDashboard | HR/Admin/Manager |
| `/portal/profile` | EmployeeProfilePage | HR/Admin/Manager |
| `/portal/time-off` | EmployeeTimeOffPage | HR/Admin/Manager |
| `/portal/payslips` | EmployeePayslipsPage | HR/Admin/Manager |
| `/payroll` | PayrollDashboardPage | HR/Admin/Manager |
| `/payroll/run` | PayrollRunPage | HR/Admin/Manager |
| `/payroll/run/:runId` | PayrollRunPage | HR/Admin/Manager |
| `/payroll/payslip/:employeeId` | PayslipPage | HR/Admin/Manager |
| `/settings` | SettingsPage | HR/Admin/Manager |
| `/settings/security` | SecurityPage | HR/Admin/Manager |
| `/settings/compliance` | CompliancePage | Admin only |
| `/settings/notifications` | NotificationPreferencesPage | HR/Admin/Manager |
| `/settings/audit-log` | AuditLogPage | Admin/HR |
| `/settings/import` | BulkImportPage | HR/Admin/Manager |
| `/settings/import-data` | ImportPage | HR/Admin/Manager |
| `/settings/export-data` | ExportPage | HR/Admin/Manager |
| `/settings/pdpa` | PDPAPage | HR/Admin/Manager |
| `/settings/billing` | BillingPage | HR/Admin/Manager |
| `/settings/thailand-payroll` | ThailandPayrollPage | HR/Admin/Manager |
| `/settings/compliance-advisor` | ComplianceAdvisorPage | HR/Admin/Manager |
| `/settings/line` | LINESettingsPage | HR/Admin/Manager |
| `*` | NotFoundPage | — |

---

## Modules

| Module | Description |
|--------|-------------|
| **Recruitment** | Jobs, candidates, pipeline (Kanban), interviews, offers |
| **Onboarding** | Checklists, task verification, AI assistant |
| **HRIS** | Employee directory, org chart, departments |
| **Documents** | Document tracking, e-signature, contract templates |
| **Messaging** | Chat widget, approval workflows, multi-platform (LINE/WhatsApp) |
| **Payroll** | Payroll cycles, calculations, statutory filing |
| **Attendance** | Shift scheduling, leave management |
| **Performance** | OKR tracking, reviews |
| **Benefits** | Benefits management, compensation |
| **Assets** | Asset tracking, expense management |
| **Compliance** | PDPA, data retention, audit logging |
| **Reports** | Analytics dashboards, Recharts visualizations |
| **Settings** | Company profile, security (MFA), compliance |
| **AI Assistant** | Mate AI chat, resume screening, JD generation |

---

## Security

- **Auth proxy:** httpOnly cookie + in-memory token (JWT never in localStorage)
- **MFA:** TOTP via Supabase Auth with backup codes
- **RLS:** Row-level security on all tenant tables (1,777 pgTAP tests)
- **RBAC:** 10 roles, 40+ permissions, dual-mode with legacy fallback
- **CSP:** Content Security Policy headers via Vercel
- **Sensitive fields:** Registry of 15 PII fields with AI masking
- **Audit logging:** All permission-sensitive actions logged

See [docs/security.md](docs/security.md) for detailed security documentation.

---

## Testing

| Type | Tool | Coverage |
|------|------|----------|
| Unit | Vitest | 429+ tests |
| Integration | Vitest | Service layer |
| E2E | Playwright | 24 spec files, 172/172 pass |
| Database | pgTAP | 1,777/1,777 PASS |
| Accessibility | axe-core | Automated scanning |
| Chaos | Custom | Resilience testing |

See [docs/testing.md](docs/testing.md) for testing strategy.

---

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment guide.  
See [docs/runbook.md](docs/runbook.md) for operational runbook.  
See [docs/launch-checklist.md](docs/launch-checklist.md) for pre-launch checklist.

---

## Release History

**Current:** Release 0 — Core HRIS + Recruitment + Payroll (Thailand)  
**Next:** Release 1 — Multi-country payroll (VN/ID), LINE Bot v2, AI Policy Assistant  
**Tests:** 1,777 pgTAP PASS (DB layer), 429+ Vitest unit tests, 172 Playwright E2E

See [CHANGELOG.md](CHANGELOG.md) for full release history.

---

## Documentation

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Full release history |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture reference |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment procedures |
| [docs/security.md](docs/security.md) | Security documentation |
| [docs/testing.md](docs/testing.md) | Testing strategy |
| [docs/runbook.md](docs/runbook.md) | Operational runbook |
| [docs/launch-checklist.md](docs/launch-checklist.md) | Pre-launch checklist |
| [docs/PRODUCTION_ARCHITECTURE.md](docs/PRODUCTION_ARCHITECTURE.md) | Visual architecture diagram |
| [docs/adminmate-roadmap.md](docs/adminmate-roadmap.md) | Product roadmap |
| [docs/phase-ledger.md](docs/phase-ledger.md) | Release execution ledger |
| [docs/RELEASE_33B_SERIES_COMPLETE.md](docs/RELEASE_33B_SERIES_COMPLETE.md) | Latest series summary |

---

## License

Proprietary. All rights reserved.
