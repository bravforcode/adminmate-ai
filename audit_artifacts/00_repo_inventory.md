# Repository Inventory — AdminMate AI

**Audit Date:** 2026-06-03
**Auditor:** Senior Principal Engineer (Read-Only)
**Repository:** `C:\Users\menum\Downloads\adminmate-ai`
**Git Status:** Not a git repository (no `.git` directory present)

---

## 1. Detected Stack

| Layer | Technology | Version/Range |
|-------|-----------|---------------|
| **Frontend Framework** | React 19 | `^19.0.1` |
| **Build Tool** | Vite 6 | `^6.2.3` |
| **Styling** | Tailwind CSS v4 | `^4.1.14` (via `@tailwindcss/vite`) |
| **Language** | TypeScript | `~5.8.2` |
| **Routing** | react-router-dom | `^7.1.0` |
| **State (Server)** | @tanstack/react-query | `^5.60.0` |
| **State (Client)** | Zustand | `^5.0.0` |
| **Forms** | react-hook-form + zod | `^7.54.0` / `^3.24.0` |
| **i18n** | i18next + react-i18next | `^24.0.0` / `^15.0.0` |
| **Charts** | Recharts | `^2.15.0` |
| **PDF Generation** | @react-pdf/renderer | `^4.1.0` |
| **AI/LLM** | @google/genai (Gemini) | `^2.4.0` |
| **Backend-as-a-Service** | Supabase | `^2.46.0` |
| **Animations** | motion (Framer Motion) | `^12.23.24` |
| **UI Utilities** | clsx + tailwind-merge + class-variance-authority | — |
| **Testing (Unit)** | Vitest 2.x + @testing-library/react | `^2.1.0` / `^16.1.0` |
| **Testing (E2E)** | Playwright | `^1.49.0` |
| **Linting** | ESLint 9 + typescript-eslint | `^9.0.0` / `^8.0.0` |
| **Formatting** | Prettier | `^3.4.0` |
| **Hosting** | Vercel | (via vercel.json) |
| **CI/CD** | GitHub Actions | `.github/workflows/ci.yml` |
| **Git Hooks** | Husky | `.husky/pre-commit` |
| **Edge Runtime** | Supabase Edge Functions (Deno) | config.toml `enabled = true` |
| **Auth** | Supabase Auth (PKCE flow) | `flowType: 'pkce'` |
| **Error Monitoring** | Sentry (optional, `@sentry/react`) | `VITE_SENTRY_DSN` flag |

---

## 2. File Counts

*(Source files only — excludes `node_modules/`, `dist/`, and `**/.gitkeep`)*

| Extension | Count | Description |
|-----------|-------|-------------|
| `.tsx` | **67** | React components, pages, router, legacy views |
| `.ts` | **58** | Source: hooks(9), services(11), lib(6), stores(2), utils(5), root src(3), tests(8), edge fns(11), config(3) |
| `.sql` | **26** | Supabase database migrations |
| `.json` | **11** | Configs (5), i18n locales (6) |
| `.css` | **1** | `src/index.css` (Tailwind entry) |
| `.html` | **1** | `index.html` |
| `.mjs` | **1** | `eslint.config.mjs` |
| `.toml` | **1** | `supabase/config.toml` |
| `.yml` | **1** | `.github/workflows/ci.yml` |
| Other | **6** | `.gitignore`, `.prettierrc`, `.env.example`, `.env.local` (excluded), `.husky/pre-commit`, `README.md` |
| **Total** | **~173** | Approximate non-tool/non-build source files |

**`.gitkeep` placeholders:** ~30 across `supabase/migrations/`, `supabase/functions/_shared/`, `src/hooks/`, `src/lib/`, `src/services/`, `src/stores/`, `src/utils/`, `src/components/reports/`, `src/components/onboarding/`, `src/pages/auth/`, `src/pages/recruitment/`, `src/pages/settings/`, `src/pages/onboarding/`, `src/pages/hiring/`, `tests/*/`

---

## 3. Project Structure

