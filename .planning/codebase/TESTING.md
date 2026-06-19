# Testing Patterns

**Analysis Date:** 2026-06-19

## Test Framework

**Runner:**
- **Vitest v2.1** with `@vitest/coverage-v8`
- Config: `vitest.config.ts` (28 lines)
- Environment: `jsdom` with `globals: true`

**Assertion Library:**
- Built-in Vitest (`expect`, `describe`, `it`)
- `@testing-library/jest-dom` for DOM matchers
- `@testing-library/react` v16 + `@testing-library/user-event` v14

**Run Commands:**
```bash
npm test                    # Run all unit/integration tests
npm run test:coverage       # Run with coverage report
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # Playwright UI mode
```

## Test File Organization

**Location:**
- Unit tests: `tests/unit/` (22 test files) — mirrors `src/` structure
- Integration tests: `tests/integration/` (1 file — `services.test.ts`)
- Chaos tests: `tests/chaos/` (4 files)
- E2E tests: `e2e/` (22 spec files + helpers)
- Component-level tests found in `src/lib/` (2 tests — `authStorage.test.ts`, `sessionApi.test.ts`)

**Naming:**
- `*.test.ts` or `*.test.tsx` — consistent
- Tests mirror source paths: `tests/unit/services/jobService.test.ts` tests `src/services/jobService.ts`

**Structure:**
```
tests/
├── unit/
│   ├── components/     (6 test files)
│   ├── lib/            (1 test file)
│   ├── services/       (8 test files)
│   ├── stores/         (1 test file)
│   └── utils/          (4 test files)
├── integration/
│   └── services.test.ts
├── chaos/
│   ├── database.chaos.test.ts
│   ├── integration.chaos.test.ts
│   ├── messaging.chaos.test.ts
│   ├── webhook.chaos.test.ts
│   └── run-chaos-tests.ts
├── fixtures/           (empty — only .gitkeep)
├── setup.ts            (test setup)
└── e2e/                (empty — actual e2e tests in /e2e/)
```

## Test Structure

**Suite Organization:**
```typescript
// tests/unit/services/jobService.test.ts
describe('jobService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getAll: returns jobs filtered by companyId', async () => {
    // Arrange: mock Supabase chain
    // Act: call service
    // Result: assert data + assert Supabase was called with correct table
  })
})
```

**Patterns:**
- `vi.hoisted()` for mock declarations at module level
- `vi.mock()` with factory function to replace Supabase client
- `vi.clearAllMocks()` in `beforeEach`
- Dynamic imports inside `it()` blocks for fresh module state: `const { fetchSessionStatus } = await import('./sessionApi')`
- Test data is inline — no factory/fixture functions used

## Mocking

**Framework:** `vi.mock()` + `vi.fn()` with chained mock return values.

**Patterns:**
```typescript
// Supabase chained mocks (integration/services.test.ts)
mockSupabase.from.mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
    }),
  }),
})
```

**What to Mock:**
- `@supabase/supabase-js` (globally in `tests/setup.ts`)
- `src/lib/supabase` (per-file via `vi.mock`)
- `react-i18next` (globally in `tests/setup.ts`) — `useTranslation` returns key as translation
- `src/stores/authStore` (per-file)

**What NOT to Mock:**
- Service functions themselves — tested as real imports with mocked Supabase
- Zustand stores are tested directly (`authStore.test.ts` calls `useAuthStore.getState()`)

## Fixtures and Factories

**Test Data:**
```typescript
// Inline in test files — no factory/fixture module
const mockJobs = [{ id: '1', title: 'Developer', company_id: 'c1', status: 'active' }]
```

**Location:**
- `tests/fixtures/` exists but is empty (only `.gitkeep`)
- No test data factories — all data created inline per test

## Coverage

**Requirements (vitest.config.ts):**
- Lines: 85%
- Functions: 85%
- Branches: 80%

**View Coverage:**
```bash
npm run test:coverage    # Generates text + lcov + html reports
```

**Reality:** Coverage thresholds are configured but likely NOT met given:
- 22 unit test files for 23 services + 17 hooks + 12 lib files + 19 UI components + 11 shared components
- Hooks: 0 of 17 hooks have dedicated unit tests (only `useSessionRestore.test.tsx`)
- Pages: 0 of ~30+ page components have tests
- UI components: 0 of 19 UI primitives have tests
- Shared components: 0 of 11 have tests

## Test Types

**Unit Tests (22 files):**
- Services: 8 files cover all major services (job, candidate, auth, document, interview, offer, onboarding, pdpa, search, signature, storage)
- Components: 6 files (ErrorBoundary, AuthGuard, LanguageSwitcher, NotificationBell, JobForm, PDFThaiFont)
- Stores: 1 file (authStore)
- Utils: 4 files (validators, date, currency, cn)
- Lib: 2 files in `src/lib/` (authStorage, sessionApi)
- Quality: Tests use `as any` for partial mocks (2 occurrences) — minor type bypass

**Integration Tests (1 file):**
- Single file `tests/integration/services.test.ts` (158 lines)
- Tests authService, jobService, candidateService, applicationService, chatService with chained Supabase mocks
- Tests mass assignment protection patterns for typed service inputs

**Chaos Tests (4 files):**
- Database, integration, messaging, webhook chaos test suites
- Unique — tests failure scenarios and edge cases

**E2E Tests (22 spec files + setup):**
- Located in `e2e/` directory (separate from `tests/`)
- Playwright with storageState auth
- Coverage: auth, dashboard, jobs, candidates, pipeline, interviews, hiring, onboarding, documents, chat, settings, reports, health, compliance, monitoring, mobile/i18n, MFA/2FA, a11y, security, dark mode
- 1 E2E helper file, 1 auth setup file
- `@axe-core/playwright` for automated accessibility testing (`a11y.spec.ts`)
- Mobile audit spec present

## Common Patterns

**Async Testing:**
```typescript
it('should return valid false on network error', async () => {
  mockFetch.mockRejectedValueOnce(new Error('Network error'))
  const { fetchSessionStatus } = await import('./sessionApi')
  const result = await fetchSessionStatus()
  expect(result.valid).toBe(false)
})
```

**Error Testing:**
```typescript
it('create: throws on database error', async () => {
  // ... mock Supabase to return error
  await expect(jobService.create({ title: 'Test Job', company_id: 'x' } as any)).rejects.toThrow('DB write error')
})
```

## Test Coverage Gaps

| Area | Files | Test Files | Gap |
|------|-------|-----------|-----|
| Hooks | 17 | 1 (`useSessionRestore`) | 16 hooks untested |
| Pages | ~30+ | 0 | All page-level integration untested |
| UI Components | 19 | 0 | All UI primitives untested |
| Shared Components | 11 | 0 | All shared components untested |
| Lib (core) | 14 | 4 | `api.ts`, `errorHandler.ts`, `performance.ts`, `subscriptions.ts` untested |
| Fixtures | - | Empty dir | No reusable test data factories |

---

*Testing analysis: 2026-06-19*
