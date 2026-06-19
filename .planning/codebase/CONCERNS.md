# Codebase Concerns

**Analysis Date:** 2026-06-19

## Tech Debt

**Services use `Record<string, unknown>` for data payloads:**
- Issue: `jobService.create(job: Record<string, unknown>)`, `jobService.update(id, updates: Record<string, unknown>)` bypass compile-time type safety
- Files: `src/services/jobService.ts:14,19`, `src/services/offerService.ts:49`, `src/services/bulkImportService.ts:17-18`, `src/services/notificationService.ts:23`, `src/services/searchService.ts:54-82`, `src/services/reportService.ts:88`
- Impact: Any invalid field compiles silently; runtime errors when Supabase rejects invalid columns. Also the main pattern used across the codebase (42+ occurrences).
- Fix approach: Define explicit `UpdateJobInput` / `CreateJobInput` types (like `candidateService.ts` already does for `CreateCandidateInput`/`UpdateCandidateInput`)

**safeFetch + safeFetchJson are defined but NOT used by any service:**
- Issue: `src/lib/api.ts` defines a robust fetch wrapper with timeout, retry, structured errors, performance tracking — but Supabase services bypass it entirely
- Files: `src/lib/api.ts` (227 lines), 23 service files use `supabase.from()` directly
- Impact: 227 lines of dead infrastructure. All services miss timeout handling, retry logic, and structured error enrichment
- Fix approach: Either remove the dead code, or wrap Supabase calls through safeFetch-compatible middleware

**Performance tracking infrastructure unused:**
- Issue: `src/lib/performance.ts` defines `trackQuery`, `trackEdgeFunction`, `trackPageLoad` — but no hook or service uses them
- Files: `src/lib/performance.ts` (232 lines). Only `initPageLoadMonitoring()` is called in `main.tsx` (line 15)
- Impact: No query duration tracking, no slow-query alerting in production. Incomplete instrumentation.
- Fix approach: Wire `trackQuery` into hooks via TanStack Query's `queryFn` wrapper, or remove unused code

**`as never` casts in auth code:**
- Issue: `authStore.ts:92` and `useSessionRestore.ts:28,46` use `as never` to force-set Supabase session types
- Files: `src/stores/authStore.ts:92`, `src/hooks/useSessionRestore.ts:28,46`
- Impact: TypeScript assumes these are correct; any mismatch in token shape surfaces at runtime
- Fix approach: Define proper session payload types matching the Edge Function response shape, use branded types

**Duplicate auth/profile/company fetch logic:**
- Issue: The same Supabase query chain (select user_profiles → select companies) is duplicated in 3 places:
  1. `authStore.ts` `initSession()` (lines 108-126)
  2. `authStore.ts` `subscribeAuth()` (lines 149-163)  
  3. `useAuth.ts` `loadProfile()` (lines 29-46)
  4. `useSessionRestore.ts` (lines 37-55)
- Files: `src/stores/authStore.ts`, `src/hooks/useAuth.ts`, `src/hooks/useSessionRestore.ts`
- Impact: If the profile/company query changes, all 4 copies must be updated. Risk of inconsistency.
- Fix approach: Extract `fetchProfile(userId)` and `fetchCompany(companyId)` into shared lib functions

## Known Bugs

**ID locale missing `chat.json` namespace entirely:**
- Symptoms: Indonesian users see English fallback for ALL chat UI (title, placeholder, status, error, retry, suggestions, thinking, clearChat)
- Files: Missing `public/locales/id/chat.json` (exists in EN/TH/VI/ZH)
- Trigger: User sets language to `id` and opens chat widget
- Workaround: Falls back to English via `fallbackLng` config in `i18n.ts`

**`_sessionInitPromise` race condition potential:**
- Issue: Module-level `_sessionInitPromise` (line 58) is a shared mutable singleton. If `initSession` is called after a `reset()`, the old promise may still resolve into a stale state
- Files: `src/stores/authStore.ts:58,76-77,134,176`
- Trigger: Rapid sign-out → sign-in cycle
- Fix approach: Use a generation counter to invalidate stale promise results

## Security Considerations

**User input in Supabase queries (potential SQL injection via RLS bypass):**
- Risk: `jobService.create(job: Record<string, unknown>)` and similar generic-record functions accept arbitrary keys. If Supabase RLS doesn't strictly validate columns, users could set fields they shouldn't.
- Files: All services using `insert(input)` where input is `Record<string, unknown>` or partial of a Supabase row
- Current mitigation: Supabase RLS policies and `select().single()` scoping. `candidateService` uses explicitly typed inputs.
- Recommendations: Enforce typed inputs across all services. Add Zod validation schemas for mutation payloads.

