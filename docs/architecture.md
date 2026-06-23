# AdminMate AI — Architecture

> This is the canonical architecture reference. For the visual production diagram, see [PRODUCTION_ARCHITECTURE.md](PRODUCTION_ARCHITECTURE.md).

**Last updated:** 2026-06-23  
**Status:** All gates A–L closed, production hardened

---

## System Overview

AdminMate AI is a multi-tenant HR management platform for SEA SMEs, built as a serverless SPA backed by Supabase.

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                          │
│  Vite 6 → React 19 → Tailwind v4 → TypeScript 5.8              │
│  Zustand (auth/UI) + TanStack React Query (server state)        │
│  React Router v7 (lazy-loaded routes)                           │
└────────────────────────┬─────────────────────────────────────────┘
                         │ Supabase Client SDK (@supabase/supabase-js)
┌────────────────────────▼─────────────────────────────────────────┐
│                    SUPABASE PLATFORM                              │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   Auth   │  │ PostgREST │  │ Realtime │  │    Storage    │  │
│  │ (GoTrue) │  │  (API)    │  │ (WS push)│  │   (Files)     │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │              Edge Functions (Deno Runtime)                   ││
│  │  mate-ai-chat │ screen-resume │ generate-jd │ send-email   ││
│  │  whatsapp-webhook │ line-webhook │ parse-resume │ metrics   ││
│  └──────────────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────────┐│
│  │              PostgreSQL Database (65+ migrations)            ││
│  │  Multi-tenant with row-level security (RLS)                 ││
│  └──────────────────────────────────────────────────────────────┘│
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                    EXTERNAL SERVICES                              │
│  Google Gemini AI │ Resend │ LINE │ WhatsApp │ Sentry │ Vercel  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Build tool | Vite | 6.4.3 |
| Frontend framework | React | 19.0.1 |
| Routing | React Router | 7.1.0 |
| Language | TypeScript | 5.8.2 |
| Styling | Tailwind CSS | 4.1.14 |
| State management | Zustand | 5.0.0 |
| Data fetching | TanStack React Query | 5.60.0 |
| Forms | React Hook Form + Zod | 7.54 / 3.24 |
| Auth | Supabase Auth | 2.46.0 |
| Database | Supabase PostgreSQL | — |
| Storage | Supabase Storage | — |
| UI components | Radix UI + shadcn-style | — |
| Icons | Lucide React | 0.546 |
| Charts | Recharts | 2.15 |
| PDF generation | @react-pdf/renderer | 4.1 |
| i18n | i18next + react-i18next | 24 / 15 |
| Animation | motion | 12.23 |
| Error tracking | Sentry | 10.56 |
| Unit tests | Vitest | 2.1 |
| E2E tests | Playwright | 1.49 |
| Linting | ESLint 9 + typescript-eslint | — |
| Deployment | Vercel (frontend) + Supabase (backend) | — |

---

## Source Structure

```
src/
├── main.tsx                   # Entry point (Vite + Sentry + QueryClient + i18n)
├── App.tsx                    # Root component
├── index.css                  # Tailwind v4 + global styles
├── types.ts                   # Shared TypeScript types
├── vite-env.d.ts              # Vite type declarations
│
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
│
├── pages/                     # Route-level page components (lazy-loaded)
├── hooks/                     # Custom React hooks (17 files)
├── services/                  # Supabase API service layer (23 services)
├── stores/                    # Zustand stores (authStore, uiStore)
├── lib/                       # Core utilities (supabase client, i18n, sentry, session API)
├── router/                    # React Router v7 config + AuthGuard
├── types/                     # TypeScript models & database types
├── utils/                     # Pure utility functions
└── test-utils/                # Test factories and mocks

supabase/
├── migrations/                # 65+ SQL migration files
├── functions/                 # Edge functions (Deno runtime)
└── config.toml                # Supabase CLI config

tests/
├── unit/                      # Vitest unit tests
├── integration/               # Integration tests
├── chaos/                     # Chaos/resilience tests
└── fixtures/                  # Test data JSON fixtures

e2e/                           # Playwright E2E tests (24 spec files)
```

---

## Authentication Flow

1. **Supabase Auth** handles authentication (email/password, Google OAuth, magic link)
2. **Edge Function session proxy** (`supabase/functions/auth-session`) manages sessions via httpOnly cookies. JWT never exposed to client JavaScript.
3. **`sessionApi.ts`** calls the Edge Function with `credentials: 'include'` to exchange the httpOnly cookie for an in-memory access token.
4. **`authStore`** (Zustand) restores sessions via `fetchSessionStatus()` on every page load. Access token lives only in memory, never in localStorage.
5. **`AuthGuard`** component wraps protected routes, checks `isAuthenticated()`, `hasCompany()`, `requiredRoles`.
6. Profile and company data fetched from `user_profiles` and `companies` tables on session init.
7. **MFA enforcement** via Supabase Auth TOTP at the Edge Function level.

---

## Database Architecture

### Multi-Tenant Model

