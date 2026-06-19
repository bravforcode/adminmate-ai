# AdminMate AI — Production Architecture

**Last updated:** 2026-06-20  
**Status:** Release 0 audit complete

## Tech Stack (Verified)

| Layer | Technology | Version |
|-------|-----------|---------|
| Build tool | Vite | 6.4.3 |
| Frontend framework | React | 19.0.1 |
| Routing | React Router | 7.1.0 |
| Language | TypeScript | 5.8.2 |
| Styling | Tailwind CSS | 4.1.14 (CSS-based config, no JS config file) |
| State management | Zustand | 5.0.0 |
| Data fetching | TanStack React Query | 5.60.0 |
| Forms | React Hook Form + Zod | 7.54 / 3.24 |
| Auth | Supabase Auth | 2.46.0 |
| Database | Supabase PostgreSQL | — |
| Storage | Supabase Storage | — |
| UI components | Radix UI primitives + shadcn-style | — |
| Icons | Lucide React | 0.546 |
| Charts | Recharts | 2.15 |
| PDF | @react-pdf/renderer | 4.1 |
| i18n | i18next + react-i18next | 24 / 15 |
| Animation | motion | 12.23 |
| Error tracking | Sentry (optional) | 10.56 |
| Unit tests | Vitest | 2.1 |
| E2E tests | Playwright | 1.49 |
| Linting | ESLint 9 + typescript-eslint | — |

## Architecture Pattern

```
Vite SPA (client-side rendered)
├── src/
│   ├── components/    # UI components (19 subdirectories)
│   ├── hooks/         # Custom React hooks (17 files)
│   ├── lib/           # Core utilities (supabase client, i18n, error handler, sentry)
│   ├── pages/         # Page components (lazy-loaded)
│   ├── router/        # React Router config + AuthGuard
│   ├── services/      # Supabase data access layer (23 services)
│   ├── stores/        # Zustand stores (authStore, uiStore)
│   ├── types/         # TypeScript models
│   └── utils/         # Pure utility functions
├── supabase/
│   ├── migrations/    # 44 SQL migration files
│   ├── functions/     # Edge functions (Deno runtime)
│   └── config.toml    # Supabase CLI config
├── public/
│   └── locales/       # i18n JSON files (en, th, vi, zh, id × 12 namespaces)
├── tests/
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   ├── chaos/         # Chaos/resilience tests
│   └── fixtures/      # Test fixtures
└── e2e/               # Playwright E2E tests (24 spec files)
```

## Auth Flow

1. Supabase Auth handles authentication (email/password, Google OAuth, magic link)
2. `authStore` (Zustand) manages session state with persistence
3. `AuthGuard` component wraps protected routes, checks `isAuthenticated()`, `hasCompany()`, `requiredRoles`
4. Profile and company data fetched from `user_profiles` and `companies` tables on session init
5. Edge functions: `auth-session` (login/refresh/logout/status), `verify-mfa`, `auth-hook-mfa`

## Database Schema (Tenant Model)

- **Tenant root:** `companies` table (id, name, country, currency, locale, subscription_tier)
- **User:** `user_profiles` (id → auth.users, company_id → companies, role: string)
- **Tenant scoping:** All major tables have `company_id UUID REFERENCES companies(id)`
- **RLS:** Enabled via `get_user_company_id()` and `is_admin_or_hr()` SQL functions
- **Hardened RLS:** Additional `safe_user_company_id()` and `safe_user_role()` functions

## Key Tables (44 migrations)

| Category | Tables |
|----------|--------|
| Core | companies, user_profiles |
| Recruiting | jobs, candidates, cv_documents, applications, interviews, offers |
| Onboarding | onboarding_checklists, onboarding_tasks |
| Documents | documents, document_signatures |
| Messaging | chat_messages, chat_platform_connections, messages, conversation_threads, message_queue |
| Notifications | notifications, notification_preferences |
| Compliance | pdpa_compliance, consent_logs, data_deletion_requests |
| Billing | subscriptions |
| Security | mfa_enrollment, webhook_idempotency |
| Monitoring | audit_logs, ai_usage_log, rate_limits, activity_log |
| Analytics | (via edge functions and views) |

## Build Commands

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run type-check    # tsc --noEmit
npm run lint         # eslint src/
npm test             # vitest
npm run test:e2e     # playwright test
```

## Deployment

- Target: Vercel (vercel.json exists)
- Build output: `dist/`
- No CI/CD pipeline found (.github/ is empty)