**`autoRefreshToken: false` may cause silent auth failures:**
- Risk: Token expiration is handled manually via Edge Function. If Edge Function `auth-session/refresh` fails, user gets no automatic token refresh
- Files: `src/lib/supabase.ts:15` — `autoRefreshToken: false`
- Current mitigation: Edge Function endpoints handle refresh with httpOnly cookies
- Recommendations: Add a periodic token refresh heartbeat that catches failures pre-expiration

**Sentry DSN check allows dynamic import bypass:**
- Risk: `if (import.meta.env.VITE_SENTRY_DSN)` check in `main.tsx:17` — any non-empty string triggers Sentry init
- Files: `src/main.tsx:17-19`
- Current mitigation: Sentry is only initialized with `import()` if DSN present
- Recommendations: Add format validation for DSN string

## Performance Bottlenecks

**`useAuth()` subscribes to entire auth store:**
- Problem: `const store = useAuthStore()` subscribes to ALL state changes (user, profile, company, loading, error, _langPref). Every store mutation re-renders any component using this hook.
- Files: `src/hooks/useAuth.ts:50`
- Cause: `useAuthStore()` without a selector subscribes to the entire store
- Improvement path: Use individual selectors or `useAuthStore(s => ({ user: s.user, profile: s.profile }))` with shallow comparison

**No `React.memo` on any component:**
- Problem: Zero components use `React.memo`. `StatCard`, `JobCard`, `EmptyState`, `LoadingState` re-render unconditionally on parent re-render.
- Files: All components in `src/components/`
- Improvement path: Wrap pure presentational components with `React.memo`. Especially `StatCard` (rendered in lists), `EmptyState` (no props change logic), `LoadingState` (no props change logic)

**`safeFetch` creates new AbortController per retry but doesn't abort previous:**
- Problem: In the retry loop (lines 101-193), each attempt creates a new `AbortController`. On retry, the previous controller is leaked (garbage collected, but the request may still be in-flight)
- Files: `src/lib/api.ts:102`
- Impact: Minor — abandoned fetch requests consume browser connection pool
- Improvement path: `controller.abort()` before creating new controller on retry

**Dashboard page has 3 separate useQuery calls:**
- Problem: `DashboardPage.tsx` makes 4 concurrent data requests — `useCandidates()` + 3 inline `useQuery` calls (dashboard stats, pending docs, overdue checklists). No data consolidation.
- Files: `src/pages/DashboardPage.tsx:37-72`
- Impact: Dashboard load triggers 4+ network round-trips; no aggregation query
- Improvement path: Use a single `dashboardService.getDashboardData()` that calls a Supabase RPC with all data

## Fragile Areas

**AuthGuard + CompanySetupGuard hydration logic:**
- Files: `src/router/AuthGuard.tsx:19-27,29-65,71-101`
- Why fragile: Hydration guard (`useHydrationGuard`) re-renders once hydrate completes. The `useEffect` for `initSession` depends on `hydrated` and `callInitSession` — if hydration timing changes, auth may not initialize.
- Safe modification: Add `onHydrationFinish` callback or make session init idempotent via `_sessionInitPromise`
- Test coverage: Only `tests/unit/components/AuthGuard.test.tsx` exists — no `CompanySetupGuard` tests

