# Release 26E.1 — E2E Test Harness

## Test Environment

| Item | Value |
|------|-------|
| Framework | Playwright 1.x via Vite 6.4 dev server |
| Test runner | `npx playwright test` (project `chromium-auth`, `chromium-hr`) |
| Base URL | `E2E_BASE_URL` env or `http://localhost:5173` |
| Vite server | Auto-started on `5173`, 60 s timeout |
| Workers | CI: 2, local: 1 |
| Retries | CI: 2, local: 1 |
| Timeout | Suite 90 s, expect 15 s, action 15 s, navigation 60 s |
| Artifacts | `screenshot: only-on-failure`, `trace: retain-on-failure`, `video: retain-on-failure` |

## Auth Strategy

- `auth.setup.ts` runs first, stores `playwright/.auth/hr.json`
- Auth specs (01-auth, 17-mfa, security, dark-smoke) run **without** storageState
- All HR specs (02–16) run with pre-authenticated `storageState`
- `company_id` derived from seeded test user; all queries scoped by tenant key

## Fixture Data

| Fixture | Purpose |
|---------|---------|
| `tests/fixtures/` | Shared test data (seeded via `supabase/seed.sql`) |
| `supabase/seed-test-user.sql` | Test HR user with known credentials |
| Supabase migrations | Applied via `supabase/migrations/` in order |

## Browser Matrix

| Browser | Auth Tests | HR Tests | Mobile | Status |
|---------|-----------|----------|--------|--------|
| Chromium (latest) | ✅ | ✅ | — | Primary |
| Firefox | — | — | — | Future |
| WebKit/Safari | — | — | — | Future |
| Chromium + touch | — | — | ✅ | mobile-audit.spec.ts |

## Execution Commands

```bash
# Full suite
npx playwright test

# Auth only
npx playwright test --project=chromium-auth

# HR (pre-auth)
npx playwright test --project=chromium-hr

# Single spec
npx playwright test e2e/04-candidates.spec.ts
```

## Vitest (Unit/Integration)

| Setting | Value |
|---------|-------|
| Environment | jsdom |
| Setup | `tests/setup.ts` |
| Coverage provider | v8 |
| Thresholds | lines: 85%, functions: 85%, branches: 80% |
| Coverage reporters | text, lcov, html |

```bash
npx vitest run           # run all
npx vitest run --coverage  # with coverage
```

## CI Integration

- Reporter: `github` in CI, `list` locally
- Screenshots, traces, and videos retained only on failure
- Auth setup runs as separate project dependency
