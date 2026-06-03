# Testing Guide — AdminMate AI

## Test Structure

```
tests/
├── unit/                    # Vitest — isolated unit tests
│   ├── components/          # Component tests (render + interaction)
│   ├── services/            # Service function tests (mocked Supabase)
│   ├── stores/              # Zustand store tests (direct state manipulation)
│   └── utils/               # Pure function tests
│       ├── cn.test.ts       # Tailwind className merge utility
│       ├── currency.test.ts # Currency formatting (THB, VND, IDR)
│       ├── date.test.ts     # Date formatting (date-fns + date-fns-tz)
│       └── validators.test.ts # Zod schema validation
├── integration/
│   └── services.test.ts     # Service layer integration with test DB
├── e2e/
│   ├── auth.spec.ts         # Login/register/forgot-password flows
│   └── recruitment.spec.ts  # Full recruitment pipeline E2E
├── fixtures/                # Test data JSON fixtures
└── setup.ts                 # Global test setup (mocks, polyfills)
```

## Running Tests

```bash
npm run test                 # Unit tests (watch mode)
npm run test -- --run        # Unit tests (single run)
npm run test:ui              # Vitest UI runner (visual debugger)
npm run test:coverage        # Coverage report (HTML + text)
npm run test:e2e             # Playwright E2E (headless)
npm run test:e2e:ui          # Playwright with debug UI
```

### Coverage Targets

- **Unit**: ≥ 80% line coverage on utils, services, and stores.
- **Integration**: ≥ 60% line coverage on service-calling components.
- **E2E**: All critical user journeys covered (not measured by line coverage).

## Mocking Strategy

### Supabase Client

```typescript
// In test setup or per-test file
vi.mock('src/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}))
```

### i18next

```typescript
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,  // Return key as-is for deterministic assertions
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
}))
```

### Zustand Stores

```typescript
// Direct state manipulation — no mock needed for unit tests
import { useAuthStore } from 'src/stores/authStore'

beforeEach(() => {
  useAuthStore.setState({
    session: { access_token: 'test', user: { id: '1' } },
    company: null,
  })
})
```

### No Real API Calls

Tests must never make real network calls. If a test attempts to reach Supabase, Gemini, Resend, LINE, or WhatsApp, it must be considered a broken test.

## Writing New Tests

### Unit Test (Vitest + Testing Library)

```typescript
// tests/unit/components/DataTable.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from 'src/components/shared/DataTable'

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status' },
  ]

  const rows = [
    { id: '1', name: 'John', status: 'Active' },
    { id: '2', name: 'Jane', status: 'Pending' },
  ]

  it('renders all rows', () => {
    render(<DataTable columns={columns} rows={rows} />)
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Jane')).toBeInTheDocument()
  })

  it('shows empty state when no rows', () => {
    render(<DataTable columns={columns} rows={[]} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('calls onRowClick when row is clicked', async () => {
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} rows={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('John'))
    expect(onRowClick).toHaveBeenCalledWith('1')
  })
})
```

### Service Test (with Supabase mock)

```typescript
// tests/unit/services/jobService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJobs, createJob } from 'src/services/jobService'

const mockSelect = vi.fn()
const mockInsert = vi.fn()

vi.mock('src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
  },
}))

describe('jobService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getJobs returns job list for company', async () => {
    const mockJobs = [{ id: '1', title: 'Engineer' }]
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
      }),
    })

    const jobs = await getJobs('company-1')
    expect(jobs).toEqual(mockJobs)
  })

  it('createJob handles Supabase error', async () => {
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Constraint violation' },
        }),
      }),
    })

    await expect(createJob({ title: '' })).rejects.toThrow()
  })
})
```

### Zustand Store Test

```typescript
// tests/unit/stores/authStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from 'src/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset to initial state before each test
    useAuthStore.setState({
      session: null,
      user: null,
      company: null,
    })
  })

  it('initial state is unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.session).toBeNull()
    expect(state.isAuthenticated).toBeDefined()
  })

  it('logout clears session', () => {
    useAuthStore.setState({
      session: { access_token: 't', user: { id: '1' } },
      company: { id: 1, name: 'TestCo' },
    })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().session).toBeNull()
  })
})
```

### E2E Test (Playwright)

```typescript
// tests/e2e/recruitment.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Recruitment Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@adminmate.ai')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('create a new job posting', async ({ page }) => {
    await page.click('[data-testid="nav-recruitment"]')
    await page.click('[data-testid="nav-jobs"]')

    await page.click('[data-testid="create-job-button"]')
    await page.fill('[data-testid="job-title-input"]', 'Senior Developer')
    await page.fill('[data-testid="job-department-input"]', 'Engineering')
    await page.click('[data-testid="submit-job-button"]')

    await expect(page.locator('text=Senior Developer')).toBeVisible()
  })

  test('drag candidate through pipeline stages', async ({ page }) => {
    await page.goto('/recruitment/pipeline')
    const candidateCard = page.locator('[data-testid="candidate-card"]').first()
    const targetColumn = page.locator('[data-testid="pipeline-column-interview"]')

    await candidateCard.dragTo(targetColumn)
    await expect(targetColumn.locator('[data-testid="candidate-card"]')).toHaveCount(1)
  })
})
```

## Test Configuration

### Vitest (`vitest.config.ts`)

- **Environment**: `jsdom` (browser-like DOM for component tests)
- **Setup file**: `tests/setup.ts` (global mocks, `@testing-library/jest-dom` matchers)
- **Coverage provider**: `v8` for fast instrumentation

### Playwright (`playwright.config.ts`)

- **Browsers**: Chromium (primary), Firefox, WebKit
- **Base URL**: `http://localhost:5173`
- **Web server**: `npm run dev` — Playwright auto-starts the dev server
- **Test directory**: `tests/e2e/`

## CI/CD Integration

```yaml
# Example GitHub Actions workflow
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: npm run type-check
    - run: npm run lint
    - run: npm run test -- --run
    - run: npm run test:coverage
    - run: npx playwright install --with-deps
    - run: npm run test:e2e
```
