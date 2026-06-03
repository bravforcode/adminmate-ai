# Tests, DevOps & Production Readiness Audit

**Date:** 2026-06-03
**Project:** AdminMate AI
**Scope:** READ-ONLY audit of test infrastructure, CI/CD, deployment config, documentation, code quality, and dependencies.

---

## A. Test Infrastructure

### A1. Configuration

| Config File | Status | Notes |
|---|---|---|
| `vitest.config.ts` | OK | jsdom environment, `@vitejs/plugin-react`, `@` alias, globals enabled |
| `tests/setup.ts` | OK | `@testing-library/jest-dom` imported, supabase mocked globally, react-i18next mocked |
| `playwright.config.ts` | CONFIGURED | 3 browsers (chromium, firefox, webkit), baseURL `http://localhost:5173`, trace/screenshot on failure, webServer auto-starts `npm run dev` |
| Coverage thresholds | SET | lines: 70%, functions: 70%, branches: 65% — but these thresholds are aspirational (see coverage gap analysis below) |

### A2. Test Results

```
Test Files:  7 passed (7)
Tests:       26 passed (26)
Duration:    2.94s
```

All 26 unit tests pass. Zero failures.

### A3. Test File Inventory

| File | Tests | Quality Assessment |
|---|---|---|
| `tests/unit/utils/cn.test.ts` | 4 | Good — tests real `cn()` behavior with tailwind-merge conflicts |
| `tests/unit/utils/validators.test.ts` | 5 | Good — tests Zod schemas for valid/invalid inputs |
| `tests/unit/utils/date.test.ts` | 3 | Adequate — tests formatDateLocal, daysBetween, addDays |
| `tests/unit/utils/currency.test.ts` | 3 | Weak — only checks `toContain` and `toTruthy()` without verifying exact output |
| `tests/unit/stores/authStore.test.ts` | 6 | Good — tests Zustand store state transitions directly |
| `tests/unit/services/jobService.test.ts` | 3 | Weak — only tests mock chains, not actual service behavior |
| `tests/unit/services/onboardingService.test.ts` | 2 | Weak — only tests mock chains |
| `tests/e2e/` | **0 tests** | `.gitkeep` only — directory exists but is empty |
| `tests/integration/` | **0 tests** | `.gitkeep` only — directory exists but is empty |
| `tests/fixtures/` | **0 files** | `.gitkeep` only |

### A4. Test Quality Issues

1. **Supabase global mock in setup.ts is extremely shallow.** Service tests call `vi.mock('../../../src/lib/supabase')` again in each file, overriding the global mock. This duplication is confusing and error-prone.

2. **No React component tests exist.** `@testing-library/react` is in devDependencies, jsdom is configured, but zero component render tests were found.

3. **All service tests only test that `supabase.from()` is called with the right table name.** They do not test data transformation, error handling edge cases, or retry logic.

4. **No async hook tests.** `useAuth`, `useJobs`, `useCandidates`, etc. are untested.

---

## B. Test Coverage Analysis

### B1. Critical Paths with ZERO Tests

| Feature | Has Tests? | Risk |
|---|---|---|
| Auth flow (login, register, logout) | NO | **CRITICAL** — `useAuth.ts:56` has full login/register/logout logic but no tests |
| Job CRUD (create, read, update, delete) | PARTIAL (jobService mock only) | **HIGH** — `useJobs.ts` hooks, `JobForm.tsx`, `JobCard.tsx` all untested |
| AI JD generation (`generate-jd` edge function) | NO | **HIGH** — Gemini API integration, no fallback tests |
| CV upload & parsing (`parse-resume` edge function) | NO | **HIGH** — `CVUploader.tsx`, `CVParseResult.tsx`, `storageService.ts` untested |
| Pipeline status transitions | NO | **HIGH** — `KanbanBoard.tsx`, `ApplicationCard.tsx`, `ApplicationDrawer.tsx` untested |
| Offer creation & PDF generation | NO | **HIGH** — `OfferForm.tsx`, `OfferLetterPDF.tsx`, `PDFDownloadButton.tsx` untested |
| Interview scheduling | NO | **HIGH** — `InterviewsPage.tsx`, `ScheduleInterviewForm.tsx` untested |
| Onboarding checklist | PARTIAL (mock only) | **MEDIUM** — `OnboardingMgmtPage.tsx` untested |
| Chat AI responses (`mate-ai-chat` edge function) | NO | **MEDIUM** — `ChatInterface.tsx`, `ChatPage.tsx` untested |
| LINE/WhatsApp webhooks | NO | **MEDIUM** — edge functions exist but no integration/contract tests |
| Document management | NO | **MEDIUM** — `DocumentsPage.tsx` has 122 lines, no tests |
| Compliance/PDPA | NO | **LOW** — `CompliancePage.tsx` has 110 lines, no tests |
| Dashboard/Reports | NO | **LOW** |
| Company setup | NO | **LOW** |
| AuthGuard routing | NO | **MEDIUM** — guards redirect to login, setup-company, etc. |