**ESLint config is minimal:**
- Files: `eslint.config.mjs` (43 lines)
- Why fragile: Only 2 custom rules on top of `js.configs.recommended` and `typescript-eslint.recommended`. No React hooks rules, no strict TypeScript rules, no import sorting, no a11y rules.
- Impact: Code quality issues (unused imports, missing hook deps) are only warnings, not errors. 42 `Record<string, unknown>` usages are not flagged.
- Fix approach: Add `react-hooks/recommended`, `@typescript-eslint/strict`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`

## Scaling Limits

**Zustand persist only saves `_langPref`:**
- Current: `partialize: (s) => ({ _langPref: s._langPref ?? 'en' })` — only language preference persists localStorage
- Limit: No offline support — all data requires network. Session is stored in httpOnly cookie (Edge Function) + in-memory Zustand.
- Scaling path: For progressive web app support, sync critical data to IndexedDB via Zustand persist

**All services query Supabase directly in browser:**
- Current: 23 service files call `supabase.from()` directly from the browser with the anon key
- Limit: Row-level security (RLS) is the only gating mechanism. Any column exposed in `select()` can be read if RLS is misconfigured.
- Scaling path: Move sensitive operations to Edge Functions, enforce strict RLS policies with column-level security

## Dependencies at Risk

**`@supabase/supabase-js` v2.46:**
- Risk: Direct browser client with anon key means all data access depends on RLS correctness
- Impact: Data leak if RLS policy has a flaw
- Migration plan: Wrap all writes through Edge Functions; keep reads direct

**`react-router-dom` v7.1:**
- Risk: Version 7 may have breaking changes from v6 (new framework mode). Current code uses classic `createBrowserRouter` which is stable.
- Impact: Low — old API should be supported for v7 lifecycle
- Monitoring: Watch for v8 deprecation warnings

## Missing Critical Features

**No runtime validation layer:**
- Problem: Zod is a dependency but not used for runtime data validation. All `supabase.from().select()` responses are trusted as-is.
- Blocks: Data integrity validation, API response shape guarantees, error enrichment with context
- Files: `package.json:57` — `zod: ^3.24.0` listed but unused in services/hooks

**No error enrichment in services:**
- Problem: All 23 services use bare `if (error) throw error` — no context, no user-friendly message, no severity classification
- Files: All files in `src/services/`
- Impact: When a DB query fails, the user sees raw Supabase error text (e.g. "insert into public.jobs violates row-level security")
- Fix approach: Wrap Supabase errors with domain context: `throw new AppError('Failed to create job', { cause: error, operation: 'job.create' })`

**No loading/error state patterns enforced in hooks:**
- Problem: Each hook returns TanStack Query's state directly (data, isLoading, isError, error). Pages must manually check all 3 states. No standardized wrapper.
- Impact: Every page re-implements the same loading/error/empty/success pattern. `DashboardPage.tsx` shows the pattern well, but it's boilerplate.
- Fix approach: Create a `useQueryWithStates()` wrapper or provide standardized query result type with `isLoading`/`isEmpty`/`isError` helpers

## i18n Coverage Gaps

**Missing translations by locale:**

| Locale | Total Keys | Missing | Missing % | Critical Issues |
|--------|-----------|---------|-----------|-----------------|
| EN | 1234 | 0 | 0% | Reference locale |
| TH | 1177 | 57 | 4.6% | Missing `common.landing.*` (~55 keys for landing page), `dashboard.empty_candidates_*` |
| VI | 1168 | 66 | 5.3% | Missing landing + pdpa consent keys |
| ID | 1152 | 82 | 6.6% | **Missing entire `chat.json` namespace** (12 keys), missing landing, pdpa, nav keys |
| ZH | 1168 | 66 | 5.3% | Missing landing + pdpa keys |

**Key issues:**
- ID locale: Missing entire `chat.json` file — chat widget completely untranslated
- All locales (except EN): Missing ~55 landing page keys — landing page is partially English on non-EN locales
- EN has 5 extra keys in `common.notifications.*` that don't exist in other locales (markAllRead, minutesAgo, title, justNow, empty)

## Dead Code

**`src/lib/api.ts`** (227 lines):
- `safeFetch`, `safeFetchJson`, `ApiError` class — fully defined but not imported or used by any service or hook
- `src/lib/chatIntents.ts` — existence noted, usage not verified

**`src/lib/performance.ts` query/edge function trackers** (lines 118-213):
- `trackQuery`, `trackEdgeFunction`, `trackCustom` — not used by any consumer
- Only `initPageLoadMonitoring()` and `trackPageLoad()` are initialized in `main.tsx`

**`src/utils/` directory:**
- `csvParser.ts` exports `toCSV` and `downloadCSV` — these ARE used in `JobsPage.tsx` — not dead

## Test Coverage Gaps

| Area | Files | Test Files | Coverage |
|------|-------|-----------|----------|
| Hooks | 17 | 1 (`useSessionRestore`) | **~5.9%** — 16 of 17 hooks untested |
| Pages | ~30+ | 0 | **0%** — all route-level pages untested |
| UI Components | 19 | 0 | **0%** — all Button, Card, Dialog primitives untested |
| Shared Components | 11 | 0 | **0%** — EmptyState, ErrorState, LoadingState untested |
| Lib (core) | 14 | 4 | **~28%** — api.ts, errorHandler.ts, performance.ts, subscriptions.ts untested |
| Services | 23 | 8 | **~35%** — mix of dedicated tests + integration coverage |
| Fixtures | - | Empty dir | No reusable test data factories exist |

**Priority gaps (high risk):**
- `useAuth.ts` — auth logic is the most critical path; zero tests for login, register, logout flows
- `errorHandler.ts` — error reporting is foundational; not tested
- `api.ts`/`safeFetch` — 227 lines of untested critical infrastructure
- All page components — no integration tests verifying data flow from hooks → rendering → user interaction

---

*Concerns audit: 2026-06-19*
