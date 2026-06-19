# Architecture

**Analysis Date:** 2026-06-19

## Pattern Overview

**Overall:** Single-page Application (SPA) with route-based lazy loading, server state via TanStack Query, client state via Zustand, and Supabase as backend.

**Key Characteristics:**
- **Router-first**: No `App.tsx` — `main.tsx` renders `RouterProvider` directly; `AppLayout.tsx` wraps authenticated pages
- **Lazy routes**: All pages use `React.lazy()` with `<AnimatedPage>` wrapper; no eager page imports
- **Layer separation**: `services/` → data access, `hooks/` → query/mutation orchestration, `components/` → UI, `pages/` → composition
- **No feature modules**: All services are flat singletons; no dependency injection or module boundaries
- **Auth-gated routing**: `AuthGuard` wrapper checks hydration, session, company setup, and role before rendering children
- **HTTP-only cookie auth**: Primary auth via Supabase Edge Function (`auth-session`), falls back to standard `getSession()`
- **Error handler singleton**: `initGlobalErrorHandler()` in `main.tsx` attaches window-level error listeners

## Layers

**Services Layer (`src/services/`):**
- Purpose: Direct Supabase client calls (no abstraction over Supabase)
- Location: `src/services/` (23 files)
- Contains: CRUD operations via `supabase.from('table').select/insert/update/delete`
- Depends on: `src/lib/supabase.ts`
- Used by: Hooks layer (`src/hooks/`)
- Pattern: Singleton objects (`export const jobService = { getAll, getById, create, update }`)
- Concern: No error wrapping — raw Supabase errors thrown directly; use `throw error` with no context enrichment

**Hooks Layer (`src/hooks/`):**
- Purpose: TanStack Query query/mutation hooks + domain business logic
- Location: `src/hooks/` (17 files)
- Contains: `useQuery`/`useMutation` wrappers, auth orchestration (`useAuth.ts`)
- Depends on: Services, Zustand stores, Supabase
- Used by: Pages
- Pattern: Named query key factories (`const KEYS = { all: [...], list: (id) => [...], detail: (id) => [...] }`)

**UI Components Layer (`src/components/`):**
- Purpose: Reusable presentational and domain components
- Location: `src/components/{ui,shared,layout,chat,jobs,candidates,...}/`
- Contains: 18 subdirectories, 19 UI primitives, 11 shared components
- Pattern: Pure functional components with props; Radix UI primitives for interactive widgets
- Notable: `src/components/ui/` are all hand-rolled (Button, Card, etc.), not from shadcn/ui library

**Pages Layer (`src/pages/`):**
- Purpose: Route-level page composition, connects hooks to UI
- Location: `src/pages/` (15 entries)
- Contains: Dashboard, recruitment, settings, applicant pages — all lazy loaded
- Pattern: Each page fetches data (loading state) → renders (success state) → or shows error state

**Lib Layer (`src/lib/`):**
- Purpose: Infrastructure — Supabase client, i18n, Sentry, error handling, perf monitoring
- Location: `src/lib/` (16 files)
- Pattern: Utility singletons and initialization functions

## Data Flow

**Server State (TanStack Query):**

1. Page mounts → `useXxx()` hook fires `useQuery` with enabled flag
2. Query fn calls `service.getAll(companyId)` → `supabase.from().select()` 
3. Data flows back through React Query cache → page renders
4. Mutations use `useMutation` → `onSuccess` invalidates query key → toast notification

**Auth Flow:**

1. `main.tsx` → `initGlobalErrorHandler()` + `initPageLoadMonitoring()` 
2. `RouterProvider` renders public routes or `AuthGuard` wrapper
3. `AuthGuard` → checks Zustand persist hydration → calls `initSession()` 
4. `initSession()` → tries Edge Function `auth-session/status` → falls back to `supabase.auth.getSession()`
5. On valid session → fetches `user_profiles` → fetches `companies` → sets Zustand state
6. `authSubscription` listens for `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`