### B2. Estimated Actual Coverage

With only 26 utility/store tests covering ~200 lines of isolated utils/store code, and ~3000+ lines of untested React components/hooks/services/pages, the actual code coverage is likely **< 10%**. The configured thresholds of 70% lines / 70% functions / 65% branches would fail if run with `--coverage`.

---

## C. CI/CD Pipeline

### C1. CI Configuration (`.github/workflows/ci.yml`)

```yaml
Triggers:
  push: [main, develop]
  PR:   [main]

Jobs:
  quality (ubuntu-latest, node 20):
    - npm ci
    - npm run type-check   # CURRENTLY FAILS (see below)
    - npm run lint          # CURRENTLY HAS 3 ERRORS
    - npm run test -- --run # PASSES (26/26)

  deploy-preview (on non-main, needs: quality):
    - amondnet/vercel-action@v25
    - secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
    - environment: preview

  deploy-production (on main, needs: quality):
    - amondnet/vercel-action@v25
    - secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
    - vercel-args: --prod --yes
    - environment: production
```

### C2. CI Blockers

| Check | Status | Details |
|---|---|---|
| `npm run type-check` | **FAILS** | TypeScript errors: missing `import.meta.env` type declarations, missing `@sentry/react` module, lazy import mismatch (`Property 'default' is missing in type`), `vitest.config.ts` vite/vitest plugin type conflict |
| `npm run lint` | **FAILS (3 errors)** | `prefer-const` (PipelineView.tsx:63), `no-non-null-asserted-optional-chain` (ApplicationDrawer.tsx:21, CandidateDetailPage.tsx:40) |
| `npm run build` | **FAILS** | Same type-check errors cascade to build |
| `npm run test` | **PASSES** | 26/26 |

The `quality` job will ALWAYS fail in CI because `type-check` and `lint` both fail. This means **neither `deploy-preview` nor `deploy-production` can ever run** (they have `needs: quality`).

### C3. CI Quality Assessment

- **Security concern:** `amondnet/vercel-action@v25` is pinned to major version only — should pin to commit SHA for supply-chain security.
- **No build step in CI.** The quality job only type-checks, lints, and tests — does not run `npm run build` (which would catch build failures). The build is only run indirectly by `vercel-action`.
- **No coverage reporting.** Test coverage is not uploaded anywhere (Codecov, Coveralls, etc.).
- **No OS matrix.** Only runs on `ubuntu-latest`.
- **No Node version matrix.** Only Node 20.

---

## D. Deployment Configuration

### D1. `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [...]
}
```

**Security headers present:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**Missing security headers:**
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`
- `Cross-Origin-Embedder-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`

### D2. Environment Variables

`.env.example` is present but **incomplete**:

