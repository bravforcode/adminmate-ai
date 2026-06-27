# Phase 3 Summary: Performance & Database Overhaul

**Date:** 2026-06-27
**Commits:** 7 atomic commits

## Database Fixes

### Fix 1: RLS Function Consolidation
**File:** `supabase/migrations/20240627000004_consolidate_rls_functions.sql`
- Consolidated `get_user_company_id()` (migration 000020) and `safe_user_company_id()` (migration 000004) into a single canonical function
- `get_user_company_id()` now delegates to `safe_user_company_id()` (alias pattern)
- Dropped 8 residual policies from migration 000021 that still referenced the old function
- Re-created dropped policies with `safe_user_company_id()`

### Fix 2: applications_read RLS Optimization
**File:** `supabase/migrations/20240627000004b_fix_applications_read_rls.sql`
- **Before:** `candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())` — subquery per row
- **After:** `company_id = safe_user_company_id()` — direct index scan
- Added `idx_applications_company_id` index
- Impact: eliminates O(n) sequential scan through candidates for every applications query

### Fix 3: pg_cron for Materialized View Refresh
**File:** `supabase/migrations/20240627000005_pg_cron_refresh.sql`
- Enabled pg_cron extension
- Scheduled `refresh-dashboard` job: `REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats` every minute
- Scheduled `cleanup-rate-limits` job: `SELECT cleanup_rate_limits(24)` hourly

### Fix 4: Audit Log Stats RPC
**File:** `supabase/migrations/20240627000006_audit_log_stats_rpc.sql`
**Service:** `src/services/auditLogService.ts` (line 69-78)
- Created `get_audit_log_stats(p_company_id UUID)` PL/pgSQL function
- Uses `COUNT(DISTINCT user_id)` server-side instead of fetching all user_ids and building a Set client-side
- Single DB round-trip for all 4 stats (total, today, unique_users, top_actions)

### Fix 7: Search Optimization with pg_trgm
**File:** `supabase/migrations/20240627000007_search_optimization.sql`
- Enabled `pg_trgm` extension
- Added 10 GIN trigram indexes across candidates, jobs, applications, and interviews
- Impact: transforms `ILIKE '%query%'` from sequential scans to index-assisted lookups
- Existing `searchService.ts` code unchanged — the indexes are transparent

## Performance Fixes

### Fix 5: Cursor-Based Pagination (5 services)
Pattern: `{ data, cursor, hasMore }` using keyset pagination

| Service | Method | File:Line |
|---------|--------|-----------|
| `auditLogService` | `getAuditLogs()` | `src/services/auditLogService.ts:41` |
| `candidateService` | `getAll()` | `src/services/candidateService.ts:53` |
| `applicationService` | `getByJob()` | `src/services/applicationService.ts:28` |
| `documentService` | `getAll()` | `src/services/documentService.ts:36` |
| `offerService` | `getAll()` | `src/services/offerService.ts:44` |

- Uses `lt('created_at', cursor)` for O(1) page navigation
- Fetches `limit + 1` to detect `hasMore`
- Default page size: 50 (25 for audit logs)
- Backward-compatible: no options = first page

**Hooks updated:** useCandidates, useDocuments, useOffers, useApplications — all extract `.data` from PaginatedResult
**Page updated:** AuditLogPage — replaced offset pagination with cursor-based navigation using cursorStack

### Fix 6: ESLint Rule for select('*')
**File:** `eslint.config.mjs`
- Custom ESLint rule `custom/no-select-star` targeting `src/**/*.{ts,tsx}`
- Warns on `.select('*')` usage to enforce explicit column selection
- Does not apply to Supabase edge functions

## TypeScript Health
- **Before:** 2 pre-existing errors (employeeService implicit any)
- **After:** 0 errors (fixed employeeService, useSessionRestore, DocumentsPage, CandidatesPage)

## Pre-existing Fixes (bonus)
- `src/services/hris/employeeService.ts:279` — explicit type annotation for cycle detection
- `src/hooks/useSessionRestore.ts` — removed unused variable, fixed spread ordering
- `src/pages/DocumentsPage.tsx` — null-safe status comparisons
- `src/pages/recruitment/CandidatesPage.tsx` — type cast for CandidateCard prop
