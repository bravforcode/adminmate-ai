# Coding Conventions

**Analysis Date:** 2026-06-19

## Naming Patterns

**Files:**
- `kebab-case.ts` or `kebab-case.tsx` for all files (`authStore.ts`, `query-client.ts`, `jobService.ts`)
- `PascalCase.tsx` for React components (`ErrorBoundary.tsx`, `DashboardPage.tsx`, `SubscriptionGate.tsx`)

**Functions:**
- `camelCase` for all functions and methods (`getAll`, `initSession`, `fetchSessionStatus`)
- `PascalCase` for React components and class constructors
- `snake_case` for Supabase column names in select queries and type fields (inherited from DB schema)

**Variables:**
- `camelCase` for all variables
- `UPPER_SNAKE_CASE` for constants (`DEFAULT_TIMEOUT_MS`, `DEFAULT_RETRIES`, `THEME_KEY`, `HR_ROLES`)
- `_prefixed` for "private" state fields intended for persistence only (`_langPref`)

**Types:**
- `PascalCase` for interfaces and types (`UserProfile`, `AppErrorPayload`, `AuthState`)
- `PascalCase` suffixed with `Props` for component props (`AuthGuardProps`, `StatCardProps`)
- `type` for unions and enums (`SubscriptionTier`, `ErrorSeverity`)

## Code Style

**Formatting:**
- **Prettier** (`.prettierrc` present) — no explicit config details found
- Single `class-variance-authority` NOT used for variants even though in deps — Button uses a plain object `buttonVariants` instead

**Linting:**
- **ESLint v9** with `@eslint/js` recommended + `typescript-eslint` recommended
- **Rules:** `@typescript-eslint/no-explicit-any` = `'warn'` (not error), `@typescript-eslint/no-unused-vars` = `'warn'` with `argsIgnorePattern: '^_'`
- **No React-specific rules** (no `react-hooks/exhaustive-deps`, no `react/jsx-no-target-blank`)
- **42 `Record<string, unknown>` usages** in source — this is the preferred pattern for "dynamic" data but weakens type safety

## Import Organization

**Order:**
1. React / framework imports (`react`, `react-router-dom`)
2. Third-party library imports (`@tanstack/react-query`, `zustand`)
3. Internal absolute imports (`@/lib/supabase`)
4. Relative imports (`../../lib/utils`)

**Path Aliases:**
- `@/*` maps to `./src/*` — configured in both `tsconfig.json` and `vite.config.ts` / `vitest.config.ts`
- Test files consistently use relative imports (`../../../src/services/jobService`), NOT `@/` alias

## Error Handling

**Patterns:**
- **Services:** Direct `throw error` — no error wrapping or enrichment:
  ```typescript
  // src/services/jobService.ts:6
  if (error) throw error
  ```
- **Mutations:** `onError: (e: Error) => toast.error(e.message)` — displays raw error to user
- **API layer:** `safeFetch` wraps errors in `ApiError` class with typed fields (`status`, `url`, `isTimeout`, `attempts`) + calls `reportError()` — **but safeFetch is not used by any service**
- **Error boundary:** Class component with `getDerivedStateFromError` + `componentDidCatch` — logs to Sentry + Supabase Edge Function + localStorage
- **Global listeners:** `window.onerror` + `window.onunhandledrejection` — logs via `sendToEndpoint` + local buffer + throttled toast
- **Pattern convention:** `Unknown` in catch blocks: `catch (e: unknown) { const message = e instanceof Error ? e.message : 'fallback' }`

## Logging

**Framework:** No logger library — pure `console.info`/`console.warn`/`console.error` gated behind `import.meta.env.DEV`.

**Patterns:**
- `[errorHandler]`, `[perf]`, `[safeFetch]` prefixes for log grouping:
  ```typescript
  if (import.meta.env.DEV) console.info('[perf] page load', mark)
  if (import.meta.env.DEV) console.warn('[safeFetch] attempt failed', { url, attempt, ... })
  ```

**Concern:** No production-grade logging — all debug logging stripped in production builds. Error logging via Sentry (optional) + custom Edge Function endpoint only.

## Comments