| Present | Missing (but referenced in code) |
|---|---|
| `VITE_SUPABASE_URL` | `VITE_GEMINI_MODEL` (used in `ai-config.ts:2`) |
| `VITE_SUPABASE_ANON_KEY` | `Supabase Edge Function env vars`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `LINE_CHANNEL_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `DEFAULT_COMPANY_ID` |
| `VITE_APP_URL` | `VITE_SENTRY_DSN` (already in example but empty) |
| `VITE_APP_NAME` | `GEMINI_API_KEY` (commented out, but needed for edge functions) |
| `VITE_ENABLE_LINE` | |
| `VITE_ENABLE_WHATSAPP` | |
| `VITE_ENABLE_ZALO` | |
| `VITE_SENTRY_DSN` (empty) | |

**Issue:** Edge function env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, LINE_CHANNEL_SECRET, WHATSAPP_VERIFY_TOKEN) are NOT documented in `.env.example`. Developers deploying Supabase functions need these.

### D3. `package.json` Scripts

| Script | Command | Works? |
|---|---|---|
| `dev` | `vite --port=5173 --host=0.0.0.0` | Yes |
| `build` | `tsc --noEmit && vite build` | **NO** — tsc fails |
| `preview` | `vite preview` | Yes |
| `lint` | `eslint src/ --ext .ts,.tsx` | **Has 3 errors** |
| `type-check` | `tsc --noEmit` | **Fails** |
| `test` | `vitest` | Yes (dev mode) |
| `test:ui` | `vitest --ui` | Yes |
| `test:coverage` | `vitest run --coverage` | Would likely fail due to coverage thresholds not being met |
| `test:e2e` | `playwright test` | **No tests to run** |
| `test:e2e:ui` | `playwright test --ui` | **No tests to run** |
| `clean` | `rm -rf dist` | Won't work on Windows |

---

## E. Documentation

### E1. README.md

**Rating: 1/10**

The README is a default AI Studio template. It:
- Shows a generic Google AI banner image
- Has 3 lines of setup instructions (clone, `npm install`, set `GEMINI_API_KEY`)
- Links to an AI Studio URL (`https://ai.studio/apps/...`)
- **Does NOT mention:** Supabase setup, database migrations, edge function deployment, test commands, architecture, tech stack, API docs, contributing guide

### E2. Missing Documentation

- [ ] Architecture document (component tree, data flow, route map)
- [ ] API documentation (Supabase Edge Function endpoints)
- [ ] Database schema documentation (26 migrations exist but no ERD or schema docs)
- [ ] Deployment guide (Vercel + Supabase setup steps)
- [ ] Testing guide (how to write tests, run e2e)
- [ ] Environment variable guide for edge functions
- [ ] CHANGELOG.md

### E3. `.env.example` Completeness

**Rating: 6/10**

Missing edge function env vars (see D2). The commented-out `GEMINI_API_KEY` line is misleading — this is required for edge functions, not optional.

---

## F. Code Quality Scan

### F1. TODO/FIXME/HACK Comments

**Count: 0** — No TODO, FIXME, HACK, or XXX comments found in `src/`. Clean.

### F2. `console.log` Statements

**Count: 0** — No `console.log` statements found in `src/`. Clean. (One `console.warn` exists in `src/lib/supabase.ts:7` for missing env vars — appropriate.)

### F3. Hardcoded URLs/IPs

**Count: 12 instances across 5 files:**

| File | URL | Risk |
|---|---|---|
| `src/index.css:1` | `https://fonts.googleapis.com/...` | LOW — standard font CDN |
| `src/lib/supabase.ts:11` | `http://localhost:54321` | **MEDIUM** — fallback when `VITE_SUPABASE_URL` not set |
| `src/utils/constants.ts:2` | `http://localhost:5173` | LOW — dev fallback for APP_URL |
| `src/components/pdf/OfferLetterPDF.tsx:6-7` | `https://fonts.gstatic.com/...` | LOW — standard font CDN |
| `src/components/interviews/ScheduleInterviewForm.tsx:77` | `https://meet.google.com/...` | LOW — placeholder text only |
| `src/mockData.ts:175,241` | Unsplash URLs | LOW — old mock data |
| `src/components/CvBuilderView.tsx:65` | `https://linkedin.com/...` | LOW — old component |
| `src/components/SettingsView.tsx:59-61` | Unsplash URLs | LOW — old component |

### F4. Unused Old Files (Previous Version)

The project has been partially refactored from an AI Studio prototype to a real app but the old code was NOT removed:

| Old File | Lines | Still Imported By |
|---|---|---|
| `src/App.tsx` | 233 | **NOTHING** (not in `main.tsx`) |
| `src/types.ts` | 113 | Old components only |
| `src/mockData.ts` | 243 | Old components only |
| `src/translations.ts` | 114 | Old components only |
| `src/components/Header.tsx` | 299 | `App.tsx` only (which is unused) |
| `src/components/LoginView.tsx` | 239 | `App.tsx` only |
| `src/components/DashboardView.tsx` | 331 | `App.tsx` only |
| `src/components/PipelineView.tsx` | 278 | `App.tsx` only |
| `src/components/OnboardingManagerView.tsx` | 183 | `App.tsx` only |
| `src/components/OnboardingChecklistView.tsx` | ~100 | `App.tsx` only |
| `src/components/OnboardingAssistantView.tsx` | ~100 | `App.tsx` only |
| `src/components/CvBuilderView.tsx` | ~100+ | `App.tsx` only |
| `src/components/JdGeneratorView.tsx` | ~100 | `App.tsx` only |
| `src/components/ResumeScreeningView.tsx` | ~100+ | `App.tsx` only |
| `src/components/SettingsView.tsx` | ~100+ | `App.tsx` only |