**State Management:**
- **Zustand** for client state: auth session + profile + company + UI sidebar/modal/theme
- **TanStack Query** for server state: all entity data (jobs, candidates, etc.)
- **URL state** for navigation: React Router v7 with `useNavigate`, `useLocation`
- **localStorage** for: auth token (via `authStorage.ts` in-memory shim), theme, language preference, persisted error buffer, Zustand persist (`_langPref` only)

## Key Abstractions

**AuthGuard (`src/router/AuthGuard.tsx`):**
- Purpose: Route-level auth enforcement with hydration guard, session init, role check, company setup check
- Pattern: Component wrapper with `useEffect` for session init, early returns for loading/redirect
- Concern: Same session init pattern is duplicated in `CompanySetupGuard` (lines 76-78 replicated logic)

**SafeFetch (`src/lib/api.ts`):**
- Purpose: HTTP fetch wrapper with timeout, retry, structured error, metadata logging
- Pattern: Configurable `SafeFetchOptions`, `ApiError` class with typed fields, retry logic (timeout/network/server errors)
- Status: NOT used by any service — Supabase client is used directly; this appears to be dead code or future infrastructure

**ErrorHandler (`src/lib/errorHandler.ts`):**
- Purpose: Global error listener + manual error reporting + local buffering + Edge Function logging
- Pattern: Singleton with throttle debounce for toasts
- Status: Properly initialized in `main.tsx`, used by `safeFetch` (which isn't used by services)

**Performance Tracking (`src/lib/performance.ts`):**
- Purpose: Track page load, query, edge function durations; report slow operations via error handler
- Pattern: `trackQuery`, `trackEdgeFunction`, `trackPageLoad` — generic async wrappers
- Status: `initPageLoadMonitoring()` called in `main.tsx`; trackers NOT used in any hook or service currently

## Entry Points

**`src/main.tsx`:**
- Triggers: Browser load
- Responsibilities: Initialize error handler, page load monitoring, i18n, React root mount with providers
- Provider hierarchy: `StrictMode > ErrorBoundary > QueryClientProvider > MotionConfig > RouterProvider`

**`src/router/index.tsx`:**
- Type: `createBrowserRouter` (React Router v7 classic router, not framework mode)
- Routes: 30 route entries — public (landing, auth), authenticated with `AuthGuard` wrapper, HR and applicant role-gated
- Catch-all: `path: '*'` → `<NotFoundPage />`

## Error Handling

**Strategy:** Multi-layer — global listeners (`error`/`unhandledrejection`), React Error Boundary, manual `reportError()`, Edge Function logging, local buffer fallback.

**Patterns:**
- Global: `window.addEventListener('error', ...)` + `window.addEventListener('unhandledrejection', ...)`
- React: Class-based `ErrorBoundary` component wrapping the entire app and nested around `AppLayout`
- Manual: `reportError()` called from `safeFetch` and performance tracker
- Toast: `react-hot-toast` with throttle (4s window) for non-critical errors
- Sentry: Optional — only loaded if `VITE_SENTRY_DSN` is set; dynamic import in `main.tsx`
- Service-level: All Supabase services `throw error` directly — no wrapping, no context enrichment, no severity assignment

## Cross-Cutting Concerns

**Logging:** `console.info`/`console.warn`/`console.error` in DEV mode only for error handler, performance, safeFetch. No structured production logging beyond Sentry + Edge Function.
**Validation:** Zod is a dependency (`package.json`) but not used in services/hooks — no runtime validation of Supabase responses or mutation inputs. `react-hook-form` + `@hookform/resolvers` used in forms.
**Authentication:** Supabase Auth + custom Edge Function for httpOnly cookie session restore. PKCE flow. `autoRefreshToken: false` — manual token refresh via Edge Function.
**Authorization:** Role-based route gating via `AuthGuard` `requiredRoles` prop. No fine-grained permission system beyond role checks.
**Accessibility:** 87+ `aria-*` attributes across src, skip-to-content link in `AppLayout`, role attributes on interactive elements, `role="status"` on loading states, `aria-live` on error/alerts.

---

*Architecture analysis: 2026-06-19*
