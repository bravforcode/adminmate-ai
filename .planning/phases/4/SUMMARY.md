# Phase 4 Summary: CI/CD Pipeline + API Contract Unification

**Status:** COMPLETED
**Date:** 2026-06-27

---

## Changes Made

### Fix 1: GitHub Actions CI Workflow
**File:** `.github/workflows/ci.yml`
- Rewrote workflow from scratch with 5 focused jobs:
  - `lint-and-typecheck` — ESLint + `tsc --noEmit`
  - `unit-tests` — `vitest run --coverage` (depends on lint)
  - `build` — `vite build` (depends on tests)
  - `security-grep` — RLS, wildcard CORS, @latest, hardcoded secrets (parallel)
  - `dependency-audit` — `npm audit --audit-level=high` (parallel)
- Added proper timeout-minutes, node 20, npm caching

### Fix 2: Dependabot Configuration
**File:** `.github/dependabot.yml`
- npm ecosystem: weekly Monday 09:00 Bangkok time
- GitHub Actions ecosystem: weekly updates
- Auto-labels: `dependencies`, `automated`
- Groups: Radix UI patch/minor, dev-tools patch
- Open PR limit: 10 npm, 5 actions

### Fix 3: Branch Protection Documentation
**File:** `docs/BRANCH_PROTECTION.md`
- Documents all required status checks (CI + governance)
- Provides step-by-step GitHub UI instructions for setup
- Lists recommended settings for `main` and `develop`

### Fix 4: Unified Error Handler
**File:** `supabase/functions/_shared/errorHandler.ts`
- Added `ApiErrorResponse` type matching documented contract
- Added `getErrorCode()` — maps error messages to stable codes (UNAUTHORIZED, NOT_FOUND, etc.)
- Added `getHttpStatus()` — resolves HTTP status from error code
- Added `createErrorResponse()` — structured error with code, message, correlationId, timestamp
- Updated `errorResponse()` to auto-resolve code + status + correlationId
- Preserved backward compatibility with existing `errorResponse()` signature

### Fix 5: Correlation ID Generation
**File:** `supabase/functions/_shared/utils.ts`
- Added `generateCorrelationId()` — `req_` prefix + 12-char UUID fragment
- Updated `successResponse()` to include `correlationId` in response envelope

### Fix 6: Standardized Success Envelope
**Files:**
- `supabase/functions/mate-ai-chat/index.ts` — `{ success, data: { response }, correlationId }`
- `supabase/functions/send-email/index.ts` — `{ success, data: { id }, correlationId }` (was `{ success, id }`)
- `supabase/functions/screen-resume/index.ts` — `{ success, data: analysis, correlationId }`

---

## Commits
| Commit | Description |
|--------|-------------|
| `ecdc6bd` | feat(1B-6): Create leave balance RPC (bundled CI + dependabot) |
| `1623ca2` | feat(4-03): branch protection rules documentation + errorHandler + utils |
| `1b2287e` | feat(4-06): standardize success envelope with correlationId |

## API Response Contract (Established)
```typescript
// Success
{ success: true, data: <value>, correlationId: "req_xxx" }

// Error
{ success: false, error: { code: "NOT_FOUND", message: "...", correlationId: "req_xxx", timestamp: "ISO" } }
```

## Files Changed
- `.github/workflows/ci.yml` (rewritten)
- `.github/dependabot.yml` (new)
- `docs/BRANCH_PROTECTION.md` (new)
- `supabase/functions/_shared/errorHandler.ts` (enhanced)
- `supabase/functions/_shared/utils.ts` (enhanced)
- `supabase/functions/mate-ai-chat/index.ts` (envelope)
- `supabase/functions/send-email/index.ts` (envelope)
- `supabase/functions/screen-resume/index.ts` (envelope)