**Total dead code: ~2,500+ lines of unused legacy code**, plus `mockData.ts` (243 lines) and `translations.ts` (114 lines).

The new router (`src/router/index.tsx`) uses `src/pages/` (new pages with Supabase integration) — NOT the old `src/components/` views. The old components are completely dead code.

### F5. Lint Results Summary

- **138 total problems** (3 errors, 135 warnings)
- **3 blocking errors:** `prefer-const` (1), `no-non-null-asserted-optional-chain` (2)
- **Major warning categories:**
  - `no-unused-vars`: ~50+ instances across old and new components
  - `no-explicit-any`: ~60+ instances (services, hooks, components all use `any` extensively)
  - Unused imports: ~30+ instances

### F6. TypeScript Errors (Blocking Build)

- `import.meta.env` type declarations missing (no `vite-env.d.ts` or `vite/client` reference)
- `@sentry/react` module not installed but imported in `src/lib/sentry.ts:4`
- Lazy imports in `src/router/index.tsx` use named exports but `React.lazy` requires default exports
- `src/stores/authStore.ts` Company interface missing `name_th`, `tax_id`, `phone`, `email`, `city`, `subscription_tier`
- `src/services/authService.ts:13` destructures `credentials.email` but `SignUpWithPasswordCredentials` may use `phone`
- `vitest.config.ts` has vite/vitest plugin type conflict (different vite versions)

---

## G. Dependency Audit

### G1. Outdated Packages (Major Versions Available)

**17 packages have major version updates available:**

| Package | Current | Latest | Gap |
|---|---|---|---|
| `@hookform/resolvers` | 3.10.0 | 5.4.0 | 2 major |
| `@types/express` | 4.17.25 | 5.0.6 | 1 major |
| `@types/node` | 22.19.19 | 25.9.1 | 3 major |
| `@vitejs/plugin-react` | 5.2.0 | 6.0.2 | 1 major |
| `@vitest/coverage-v8` | 2.1.9 | 4.1.8 | 2 major |
| `@vitest/ui` | 2.1.9 | 4.1.8 | 2 major |
| `eslint` | 9.39.4 | 10.4.1 | 1 major |
| `i18next` | 24.2.3 | 26.3.0 | 2 major |
| `i18next-http-backend` | 3.0.6 | 4.0.0 | 1 major |
| `jsdom` | 25.0.1 | 29.1.1 | 4 major |
| `lucide-react` | 0.546.0 | 1.17.0 | 1 major |
| `react-i18next` | 15.7.4 | 17.0.8 | 2 major |
| `recharts` | 2.15.4 | 3.8.1 | 1 major |
| `typescript` | 5.8.3 | 6.0.3 | 1 major |
| `vite` | 6.4.3 | 8.0.16 | 2 major |
| `vitest` | 2.1.9 | 4.1.8 | 2 major |
| `zod` | 3.25.76 | 4.4.3 | 1 major |

### G2. Vestigial Dependencies

| Package | Location | Status |
|---|---|---|
| `@types/express` | devDependencies | **UNUSED** — zero imports of `express` in `src/`. Vestigial from an earlier iteration. Remove. |
| `@sentry/react` | NOT in package.json | **MISSING** — imported in `src/lib/sentry.ts:4` but never installed. Either add it or remove the sentry.ts file. |

### G3. Dependency Versions

- `react` 19.0.1, `react-dom` 19.0.1 — current
- `@supabase/supabase-js` 2.46.0 — stable
- `@tanstack/react-query` 5.60.0 — stable
- `zustand` 5.0.0 — current major
- `tailwindcss` 4.1.14 — current major (v4)
- `vite` 6.4.3 — current major

No version conflicts detected between direct dependencies.

### G4. `supabase/` Directory

**26 migration files** (`20240101000001` to `20240101000026`) covering:
- Extensions, companies, user_profiles, jobs, candidates, cv_documents, applications, interviews, offers, documents, onboarding, chat_messages, notifications, audit_logs, chat_platform_connections, ai_usage_log, rate_limits, subscriptions, pdpa_compliance, rls_functions, rls_policies, indexes, triggers, analytics_functions, storage_buckets, anonymize_function

