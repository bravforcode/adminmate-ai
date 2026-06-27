# Project State

## Current Phase: 1A-CRITICAL (Critical Security Fixes — Round 2)

### Status: COMPLETED

### Completed Phases
- **Phase 0**: Initial security hardening (RLS, migrations) - COMPLETED
- **Phase 1A**: Auth session infrastructure (httpOnly cookies) - COMPLETED
- **Phase 1A-CRITICAL**: Critical security fixes (SSRF, token transport, cert encryption, ownership, timing-safe, RLS guard) - COMPLETED
- **Phase 1B**: Payroll atomicity, leave balance RPC, tax calc fixes - COMPLETED
- **Phase 2**: HIGH severity security + business logic fixes - COMPLETED
- **Phase 4**: CI/CD pipeline + API contract unification - COMPLETED

### Phase 1A-CRITICAL Commits
- `186e035` - feat(security-1a): critical security hardening - SSRF, token transport, cert encryption, ownership, timing-safe, RLS guard

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
