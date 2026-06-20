# Release 26A.2 — Database-Backed Tenant Isolation Proof

**Status:** ⛔ BLOCKED — Docker Desktop not running

---

## Execution Attempt

### What Was Tried
```bash
npx supabase --version  → 2.76.8 ✅
docker --version        → 28.3.2 ✅
npx supabase start      → ❌ FAILED
```

### Error
```
failed to inspect service: error during connect:
Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/supabase_db_adminmate-ai/json":
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
Docker Desktop is a prerequisite for local development.
```

### Root Cause
Docker CLI is installed (v28.3.2) but **Docker Desktop daemon is not running**. On Windows, Docker Desktop must be explicitly started. The named pipe `//./pipe/dockerDesktopLinuxEngine` is not available.

### Impact
- ❌ `supabase start` cannot run
- ❌ `supabase db reset --local` cannot run
- ❌ `supabase test db` cannot run
- ❌ pgTAP tests cannot execute
- ❌ Policy inventory cannot be captured from real database
- ❌ RLS cannot be proven at database level

---

## What WAS Fixed (Policy Corrections)

### Migration 000051: Policy Corrections

**chat_messages — Fixed owner bypass:**

Before (from 000050):
```sql
USING (
  user_id = auth.uid()
  OR (company_id = safe_user_company_id() AND role IN admin,hr)
)
```
Problem: First branch `user_id = auth.uid()` has no company_id gate.

After (000051):
```sql
USING (
  company_id = safe_user_company_id()
  AND (
    user_id = auth.uid()
    OR role IN (admin, hr_manager, hr_staff)
  )
)
```
Fix: company_id is mandatory at top level.

**chat_messages — Fixed UPDATE policy:**

Before: `USING (user_id = auth.uid())` only — no WITH CHECK.

After:
```sql
USING (company_id = safe_user_company_id() AND user_id = auth.uid())
WITH CHECK (company_id = safe_user_company_id() AND user_id = auth.uid())
```

**messages — Fixed UPDATE policy:**

Before: `USING (company_id + sender/admin)` only — no WITH CHECK.

After:
```sql
USING (company_id = safe_user_company_id() AND (sender OR admin))
WITH CHECK (company_id = safe_user_company_id())
```

**conversation_threads — Fixed UPDATE policy:**

Same pattern as messages.

**Immutable field triggers added:**

- `chat_messages`: company_id, user_id, sender, created_at cannot be mutated after insert
- `messages`: company_id, conversation_id, platform_user_id, created_at cannot be mutated after insert

---

## Evidence Status

| Evidence | Status | Notes |
|----------|--------|-------|
| Migration written (000051) | ✅ | Policy corrections applied |
| Vitest service-layer tests | ✅ | 60 tests passing |
| pgTAP SQL suite | ✅ | Written, not executed |
| supabase start | ❌ | Docker Desktop not running |
| supabase db reset --local | ❌ | Blocked by above |
| supabase test db | ❌ | Blocked by above |
| Policy before/after output | ❌ | Cannot capture without DB |
| Grants inventory output | ❌ | Cannot capture without DB |
| Real Company A vs B RLS proof | ❌ | Cannot prove without DB |

---

## Blocker

**Docker Desktop must be started before any database-backed evidence can be produced.**

Steps to unblock:
1. Start Docker Desktop on Windows
2. Wait for Docker daemon to be ready
3. Run `npx supabase start`
4. Run `npx supabase db reset --local`
5. Run `npx supabase test db`
6. Capture pg_policies output
7. Capture grants output

---

## What Remains True

- Service-layer enforcement: ✅ PROVEN (60 vitest tests)
- Database-layer enforcement: ⚠️ POLICIES WRITTEN, NOT EXECUTED
- Policy corrections: ✅ APPLIED (migration 000051)
- Real RLS proof: ⛔ BLOCKED BY DOCKER

**This release cannot be called "RLS proven" until Docker is running and pgTAP executes successfully.**