- **Tenant root:** `companies` table (id, name, country, currency, locale, subscription_tier)
- **User:** `user_profiles` (id → auth.users, company_id → companies, role: string)
- **Tenant scoping:** All major tables have `company_id UUID REFERENCES companies(id)`
- **RLS:** Enabled via `get_user_company_id()` and `is_admin_or_hr()` SQL functions
- **Hardened RLS:** Additional `safe_user_company_id()` and `safe_user_role()` functions

### Key Tables (65+ migrations)

| Category | Tables |
|----------|--------|
| Core | companies, user_profiles |
| RBAC | roles, permissions, role_permissions, user_roles |
| Recruiting | jobs, candidates, cv_documents, applications, interviews, offers |
| Onboarding | onboarding_checklists, onboarding_tasks |
| HRIS | employees, departments, positions, org_chart_nodes |
| Documents | documents, document_signatures |
| Messaging | chat_messages, chat_platform_connections, messages, conversation_threads, message_queue |
| Notifications | notifications, notification_preferences |
| Compliance | pdpa_compliance, consent_logs, data_deletion_requests |
| Billing | subscriptions |
| Security | mfa_enrollment, webhook_idempotency |
| Monitoring | audit_logs, ai_usage_log, rate_limits, activity_log |
| Global Config | country_configs, currency_configs, timezone_configs, locale_configs |
| Feature Flags | feature_flags, company_feature_flags |
| Sensitive Fields | sensitive_field_registry |

### RBAC System

- 10 system roles: owner, admin, hr_manager, recruiter, hiring_manager, payroll_admin, department_head, employee, contractor, viewer
- 40+ permissions across 15 resources
- SQL helpers: `has_role()`, `has_permission()`, `has_any_role()`, `user_role_names()`
- Dual-mode: RBAC tables with legacy `user_profiles.role` fallback

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `auth-session` | Login, session restore, refresh, logout via httpOnly cookies |
| `setup-mfa` | MFA enrollment setup |
| `verify-mfa` | MFA challenge verification |
| `auth-hook-mfa` | MFA enforcement hook |
| `mate-ai-chat` | AI chat powered by Google Gemini 2.5 Flash |
| `screen-resume` | AI resume screening |
| `generate-jd` | AI job description generation |
| `parse-resume` | Resume parsing and extraction |
| `send-email` | Email sending via Resend |
| `whatsapp-webhook` | WhatsApp Cloud API webhook handler |
| `line-webhook` | LINE Messaging API webhook handler |
| `metrics` | Cron-triggered metrics collection |

---

## Module Map

| Module | Description |
|--------|-------------|
| Recruitment | Jobs, candidates, pipeline (Kanban), interviews, offers |
| Onboarding | Checklists, task verification, AI assistant |
| HRIS | Employee directory, org chart, departments |
| Documents | Document tracking, e-signature, contract templates |
| Messaging | Chat widget, approval workflows, multi-platform (LINE/WhatsApp) |
| Payroll | Payroll cycles, calculations, statutory filing |
| Attendance | Shift scheduling, leave management |
| Performance | OKR tracking, reviews |
| Benefits | Benefits management, compensation |
| Assets | Asset tracking, expense management |
| Compliance | PDPA, data retention, audit logging |
| Reports | Analytics dashboards, Recharts visualizations |
| Settings | Company profile, security (MFA), compliance |
| AI Assistant | Mate AI chat, resume screening, JD generation |

---

## Security Architecture

- **Auth proxy:** httpOnly cookie + in-memory token (JWT never in localStorage)
- **MFA:** TOTP via Supabase Auth with backup codes
- **RLS:** Row-level security on all tenant tables with hardened helper functions
- **RBAC:** 10 roles, 40+ permissions, dual-mode with legacy fallback
- **CSP:** Content Security Policy headers via Vercel
- **Sensitive fields:** Registry of 15 PII fields with AI masking
- **Audit logging:** All permission-sensitive actions logged
- **Supply chain:** Dependency scanning, P1 vulnerability resolution

See [security.md](security.md) for detailed security documentation.

---

## Testing Strategy

- **Unit tests:** Vitest with 429+ tests across components, services, stores, utils
- **Integration tests:** Service layer integration with test DB
- **E2E tests:** Playwright with 24 spec files (172/172 pass rate)
- **pgTAP tests:** 1,777/1,777 PASS for database RLS and schema validation
- **Chaos tests:** Resilience and failure mode testing
- **Accessibility:** axe-core automated accessibility scanning

See [testing.md](testing.md) for detailed testing documentation.

---

## Deployment Architecture

- **Frontend:** Vercel (SPA with `dist/` output, SPA rewrites)
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- **CI/CD:** Vercel Git integration (auto-deploy on push)
- **Monitoring:** Sentry error tracking

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment procedures.

---

## Key Architectural Decisions

1. **Serverless-first:** No custom backend servers; Supabase handles all server-side logic
2. **SPA with lazy loading:** React Router v7 with code splitting per route
3. **Cookie-based auth:** httpOnly cookies prevent XSS token theft
4. **Multi-tenant RLS:** Database-level tenant isolation, not application-level
5. **Dual-mode RBAC:** Backward-compatible role system with migration path
6. **Edge functions:** Deno runtime for AI, email, and webhook processing
7. **i18n from day one:** 5 languages (EN, TH, ID, VI, ZH) with namespace-based loading
