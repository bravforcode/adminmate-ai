# Release 26B.2 – 26B.5: Delivery Engineering

**Date:** 2026-06-22
**Author:** AdminMate AI Engineering
**Status:** Delivered

---

## Summary

This release closes the **Delivery Engineering** layer for AdminMate AI — deterministic
test fixtures, CI pipelines for both database and application, and protected delivery
via CODEOWNERS.

---

## 26B.2 — Deterministic Data Factory

**File:** `src/test-utils/factories.ts`

Provides test-only factory helpers that return plain objects matching the Supabase
row shape for every core entity.

| Helper | Entity | Key fields |
|--------|--------|------------|
| `createCompany()` | `companies` | id, name, country, subscription_tier |
| `createUser()` | `user_profiles` | id, email, role, company_id |
| `createEmployee()` | `employees` | id, employee_id, department, company_id |
| `createCandidate()` | `candidates` | id, full_name, email, primary_skill |
| `createJob()` | `jobs` | id, title, department, status |
| `createApplication()` | `applications` | id, job_id, candidate_id, status |
| `createInterview()` | `interviews` | id, scheduled_at, interview_type |
| `createOffer()` | `offers` | id, salary_offered, status |
| `createOnboardingChecklist()` | `onboarding_checklists` | id, template_name, progress |
| `createCompanies()` | batch | N companies |
| `createUsers()` | batch | N users, same company_id |
| `createCandidates()` | batch | N candidates |

**Design decisions:**
- Deterministic IDs via `nextId(prefix)` — stable across runs, reset per test via
  `resetFactoryCounter()`.
- All overrides are optional; defaults match the most common test scenario.
- No mocking or Supabase client dependency — pure data objects only.

---

## 26B.3 — Database Test Pipeline

**File:** `.github/workflows/db-test.yml`

Three-job workflow triggered on `supabase/migrations/**` and `supabase/tests/**` changes.

| Job | Purpose | Runtime |
|-----|---------|---------|
| `db-reset` | `supabase start` → `db reset` on a Postgres 15 service container | ~2 min |
| `pgTAP` | Enable pgTAP extension → run all `supabase/tests/*.sql` | ~3 min |
| `policy-inventory` | Enumerate `pg_policies` → upload artifact | ~1 min |

**Key details:**
- Uses `supabase/postgres:15.6.1.78` service container (matches Supabase hosted).
- pgTAP tests cover: RLS tenant isolation, JWT claim validation, deterministic RLS,
  CRUD scope closure, runtime RLS behavioral proof.
- Policy inventory artifact retained 30 days for audit trail.

---

## 26B.4 — Application CI

**File:** `.github/workflows/ci.yml`

Six-job pipeline with dependency graph (install → parallel fan-out).

```
install
  ├─ typecheck  (tsc --noEmit)
  ├─ lint       (eslint src/)
  ├─ build      (vite build)
  ├─ unit-tests (vitest run)
  └─ integration-tests (vitest run tests/integration/)
```

**Key details:**
- Node 20, npm cache keyed on `package-lock.json`.
- Build uses placeholder Supabase env vars (no real credentials).
- Tests run in jsdom environment via `vitest.config.ts`.
- Integration tests import mocked Supabase from `tests/setup.ts`.

---

## 26B.5 — Protected Delivery (CODEOWNERS)

**File:** `.github/CODEOWNERS`

Maps critical paths to team-level owners:

| Area | Code path | Owner |
|------|-----------|-------|
| Auth & Security | `src/stores/authStore.ts`, `src/components/auth/`, `tests/unit/security/` | `@adminmate-security` |
| Tenant Isolation | `supabase/migrations/*tenant*`, `supabase/migrations/*rbac*` | `@adminmate-security @adminmate-backend` |
| Database | `supabase/migrations/`, `supabase/tests/` | `@adminmate-backend` |
| AI/ML | `src/services/ai/`, `supabase/functions/candidate-*` | `@adminmate-ai` |
| Billing | `src/services/billing/`, `supabase/functions/stripe-*` | `@adminmate-billing` |
| CI/CD | `.github/`, `playwright.config.ts` | `@adminmate-devops` |
| Testing | `src/test-utils/`, `tests/setup.ts`, `vitest.config.ts` | `@adminmate-qa` |
| Compliance | `src/services/pdpaService.ts`, `supabase/migrations/*pdpa*` | `@adminmate-compliance` |
| Frontend UI | `src/components/ui/`, `public/locales/` | `@adminmate-frontend` |

**Scope:** 55+ paths mapped. Global fallback `@adminmate-team`.

---

## Files Created

| File | Release |
|------|---------|
| `src/test-utils/factories.ts` | 26B.2 |
| `.github/workflows/db-test.yml` | 26B.3 |
| `.github/workflows/ci.yml` | 26B.4 |
| `.github/CODEOWNERS` | 26B.5 |
| `docs/RELEASE_26B2_26B5_DELIVERY_ENGINEERING.md` | This report |

## Regression Gate

`npx vitest run` — must pass 0 failures before merge.

---

## Notes

- No `.env` files touched. No deployments triggered. No git push performed.
- GitHub Actions required for CI execution. Local equivalent: `supabase start && supabase db reset` then `psql -f supabase/tests/*.sql`.
- CODEOWNERS requires GitHub team slugs to be created in the org settings before enforcement.