**10 edge functions:** `generate-jd`, `generate-offer-content`, `line-webhook`, `mate-ai-chat`, `parse-resume`, `screen-resume`, `send-document-reminders`, `send-email`, `whatsapp-webhook`, plus `_shared/` utilities.

**Note:** All migration file names use `202401010000` prefix — they all share the same timestamp (`2024-01-01T00:00:00`). Supabase applies migrations by filename sort order, so this works but is unconventional (real timestamps would be clearer).

---

## Critical Issues

### ISSUE: CI/CD Pipeline is Completely Broken

- **Severity:** CRITICAL
- **File:** `.github/workflows/ci.yml`
- **Description:** The `quality` job runs `type-check` and `lint`, both of which fail. Because `deploy-preview` and `deploy-production` depend on `quality`, NO DEPLOYMENTS CAN OCCUR. The CI pipeline is dead code.
- **Fix:** Fix type-check and lint errors, then verify CI passes end-to-end.

### ISSUE: TypeScript Build Fails (Blocking Any Deployment)

- **Severity:** CRITICAL
- **Files:** `src/router/index.tsx`, `src/lib/sentry.ts`, `src/lib/supabase.ts`, `src/lib/ai-config.ts`, `src/stores/authStore.ts`, `vitest.config.ts`
- **Description:** 30+ TypeScript errors prevent `npm run build` and `npm run type-check` from succeeding. Key issues: missing `import.meta.env` types, missing `@sentry/react` module, lazy import named-vs-default export mismatch, incomplete `Company` interface.
- **Fix:** Add `vite/client` type reference. Add `@sentry/react` or remove `sentry.ts`. Change page exports to `export default`. Fix `Company` interface.

### ISSUE: 2,500+ Lines of Dead Legacy Code

- **Severity:** HIGH
- **Files:** `src/App.tsx`, `src/mockData.ts`, `src/translations.ts`, `src/types.ts`, `src/components/Header.tsx`, `src/components/LoginView.tsx`, `src/components/DashboardView.tsx`, `src/components/PipelineView.tsx`, `src/components/OnboardingManagerView.tsx`, `src/components/OnboardingChecklistView.tsx`, `src/components/OnboardingAssistantView.tsx`, `src/components/CvBuilderView.tsx`, `src/components/JdGeneratorView.tsx`, `src/components/ResumeScreeningView.tsx`, `src/components/SettingsView.tsx`
- **Description:** The old AI Studio prototype code is still in the source tree but the new router (`src/router/index.tsx`) does not use any of it. This adds ~2,500 lines of dead code that still gets type-checked and linted, producing 50+ warnings and some errors.
- **Fix:** Remove all old view components, `App.tsx`, `mockData.ts`, `translations.ts`, and `types.ts`. The new code under `src/pages/` and `src/components/layout/` is the active codebase.

### ISSUE: Zero E2E or Integration Tests

- **Severity:** HIGH
- **Files:** `tests/e2e/.gitkeep`, `tests/integration/.gitkeep`
- **Description:** Playwright is configured for 3 browsers with auto-server-start, retries, screenshots on failure, and trace retention — but zero tests exist. There is no automated verification that any page renders or any user flow works.
- **Fix:** Write E2E smoke tests for critical paths: login, job creation, candidate upload, pipeline kanban, offer creation.

### ISSUE: No Component Tests Despite Having Testing Library Setup

- **Severity:** HIGH
- **Files:** All `src/components/`, `src/pages/`
- **Description:** `@testing-library/react` is installed, jsdom is configured, but zero React component tests exist. All tests are pure-logic utility/store tests.
- **Fix:** Add component tests for at minimum: `LoginForm`, `AuthGuard`, `JobForm`, `CandidateCard`.

---

## Medium Issues

### ISSUE: Vestigial `@types/express` Dependency

- **Severity:** MEDIUM
- **File:** `package.json:51`
- **Description:** `@types/express` is in devDependencies but Express is not used anywhere in the project.
- **Fix:** Remove from devDependencies.

### ISSUE: Missing `@sentry/react` Dependency

