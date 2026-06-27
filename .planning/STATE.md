# Project State

## Current Phase: 3 (Performance & Database Overhaul)

### Status: COMPLETED

### Completed Phases
- **Phase 0**: Initial security hardening (RLS, migrations) - COMPLETED
- **Phase 1A**: Auth session infrastructure (httpOnly cookies) - COMPLETED
- **Phase 1A-CRITICAL**: Critical security fixes (SSRF, token transport, cert encryption, ownership, timing-safe, RLS guard) - COMPLETED
- **Phase 1B**: Payroll atomicity, leave balance RPC, tax calc fixes - COMPLETED
- **Phase 2**: HIGH severity security + business logic fixes - COMPLETED
- **Phase 3**: Performance & database overhaul (RLS consolidation, pagination, search rebuild) - COMPLETED
- **Phase 4**: CI/CD pipeline + API contract unification - COMPLETED

### Phase 3 Commits
- `f38914f` - feat(3-1,3-2): consolidate RLS functions and fix applications_read policy
- `f3b3631` - feat(3-3,3-4,3-7): add pg_cron, audit stats RPC, and search trigram indexes
- `25dfb13` - feat(3-4,3-5): audit log stats RPC + cursor-based pagination
- `f7747b1` - feat(3-5): add cursor-based pagination to candidate, application, document, offer services
- `6d32b08` - feat(3-5): update hooks and pages for cursor-based pagination
- `80c2595` - feat(3-6): add ESLint custom rule to flag .select('*') usage
- `e125f4c` - fix(phase3): resolve TypeScript errors in DocumentsPage, CandidatesPage, useSessionRestore, employeeService

### Key Architecture Notes
- Auth session uses httpOnly cookies (`sb-auth-refresh`) via edge functions
- `access_token` is never exposed in JSON responses (enforced since Phase 1A)
- `persistSession: true` in Supabase client config (changed in 1A-CRITICAL for session persistence)
- SSO metadata URLs are validated against SSRF (https-only, private IP check via DoH)
- SSO certificates are encrypted at rest using pgcrypto (AES-256)
- Webhook signatures use constant-time comparison (timingSafeEqual)
- parse-resume enforces mandatory company ownership check
- Employee numbers use PostgreSQL sequence `emp_num_seq`
- Employment status transitions are validated via state machine
- Manager assignment checks for circular chains
- API responses use unified envelope: `{ success, data/error, correlationId }`
- Error responses include structured `code`, `message`, `correlationId`, `timestamp`
- CI runs lint → typecheck → tests → build, plus parallel security-grep + dependency-audit
- CI security grep guard blocks USING (true) and WITH CHECK (true) in migrations
- **RLS canonical function:** `safe_user_company_id()` (get_user_company_id() is alias)
- **Pagination:** Cursor-based keyset pagination on all top-5 services
- **Search:** pg_trgm GIN indexes for fast ILIKE on candidates/jobs/applications/interviews
- **Dashboard:** pg_cron refreshes materialized view every minute
- **Audit stats:** Server-side RPC with COUNT(DISTINCT) instead of client-side Set