```
adminmate-ai/
├── index.html                    # SPA entry — mounts <div id="root">
├── package.json                  # Node metadata, deps, scripts
├── tsconfig.json                 # TypeScript config (target ES2022, bundler resolution, @/* alias, noEmit)
├── vite.config.ts                # Vite: React plugin, Tailwind CSS v4, path alias, manual chunk splitting
├── vitest.config.ts              # Vitest: jsdom env, coverage thresholds (70/70/65), @/ alias
├── vercel.json                   # Vercel deploy: SPA rewrites, security headers (X-Frame, XSS, Referrer)
├── eslint.config.mjs             # ESLint 9 flat config: TS recommended, warns on `any`/unused
├── .prettierrc                   # Prettier formatting rules
├── playwright.config.ts          # Playwright E2E: 3 browsers, base URL localhost:5173
├── .env.example                  # Template: Supabase URL/key, app name, Gemini key, feature flags, Sentry DSN
├── .env.local                    # ⚠️ PRESENT — contains Gemini API key (gitignored but exists on disk)
├── .husky/pre-commit             # Git hook: runs type-check + lint (currently broken)
├── metadata.json                 # Google AI Studio metadata (app name, description)
├── README.md                     # Minimal setup instructions (AI Studio template)
│
├── .github/workflows/ci.yml      # CI: quality (lint/type-check/test) → deploy-preview → deploy-production
│
├── src/
│   ├── main.tsx                  # ⭐ ENTRY: ReactDOM root + QueryClient + RouterProvider
│   ├── App.tsx                   # ⚠️ LEGACY: Monolithic component with useState — NOT wired into router
│   ├── index.css                 # Tailwind CSS v4 entry (@import "tailwindcss")
│   ├── types.ts                  # Core TypeScript interfaces (Company, Job, Candidate, UserRole, etc.)
│   ├── mockData.ts               # Mock data for legacy App.tsx (initialJobs, initialCandidates, etc.)
│   ├── translations.ts           # ⚠️ LEGACY: Hardcoded EN/TH translations object (not i18next)
│   │
│   ├── router/
│   │   ├── index.tsx             # React Router v7 config (createBrowserRouter, lazy-loaded pages)
│   │   └── AuthGuard.tsx         # Auth wrapper — redirects unauthenticated users
│   │
│   ├── pages/                    # Page-level components (lazy loaded via router)
│   │   ├── auth/                 # LoginPage, RegisterPage, ForgotPasswordPage
│   │   ├── onboarding/           # CompanySetupPage
│   │   ├── recruitment/          # CandidatesPage, CandidateDetailPage, JobsPage, JobDetailPage, PipelinePage, InterviewsPage
│   │   ├── hiring/               # HiringPage
│   │   ├── settings/             # SettingsPage, CompliancePage
│   │   ├── DashboardPage.tsx
│   │   ├── DocumentsPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── OnboardingMgmtPage.tsx
│   │   └── ReportsPage.tsx
│   │
│   ├── components/
│   │   ├── layout/               # AppLayout, Sidebar, Header, UserMenu, MobileNav, LanguageSwitcher, NotificationBell
│   │   ├── shared/               # DataTable, ConfirmDialog, EmptyState, ErrorBoundary, LoadingScreen
│   │   ├── auth/                 # AuthLayout, LoginForm, RegisterForm
│   │   ├── candidates/           # CandidateCard, CandidateForm, CVUploader, CVParseResult
│   │   ├── jobs/                 # JobCard, JobForm, JobStatusBadge
│   │   ├── pipeline/             # KanbanBoard, KanbanColumn, ApplicationCard, ApplicationDrawer
│   │   ├── interviews/           # InterviewCard, ScheduleInterviewForm, InterviewFeedbackForm
│   │   ├── offers/               # OfferForm
│   │   ├── pdf/                  # OfferLetterPDF, PDFDownloadButton
│   │   ├── chat/                 # ChatInterface
│   │   ├── compliance/           # PDPAConsentBanner
│   │   ├── onboarding/           # [EMPTY — .gitkeep only]
│   │   ├── reports/              # [EMPTY — .gitkeep only]
│   │   ├── Header.tsx            # ⚠️ LEGACY
│   │   ├── LoginView.tsx         # ⚠️ LEGACY
│   │   ├── DashboardView.tsx     # ⚠️ LEGACY
│   │   ├── JdGeneratorView.tsx   # ⚠️ LEGACY
│   │   ├── ResumeScreeningView.tsx # ⚠️ LEGACY
│   │   ├── PipelineView.tsx      # ⚠️ LEGACY
│   │   ├── OnboardingManagerView.tsx    # ⚠️ LEGACY
│   │   ├── OnboardingChecklistView.tsx  # ⚠️ LEGACY
│   │   ├── OnboardingAssistantView.tsx  # ⚠️ LEGACY
│   │   ├── CvBuilderView.tsx     # ⚠️ LEGACY
│   │   └── SettingsView.tsx      # ⚠️ LEGACY
│   │
│   ├── hooks/                    # React Query wrapper hooks (one per domain)
│   │   ├── useAuth.ts, useCandidates.ts, useJobs.ts, useApplications.ts
│   │   ├── useInterviews.ts, useOffers.ts, useDocuments.ts, useOnboarding.ts, useChat.ts
│   │
│   ├── services/                 # API/service layer (Supabase calls)
│   │   ├── authService.ts, candidateService.ts, jobService.ts, applicationService.ts
│   │   ├── interviewService.ts, offerService.ts, documentService.ts, onboardingService.ts
│   │   ├── chatService.ts, companyService.ts, storageService.ts
│   │
│   ├── lib/                      # Core infrastructure
│   │   ├── supabase.ts           # Supabase client (PKCE flow, realtime config)
│   │   ├── query-client.ts       # @tanstack/react-query client
│   │   ├── i18n.ts               # i18next initialization
│   │   ├── ai-config.ts          # Gemini model config (gemini-2.5-flash, temp 0.7, country labor law contexts)
│   │   ├── navigation.ts         # Sidebar navigation definition
│   │   └── sentry.ts             # Sentry initialization (conditionally loaded via dynamic import)
│   │
│   ├── stores/                   # Zustand client-side stores
│   │   ├── authStore.ts          # Auth state (user, session, company)
│   │   └── uiStore.ts            # UI state (sidebar open, theme, active page)
│   │
│   └── utils/                    # Pure utility functions
│       ├── cn.ts                 # clsx + tailwind-merge helper
│       ├── constants.ts          # App-wide constants (roles, stages, countries)
│       ├── currency.ts           # Currency formatting
│       ├── date.ts               # Date formatting via date-fns
│       └── validators.ts         # Zod validation schemas
│
├── supabase/
│   ├── config.toml               # Supabase local dev config (ports, auth, edge runtime)
│   ├── migrations/               # 26 SQL migration files (0001-0026)
│   └── functions/                # 9 Edge Functions + 2 shared utilities
│       ├── _shared/              # Shared Deno modules: messageHandler.ts, utils.ts
│       ├── mate-ai-chat/         # AI chatbot (Gemini-powered)
│       ├── generate-jd/          # JD generation via Gemini
│       ├── generate-offer-content/ # Offer letter generation via Gemini
│       ├── screen-resume/        # Resume screening/matching via Gemini
│       ├── parse-resume/         # Resume parsing/structuring via Gemini
│       ├── send-email/           # Email notification sender
│       ├── send-document-reminders/ # Document reminder scheduler
│       ├── whatsapp-webhook/     # WhatsApp webhook handler
│       └── line-webhook/         # LINE messaging webhook handler
│
├── tests/
│   ├── setup.ts                  # Vitest setup file
│   ├── unit/
│   │   ├── utils/                # currency.test.ts, date.test.ts, validators.test.ts, cn.test.ts
│   │   ├── services/             # jobService.test.ts, onboardingService.test.ts
│   │   └── stores/               # authStore.test.ts
│   ├── integration/              # [EMPTY — .gitkeep]
│   ├── e2e/                      # [EMPTY — .gitkeep]
│   └── fixtures/                 # [EMPTY — .gitkeep]
│
├── public/locales/               # i18n namespace files
│   ├── en/  common.json, recruitment.json
│   ├── th/  common.json, recruitment.json
│   ├── id/  common.json (Indonesian)
│   └── vi/  common.json (Vietnamese)
│
└── dist/                         # Build output (present — previous build)
```

