# Codebase Structure

**Analysis Date:** 2026-06-19

## Directory Layout

```
adminmate-ai/
├── src/
│   ├── main.tsx              # App entry — providers, error handler, i18n init
│   ├── index.css             # Global styles (Tailwind v4)
│   ├── router/               # React Router config + AuthGuard
│   ├── stores/               # Zustand stores (auth, UI)
│   ├── components/
│   │   ├── ui/               # 19 UI primitives (Button, Card, Dialog, etc.)
│   │   ├── shared/           # 11 shared components (ErrorState, LoadingState, EmptyState)
│   │   ├── layout/           # AppLayout, Sidebar, Header, MobileNav, etc.
│   │   └── [domain]/         # Domain components: auth, jobs, candidates, chat, etc.
│   ├── pages/                # 15 route-level page directories/files
│   ├── hooks/                # 17 React Query + domain hooks
│   ├── services/             # 23 Supabase service singletons
│   ├── lib/                  # 14 infrastructure modules
│   ├── types/                # 2 type definition files
│   └── utils/                # Utility functions (csvParser, etc.)
├── tests/
│   ├── unit/                 # 22 Vitest test files
│   ├── integration/          # 1 integration test file
│   └── chaos/                # 4 chaos test files
├── e2e/                      # 22 Playwright E2E spec files + setup
├── public/
│   └── locales/              # i18n JSON files (5 languages × 12 namespaces)
├── supabase/                 # Supabase Edge Functions + migrations
├── playwright/               # Playwright auth state storage
└── Config files: eslint.config.mjs, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts
```

## Directory Purposes

**`src/components/ui/`:**
- Purpose: Reusable presentation-only UI primitives
- Contains: 19 component files (Button, Card, Dialog, Select, Tabs, Accordion, etc.)
- Key files: `Button.tsx` (133 lines — ripple effects, variants, sizes, Slot support), `Card.tsx` (46 lines — Card/CardHeader/CardContent/CardFooter pattern), `Dialog.tsx`, `Slot.tsx`
- Pattern: Tailwind v4 with CSS variable-based colors, `cn()` utility for class merging

**`src/components/shared/`:**
- Purpose: Cross-domain shared components with business logic
- Contains: 11 components (EmptyState, ErrorState, LoadingState, ConfirmDialog, StatCard, AnimatedCounter, AnimatedPage, ScrollReveal, StaggeredList, SubscriptionGate)
- Key files: `LoadingState.tsx` (276 lines — 6 skeleton variants), `SubscriptionGate.tsx` (84 lines — feature gating by plan tier)
- Pattern: Generic props interfaces, optional action callbacks, i18n support via `useTranslation`

**`src/components/layout/`:**
- Purpose: App shell — header, sidebar, mobile nav, theme toggle, notifications
- Key files: `AppLayout.tsx` (50 lines — main layout with Sidebar + Header + ChatWidget + Toaster)
- Pattern: Composition — Outlet renders nested routes inside `main` element

**`src/pages/`:**
- Purpose: Route-level page components, all lazy loaded via `React.lazy()`
- Contains: Subdirectories for auth, recruitment, applicant, settings, documents, onboarding + standalone page files
- Key files: `DashboardPage.tsx` (287 lines — stats, pending docs, candidate table with search)

**`src/hooks/`:**
- Purpose: TanStack Query + auth orchestration
- Contains: 17 files — `useJobs.ts`, `useCandidates.ts`, `useAuth.ts`, `useDashboard.ts`, `useMediaQuery.ts`, etc.
- Pattern: Query key factory (`const KEYS = { all, list, detail }`), `useMutation` with toast side effects

**`src/services/`:**
- Purpose: Supabase data access layer
- Contains: 23 files — one per domain (job, candidate, application, interview, chat, document, etc.)
- Pattern: Singleton objects, direct Supabase calls, typed input interfaces (some), `Record<string, unknown>` (many)

**`src/lib/`:**
- Purpose: Cross-cutting infrastructure
- Contains: Supabase client, i18n config, error handler, performance tracker, Sentry, API client, session API, subscriptions, auth storage
- Key files: `supabase.ts` (Supabase client with custom auth config), `errorHandler.ts` (global error handling system)

**`tests/unit/`:**
- Purpose: Vitest unit tests mirroring `src/` directory structure
- Subdirectories: `components/`, `services/`, `stores/`, `utils/`, `lib/`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: App bootstrap
- `src/router/index.tsx`: Route definitions (30 routes)

**Configuration:**
- `vite.config.ts`: Build config with manual chunk splits
- `vitest.config.ts`: Test config with coverage thresholds
- `playwright.config.ts`: E2E config with storageState auth
- `tsconfig.json`: TypeScript config with strict mode
- `eslint.config.mjs`: Lint config (ESLint v9 flat config)
- `tailwind.config.js`: NOT present — Tailwind v4 uses CSS-based config via `@tailwindcss/vite` plugin

**Core Logic:**
- `src/stores/authStore.ts`: Auth state management (session, profile, company)
- `src/stores/uiStore.ts`: UI state (sidebar, modals, theme, language)
- `src/lib/errorHandler.ts`: Global error reporting pipeline
- `src/lib/api.ts`: HTTP fetch wrapper (safeFetch) — currently unused

**Testing:**
- `tests/setup.ts`: Global test setup (mocks Supabase + i18n)
- `tests/integration/services.test.ts`: Integration tests for 5 services

**i18n:**
- `public/locales/{en,th,vi,id,zh}/*.json`: 12 namespaces × 5 locales (60 files)
- `src/lib/i18n.ts`: i18next configuration

## Naming Conventions

**Files:**
- `kebab-case.ts` for non-component modules (`authStore.ts`, `query-client.ts`, `useJobs.ts`)
- `PascalCase.tsx` for React components (`ErrorBoundary.tsx`, `AppLayout.tsx`)
- Mixed: Some test files use `.test.ts` extension, component tests use `.test.tsx`

**Directories:**
- `kebab-case` for all directories (`auth/`, `layout/`, `recruitment/`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/pages/{domain}/{FeatureName}Page.tsx`
- Hooks: `src/hooks/use{FeatureName}.ts`
- Service: `src/services/{featureName}Service.ts`
- Components: `src/components/{domain}/{FeatureName}.tsx`
- Tests: `tests/unit/{category}/{featureName}.test.ts`

**New Component/Module:**
- Implementation: `src/components/{domain}/{ComponentName}.tsx` (UI primitives → `ui/`, shared → `shared/`, domain → domain directory)
- Tests: `tests/unit/components/{ComponentName}.test.tsx`

**Utilities:**
- Shared helpers: `src/lib/` for cross-cutting concerns, `src/utils/` for pure utility functions

**i18n strings:**
- Add keys to `public/locales/en/{namespace}.json`, then translate to `th/`, `vi/`, `id/`, `zh/`

## Special Directories

**`tests/fixtures/`:**
- Purpose: Test data factories and fixtures
- Generated: No
- Committed: Yes (currently empty — only `.gitkeep`)

**`e2e/`:**
- Purpose: Playwright E2E test specs
- Playwright auth state in `playwright/.auth/` (gitignored — generated by setup)

**`public/locales/`:**
- Purpose: i18n translation JSON files
- Generated: No (manually maintained)

**`supabase/`:**
- Purpose: Supabase Edge Functions and migrations
- Contains: Deno-based Edge Functions (`auth-session/`, `log-client-error/`, etc.)

---

*Structure analysis: 2026-06-19*