- **Severity:** MEDIUM
- **File:** `src/lib/sentry.ts:4`, `package.json`
- **Description:** `sentry.ts` imports `@sentry/react` but the package is not listed in `dependencies` or `devDependencies`. This causes a build error.
- **Fix:** Either add `@sentry/react` to dependencies or delete `src/lib/sentry.ts` if Sentry is not needed yet.

### ISSUE: Missing HSTS and CSP Headers in Vercel Config

- **Severity:** MEDIUM
- **File:** `vercel.json`
- **Description:** Production headers include X-Frame-Options and X-XSS-Protection but are missing `Strict-Transport-Security` (HSTS) and `Content-Security-Policy` (CSP). These are standard security headers for any production web app.
- **Fix:** Add HSTS and CSP headers.

### ISSUE: `.env.example` Missing Edge Function Environment Variables

- **Severity:** MEDIUM
- **File:** `.env.example`
- **Description:** Under `supabase/functions/`, 10 edge functions reference env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `LINE_CHANNEL_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `DEFAULT_COMPANY_ID`) that are not listed in `.env.example`. New developers cannot set up edge functions without guessing.
- **Fix:** Add edge function env var documentation to `.env.example` or a separate `.env.functions.example`.

### ISSUE: Unconventional Migration Timestamps

- **Severity:** LOW
- **Files:** `supabase/migrations/*.sql`
- **Description:** All 26 migrations use timestamp `20240101000000` with sequential suffixes (`01`-`26`). This works for supabase but makes git history less useful and could cause confusion if new migrations are added later.
- **Fix:** Not urgent, but consider renaming to real timestamps on next migration cycle.

### ISSUE: 138 Lint Problems (3 Errors, 135 Warnings)

- **Severity:** MEDIUM
- **Files:** 50+ files across `src/`
- **Description:** The lint output reveals systematic issues: pervasive `any` usage (60+ instances), unused imports/variables (50+ instances), and 3 blocking errors (1 `prefer-const`, 2 `no-non-null-asserted-optional-chain`).
- **Fix:** Fix the 3 errors first (they block CI). Then incrementally address `any` usage and unused vars. Consider enabling `--max-warnings 0` in CI to enforce zero-warning policy.

### ISSUE: Incomplete README

- **Severity:** LOW
- **File:** `README.md`
- **Description:** The README is a generic AI Studio template with no project-specific information. Missing: tech stack, Supabase setup, database migration instructions, edge function deployment, test commands, architecture overview.
- **Fix:** Rewrite README with proper project documentation.

### ISSUE: `clean` Script Uses Unix `rm`

- **Severity:** LOW
- **File:** `package.json:17`
- **Description:** The `clean` script uses `rm -rf dist` which is a Unix command and won't work on Windows.
- **Fix:** Use `rimraf dist` or `npx rimraf dist` for cross-platform compatibility.

### ISSUE: HNSW / Flow Nexus Background Workers Referenced but Not Present

- **Severity:** LOW
- **Files:** `CLAUDE.md`, `GEMINI.md`
- **Description:** The project has extensive AI agent configuration files (`~/.config/opencode/AGENTS.md`, `CLAUDE.md`) with 23 MCP tools, 18 agents, RTK commands, swarm configs — but none of these are project-level dependencies. They appear to be user-level AI assistant configurations, not project infrastructure.
- **Note:** Not a project issue per se, but these configs reference workers (`audit`, `optimize`, `testgaps`, `map`, `document`) and tools that users might mistakenly think are part of the project.

---

## Summary

| Area | Grade | Key Metric |
|---|---|---|
| Unit Tests | **D** | 26 tests, ~10% coverage, only utils/stores tested |
| E2E Tests | **F** | 0 tests despite Playwright configured |
| Component Tests | **F** | 0 tests despite Testing Library installed |
| CI/CD | **F** | Pipeline broken — type-check + lint fail, blocking all deployments |
| Build | **F** | 30+ TypeScript errors prevent build |
| Deployment Config | **B-** | Good security headers, missing HSTS/CSP |
| Documentation | **F** | Default template README, no docs |
| Code Quality | **D** | 138 lint problems, 2,500+ lines dead code, pervasive `any` usage |
| Dependencies | **C+** | 1 vestigial dep, 1 missing dep, 17 major updates available |

**Overall Grade: D (30%)** — Not production-ready. The CI/CD pipeline is dead, the build fails, there are no meaningful tests, and the codebase has significant dead code. The supabase schema and edge functions appear well-structured but are untested.