**When to Comment:**
- Minimal inline comments — most code is self-documenting via naming
- Section headers in router and nav files (`// ── HR / Admin / Manager routes ──────`)
- JSDoc/TSDoc on exported functions in `src/lib/subscriptions.ts` (`checkLimit`, `getUpgradeMessage`)
- License/header block at top of `src/lib/subscriptions.ts` and `src/components/shared/SubscriptionGate.tsx`
- `TODO` found once: `src/services/searchService.ts:24` — "Add server-side rate limiting to prevent brute-force enumeration attacks"

**JSDoc/TSDoc:**
- Minimal usage — not enforced. Only found in `subscriptions.ts` for 3 exported functions.

## Function Design

**Size:**
- Most service functions are 1-4 lines (single Supabase call)
- `useAuth.ts` `register` is 55 lines — largest single hook function
- `authStore.ts` `initSession` is 60 lines — handles session restore, profile fetch, company fetch with fallback logic
- `DashboardPage.tsx` is 287 lines — tightly couples data fetching, search, skeleton loading, and rendering

**Parameters:**
- Services: explicit parameters (`companyId: string`, `id: string`) or typed input objects (`CreateCandidateInput`)
- **Anti-pattern:** `Record<string, unknown>` used in `jobService.create`/`update`, `offerService.generateContent` — bypasses compile-time type checking
- **Mutation:** `useMutation` payloads use `{ id: string; data: Record<string, unknown> }` in `useJobs.ts`

**Return Values:**
- Services return Supabase `data` directly (typed via generic)
- Hooks return query/mutation result objects
- `safeFetchJson<T>` uses `as T` cast — unsafe if JSON shape doesn't match

## Module Design

**Exports:**
- Named exports for hooks and components (`export function useJobs()`)
- Default export for route-level pages (`export default DashboardPage`)
- Singleton objects for services (`export const jobService = { ... }`)
- Named exports for utilities and stores

**Barrel Files:**
- Not used — each component imports directly from source files
- `src/components/ui/` has 19 separate component files, no `index.ts` barrel

## React Patterns

**State Management:**
- Zustand stores use `(set, get) => ({ ... })` pattern with `persist` middleware
- `useAuthStore` uses partialize to only persist `_langPref` (not tokens/profile)
- `useUIStore` is plain Zustand (no persist) — theme reading/writes localStorage directly

**Effect Cleanup:**
- Debounced search in `JobsPage.tsx` properly cleans up timer: `useEffect(() => { const t = setTimeout(...); return () => clearTimeout(t) }, [searchInput])`
- `AuthGuard` hydration guard returns `unsub()` from `onFinishHydration`
- `useMediaQuery` properly removes listener: `return () => mql.removeEventListener('change', onChange)`

**Memoization:**
- `useMemo` used for filtered lists (`candidates?.filter(...)`, `jobs?.filter(...)`)
- `useCallback` used for search input handlers
- **Missing:** No `React.memo` found on any component — StatCard, JobCard, EmptyState all re-render on parent re-render
- **Missing:** No `useMemo` on query function callbacks — new function created every render (though TanStack Query handles identity internally)

**Re-render Optimization:**
- Zustand selectors used correctly: `useAuthStore(s => s.company)` (subscribes to only `company` changes)
- `useAuthStore()` without selector in `useSessionRestore.ts` and `useAuth.ts` subscribes to ALL state changes — potential unnecessary re-renders
- `useAuth.ts` line 50: `const store = useAuthStore()` — subscribes to everything; then destructures in render return

## TypeScript Strictness

**Settings (`tsconfig.json`):**
- `"strict": true` — enabled
- `"noImplicitAny": true` — enabled
- `"strictNullChecks": true` — enabled
- `"noUnusedLocals": true` — enabled
- `"noUnusedParameters": true` — enabled
- `"skipLibCheck": true` — enabled (common)

**Enforcement Reality:**
- `@typescript-eslint/no-explicit-any` is set to `'warn'` — NOT enforced as error; allows `any` to pass CI
- 2 `as any` casts in test files (mock globals)
- 4 `as never` casts in auth code (`authStore.ts` line 92, `useSessionRestore.ts` line 28, 46)
- 42+ `Record<string, unknown>` usages — the primary escape hatch pattern
- `as unknown as T` pattern in `safeFetchJson` and `performance.ts` — bypasses type system
- No strict `@typescript-eslint/strict` or `@typescript-eslint/strict-type-checked` config

---

*Convention analysis: 2026-06-19*
