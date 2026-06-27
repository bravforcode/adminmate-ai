# Project State

## Current Phase: 4 (CI/CD Pipeline + API Contract Unification)

### Status: COMPLETED

### Completed Phases
- **Phase 0**: Initial security hardening (RLS, migrations) - COMPLETED
- **Phase 1A**: Auth session infrastructure (httpOnly cookies) - COMPLETED
- **Phase 1B**: Payroll atomicity, leave balance RPC, tax calc fixes - COMPLETED
- **Phase 2**: HIGH severity security + business logic fixes - COMPLETED
- **Phase 4**: CI/CD pipeline + API contract unification - COMPLETED

### Phase 4 Commits
- `ecdc6bd` - feat(1B-6): CI + dependabot bundled with leave RPC
- `1623ca2` - feat(4-03): branch protection docs + errorHandler + utils
- `1b2287e` - feat(4-06): standardize success envelope with correlationId

### Key Architecture Notes
- Auth session uses httpOnly cookies (`sb-auth-refresh`) via edge functions
- `access_token` is never exposed in JSON responses
- `persistSession: false` in Supabase client config
- Employee numbers use PostgreSQL sequence `emp_num_seq`
- Employment status transitions are validated via state machine
- Manager assignment checks for circular chains
- API responses use unified envelope: `{ success, data/error, correlationId }`
- Error responses include structured `code`, `message`, `correlationId`, `timestamp`
- CI runs lint → typecheck → tests → build, plus parallel security-grep + dependency-audit