---

## 4. Major Modules

### 4.1 Router & Auth (src/router/, src/lib/supabase.ts)
- React Router v7 with lazy-loaded pages, `AuthGuard` wrapper, Supabase PKCE auth flow
- Public routes: `/login`, `/register`, `/forgot-password`
- Protected routes under `/` with `AppLayout` (sidebar + header)
- 13 child routes: dashboard, recruitment/*, documents, chat, onboarding, reports, settings, settings/compliance

### 4.2 Recruitment (src/pages/recruitment/, src/components/candidates/, src/components/jobs/, src/components/pipeline/, src/components/interviews/)
- Full ATS (Applicant Tracking System): Jobs CRUD, Candidate management, Kanban pipeline with status stages, Interview scheduling with feedback forms
- CV upload + parsing (via Supabase Edge Function `parse-resume`)
- AI-powered resume screening (via Edge Function `screen-resume`)

### 4.3 AI Integration (src/lib/ai-config.ts, supabase/functions/mate-ai-chat/, generate-jd/, screen-resume/, parse-resume/, generate-offer-content/)
- Google Gemini (`gemini-2.5-flash`) used through `@google/genai` SDK
- 5 Edge Functions offload AI operations to server-side (API key never client-exposed)
- Country-specific labor law context (TH, VN, ID) injected into prompts
- Multi-language support: Thai, English, Vietnamese, Indonesian

### 4.4 Onboarding & Documents (src/pages/OnboardingMgmtPage.tsx, src/pages/DocumentsPage.tsx, src/components/offers/, src/components/pdf/)
- Company setup wizard, document vault, employee onboarding tasks
- Offer letter PDF generation via `@react-pdf/renderer`
- Document reminder Edge Function (`send-document-reminders`)

### 4.5 Chat & Messaging (src/pages/ChatPage.tsx, supabase/functions/mate-ai-chat/, whatsapp-webhook/, line-webhook/)
- In-app AI copilot chat (Gemini-powered)
- WhatsApp and LINE webhook integrations (messaging platform agnostic)

### 4.6 Compliance (src/components/compliance/, src/pages/settings/CompliancePage.tsx)
- PDPA consent banner (Thai personal data protection law)
- Compliance settings page

### 4.7 Testing (tests/)
- 7 unit test files, 26 test cases — all passing
- Coverage: utils (currency, date, validators, cn), services (job, onboarding), stores (auth)
- E2E and integration test directories exist but are empty

### 4.8 Legacy Monolith (src/App.tsx, src/components/*View.tsx, src/mockData.ts, src/translations.ts)
- **NOT imported anywhere in the current entry point** — dead code
- Old architecture with all state in a single `App` component via `useState`
- 11 legacy view components in `src/components/`
- Should be flagged for removal to reduce confusion and maintenance burden

---

## 5. Entry Points

| File | Role |
|------|------|
| `index.html` | HTML shell — mounts `<div id="root">` |
| `src/main.tsx` | JavaScript entry — `ReactDOM.createRoot`, wraps with `QueryClientProvider` + `RouterProvider` |
| `src/router/index.tsx` | Routing entry — `createBrowserRouter` with lazy-loaded page components |
| `src/lib/supabase.ts` | Infrastructure entry — Supabase client singleton |
| `src/lib/query-client.ts` | React Query entry — configured `QueryClient` |
| `src/lib/i18n.ts` | i18n entry — i18next initialization |
| `vite.config.ts` | Build entry — Vite configuration |
| `vitest.config.ts` | Test entry — Vitest configuration |

---

## 6. Build & Test Status

| Check | Status | Details |
|-------|--------|---------|
| **TypeScript (`tsc --noEmit`)** | FAIL | ~66+ type errors |
| **Tests (`vitest --run`)** | PASS | 7 files, 26 tests, 0 failures |
| **Build (`tsc --noEmit && vite build`)** | FAIL | Blocked by TypeScript errors |

### TypeScript Error Categories

| Category | Count | Root Cause |
|----------|-------|------------|
| `import.meta.env` type | 7 | Missing `/// <reference types="vite/client" />` — no Vite env type declarations |
| Missing `default` export (lazy pages) | 16 | All pages use named exports but `React.lazy()` requires `default` export |
| `Company` type missing fields | 6 | `SettingsPage.tsx` references `name_th`, `tax_id`, `phone`, `email`, `city`, `subscription_tier` not on interface |
| `SignUpWithPasswordCredentials` type | 1 | `authService.ts` uses `.email` but Supabase type expects `.phone` in newer API |
| `@sentry/react` missing module | 1 | Optional dependency not installed (guarded at runtime) |
| `vitest.config.ts` Plugin type mismatch | 1 | Vite 6 workspace vs Vitest 2.x bundled Vite version mismatch |
| Edge Function Deno types | ~34 | Expected — Edge Functions use Deno-specific imports/globals; need Deno type setup or separate tsconfig |

---

## 7. Edge Functions (9 functions + 2 shared)

| Function | Directory | Purpose |
|----------|-----------|---------|
| `mate-ai-chat` | `supabase/functions/mate-ai-chat/` | AI copilot chatbot — Gemini-powered conversational HR assistant |
| `generate-jd` | `supabase/functions/generate-jd/` | Generate job descriptions via Gemini with country-specific labor law context |
| `generate-offer-content` | `supabase/functions/generate-offer-content/` | Generate offer letter content via Gemini |
| `screen-resume` | `supabase/functions/screen-resume/` | AI resume screening — match candidates to jobs, score, skills gap analysis |
| `parse-resume` | `supabase/functions/parse-resume/` | Parse uploaded resume files into structured candidate data via Gemini |
| `send-email` | `supabase/functions/send-email/` | Send email notifications (applications, offers, reminders) |
| `send-document-reminders` | `supabase/functions/send-document-reminders/` | Scheduled document reminder emails |
| `whatsapp-webhook` | `supabase/functions/whatsapp-webhook/` | WhatsApp messaging integration webhook handler |
| `line-webhook` | `supabase/functions/line-webhook/` | LINE messaging integration webhook handler |
| `_shared/messageHandler.ts` | Shared | Cross-platform message handling (WhatsApp/LINE) — sends to mate-ai-chat |
| `_shared/utils.ts` | Shared | Supabase client factory, CORS headers, rate limiting |


---

## 8. Database Migrations (26 files)

### Schema Tables (01-15)
| # | File | Purpose |
|---|------|---------|
| 01 | `extensions.sql` | PostgreSQL extensions (pgcrypto, uuid-ossp, etc.) |
| 02 | `companies.sql` | Core `companies` table |
| 03 | `user_profiles.sql` | `user_profiles` table (linked to `auth.users`) |
| 04 | `jobs.sql` | `jobs` table (job postings) |
| 05 | `candidates.sql` | `candidates` table |
| 06 | `cv_documents.sql` | `cv_documents` table (uploaded CVs) |
| 07 | `applications.sql` | `applications` table (candidate-job links) |
| 08 | `interviews.sql` | `interviews` table |
| 09 | `offers.sql` | `offers` table |
| 10 | `documents.sql` | `documents` table (HR document vault) |
| 11 | `onboarding.sql` | `onboarding` tasks and checklists |
| 12 | `chat_messages.sql` | `chat_messages` table |
| 13 | `notifications.sql` | `notifications` table |
| 14 | `audit_logs.sql` | `audit_logs` table |
| 15 | `chat_platform_connections.sql` | WhatsApp/LINE connection tokens |

### Operations (16-19)
| # | File | Purpose |
|---|------|---------|
| 16 | `ai_usage_log.sql` | AI token usage tracking |
| 17 | `rate_limits.sql` | API rate limiting |
| 18 | `subscriptions.sql` | Plan/subscription management |
| 19 | `pdpa_compliance.sql` | Thai PDPA consent tracking |

### Security & Performance (20-23)
| # | File | Purpose |
|---|------|---------|
| 20 | `rls_functions.sql` | Row Level Security helper functions |
| 21 | `rls_policies.sql` | RLS policies per table |
| 22 | `indexes.sql` | Performance indexes |
| 23 | `triggers.sql` | Database triggers (audit, notifications) |

### Infrastructure (24-26)
| # | File | Purpose |
|---|------|---------|
| 24 | `analytics_functions.sql` | Analytics/reporting SQL functions |
| 25 | `storage_buckets.sql` | Storage bucket definitions (CVs, documents) |
| 26 | `anonymize_function.sql` | Data anonymization (GDPR/PDPA compliance) |

---

## 9. Dependencies

### Production Dependencies (26 packages)

| Package | Purpose |
|---------|---------|
| `@google/genai` ^2.4.0 | Gemini AI API client |
| `@hookform/resolvers` ^3.9.0 | Zod resolver for react-hook-form |
| `@react-pdf/renderer` ^4.1.0 | PDF generation (offer letters) |
| `@supabase/supabase-js` ^2.46.0 | Supabase client SDK |
| `@tanstack/react-query` ^5.60.0 | Server state management |
| `class-variance-authority` ^0.7.0 | Component variant definitions |
| `clsx` ^2.1.0 | Conditional class merging |
| `date-fns` ^4.1.0 | Date utilities |
| `date-fns-tz` ^3.2.0 | Timezone-aware date utils |
| `i18next` ^24.0.0 | Internationalization framework |
| `i18next-browser-languagedetector` ^8.0.0 | Browser language detection |
| `i18next-http-backend` ^3.0.0 | Lazy load locale JSONs |
| `lucide-react` ^0.546.0 | Icon library |
| `motion` ^12.23.24 | Animation library (Framer Motion fork) |
| `react` ^19.0.1 | React core |
| `react-dom` ^19.0.1 | React DOM renderer |
| `react-dropzone` ^15.0.0 | File drag-and-drop upload |
| `react-hook-form` ^7.54.0 | Form state management |
| `react-hot-toast` ^2.4.0 | Toast notifications |
| `react-i18next` ^15.0.0 | React i18next bindings |
| `react-router-dom` ^7.1.0 | Client-side routing |
| `recharts` ^2.15.0 | Charting library |
| `tailwind-merge` ^3.0.0 | Tailwind class conflict resolver |
| `zod` ^3.24.0 | Schema validation |
| `zustand` ^5.0.0 | Client state store |

### Dev Dependencies (15 packages)

| Package | Purpose |
|---------|---------|
| `@playwright/test` ^1.49.0 | E2E testing |
| `@tailwindcss/vite` ^4.1.14 | Tailwind CSS v4 Vite plugin |
| `@testing-library/jest-dom` ^6.6.0 | DOM matchers for Vitest |
| `@testing-library/react` ^16.1.0 | React testing utilities |
| `@types/express` ^4.17.21 | Express types (unused?) |
| `@types/node` ^22.14.0 | Node.js types |
| `@types/react` ^19.0.0 | React types |
| `@types/react-dom` ^19.0.0 | React DOM types |
| `@vitejs/plugin-react` ^5.0.4 | Vite React plugin |
| `@vitest/coverage-v8` ^2.1.0 | Vitest code coverage |
| `@vitest/ui` ^2.1.0 | Vitest UI dashboard |
| `eslint` ^9.0.0 | Linter |
| `jsdom` ^25.0.0 | DOM environment for tests |
| `prettier` ^3.4.0 | Code formatter |
| `tailwindcss` ^4.1.14 | Tailwind CSS framework |
| `typescript` ~5.8.2 | TypeScript compiler |
| `typescript-eslint` ^8.0.0 | ESLint TS integration |
| `vite` ^6.2.3 | Build tool |
| `vitest` ^2.1.0 | Unit/component test runner |

### Unused / Risky / Questionable Dependencies

| Dependency | Issue |
|------------|-------|
| `@sentry/react` | Referenced in `src/lib/sentry.ts` but **NOT** in `package.json` — import will fail at runtime if `VITE_SENTRY_DSN` is set |
| `@types/express` | In devDependencies but no Express server code found in repo |
| `Vitest 2.x` vs `Vite 6.x` | Version mismatch causing type conflict in `vitest.config.ts` — Vitest 2.x bundles its own Vite 5.x types |
| `react-hot-toast` | In devDependencies but imported conditionally — may be misplaced |

---

## 10. Risks Noticed (Before Editing)

### 🔴 Critical
1. **Build is broken** — 66+ TypeScript errors prevent both `tsc --noEmit` and `vite build`
2. **All page components lack `default` exports** — 16 errors in `src/router/index.tsx`. `React.lazy()` requires default exports, but pages use named exports. This means the router IS broken at runtime for those importing the lazy-load pattern (however, the current build output exists in `dist/` suggesting this may have previously worked or was last built before the page refactor)
3. **`.env.local` exists with likely secrets** — Contains Gemini API key. It IS in `.gitignore`, but present on disk. Verify it hasn't been committed if this repo is ever initialized for git.

### 🟡 High
4. **`@sentry/react` not installed** — will throw `ERR_MODULE_NOT_FOUND` at runtime if `VITE_SENTRY_DSN` env var is set
5. **Legacy code dead weight** — 12 files (`App.tsx` + 11 `*View.tsx` legacy components) + `mockData.ts` + `translations.ts` are never imported. Confusing to maintainers.
6. **Pre-commit hook blocks all commits** — `.husky/pre-commit` runs `type-check` which always fails; no commits possible until TS errors are fixed
7. **Empty placeholder directories** — `components/reports/`, `components/onboarding/`, `tests/e2e/`, `tests/integration/`, `tests/fixtures/` are vestigial

### 🟢 Low
8. **Hardcoded HTML title** — `index.html` still says `<title>My Google AI Studio App</title>` (should be "AdminMate AI")
9. **README is AI Studio template boilerplate** — No project-specific documentation
10. **`@types/express` in devDependencies** — Possibly unused; no Express server found
11. **Vitest 2.x / Vite 6.x type conflict** — `vitest.config.ts` has Plugin type mismatch; fixed by upgrading to Vitest 3.x or using `satisfies` pattern
12. **Edge Function modules are Deno-specific** — Cannot be type-checked by standard TypeScript; need `deno-types` or separate `tsconfig`

---

## 11. Unknowns Requiring Verification

| # | Question | How to Verify |
|---|----------|---------------|
| 1 | Is the router actually functional at runtime? The lazy() + default export issue may already cause runtime failure. | `npm run dev` and test navigation |
| 2 | Does the `.env.local` contain real credentials that should be rotated? | Read `.env.local`, check if Supabase/Gemini keys are production or sandbox |
| 3 | Are the 26 migrations idempotent and ordered correctly? Timestamps are all `202401010000xx` — suspiciously sequenced. | Review each SQL file for correct `CREATE IF NOT EXISTS` or migration check |
| 4 | What version was the `dist/` directory last built from? It exists and contains JS chunks but the current source doesn't typecheck. | Check `dist/index.html` timestamp, compare to `git log` (but no git exists) |
| 5 | Are the Edge Functions deployed and functional? They depend on Supabase project configuration. | Check Supabase Dashboard or `supabase functions list` |
| 6 | Is `src/pages/hiring/HiringPage.tsx` connected to any route? Not in `src/router/index.tsx`. | Grep for `HiringPage` imports |
| 7 | What is the intended target audience? SME HR in Thailand? Multi-country? | Read license, more files, or ask product owner |
| 8 | Why are the only i18n locale files for `id` and `vi` in `common.json` but not `recruitment.json`? | Check if Indonesian/Vietnamese are WIP |
| 9 | Does `src/services/authService.ts:13` actually work at runtime? The `SignUpWithPasswordCredentials` type changed in Supabase JS v2 — the `.email` property may not exist on the new phone-based signup flow. | Run auth flow test or review Supabase JS v2 migration guide |
| 10 | Are there any `.env` or `.env.local` files tracked in the (missing) git history? | Would need to initialize git and check `git log -- all .env*` |

---

## Appendix A: npm Scripts Reference

| Script | Command |
|--------|---------|
| `dev` | `vite --port=5173 --host=0.0.0.0` |
| `build` | `tsc --noEmit && vite build` |
| `preview` | `vite preview` |
| `lint` | `eslint src/ --ext .ts,.tsx` |
| `type-check` | `tsc --noEmit` |
| `test` | `vitest` |
| `test:ui` | `vitest --ui` |
| `test:coverage` | `vitest run --coverage` |
| `test:e2e` | `playwright test` |
| `test:e2e:ui` | `playwright test --ui` |
| `clean` | `rm -rf dist` |

## Appendix B: CI/CD Pipeline

```
Push/PR → quality job (ubuntu-latest, Node 20):
  1. npm ci
  2. npm run type-check   ← currently FAILS
  3. npm run lint
  4. npm run test -- --run  ← PASSES (26 tests)
  
→ deploy-preview  (if not main branch): Vercel preview via amondnet/vercel-action
→ deploy-production (if main branch):   Vercel production via amondnet/vercel-action
```

**CI is currently BLOCKED** at step 2 (type-check fails). No deployments can proceed until TS errors are resolved.
