# Phase 2 Summary: HIGH Severity Fixes

**Date**: 2026-06-27
**Commit**: `caf7364`

## Security High Fixes (5)

### Fix 1: Remove localStorage session persistence
- **File**: `src/lib/supabase.ts:16`
- **Change**: Set `persistSession: false` in Supabase auth config
- **Impact**: Sessions no longer persist in localStorage; httpOnly cookie infrastructure handles persistence

### Fix 2: Remove access_token from JSON responses
- **Files**: `supabase/functions/auth-session/login.ts:95`, `refresh.ts:44`, `status.ts:46`
- **Change**: Removed `access_token` from all JSON response bodies
- **Impact**: Raw tokens never appear in HTTP response bodies; session managed via httpOnly cookies only

### Fix 3: Delete open_all_rls migration
- **File**: `supabase/migrations/20240102000003_open_all_rls.sql` (DELETED)
- **Change**: Removed dangerous migration that set `USING (true)` on all tables
- **Impact**: RLS policies now properly enforce tenant isolation

### Fix 4: Make parse-resume company ownership mandatory
- **File**: `supabase/functions/parse-resume/index.ts:55-60`
- **Change**: Added mandatory `company_id` check; rejects CVs without associated company
- **Impact**: Cross-tenant CV access is now blocked even if caller omits companyId

### Fix 5: Constant-time HMAC comparison for webhooks
- **Files**: `supabase/functions/whatsapp-webhook/index.ts:63-66`, `line-webhook/index.ts:44-48`
- **Change**: Replaced `!==` with `timingSafeEqual()` for HMAC signature verification
- **Impact**: Prevents timing side-channel attacks on webhook signature validation

## Business Logic High Fixes (6)

### Fix 6: Employment status state machine
- **File**: `src/services/hris/employeeService.ts:218-234`
- **Change**: Added `VALID_TRANSITIONS` map and pre-update validation
- **Impact**: Invalid transitions (e.g., terminated → on_leave) are now rejected

### Fix 7: Circular manager chain detection
- **File**: `src/services/hris/employeeService.ts:273-295`
- **Change**: Walk manager chain upward with Set-based cycle detection
- **Impact**: Prevents A→B→C→A manager assignment cycles

### Fix 8: Sensitive field cache TTL
- **File**: `src/services/sensitiveFieldService.ts:8-14`
- **Change**: Added 1-hour TTL with timestamp tracking
- **Impact**: Cache refreshes automatically; stale data no longer persists indefinitely

### Fix 9: Subscription duplicate check
- **File**: `src/services/billing/subscriptionService.ts:73-77`
- **Change**: Check for existing active/trialing subscription before INSERT
- **Impact**: Prevents duplicate subscription creation

### Fix 10: Employee number sequence
- **Files**: `src/services/hris/employeeService.ts:110-123`, `supabase/migrations/20240627000001_emp_num_sequence.sql`
- **Change**: PostgreSQL sequence `emp_num_seq` with fallback to COUNT+1
- **Impact**: Eliminates race condition in concurrent employee creation

### Fix 11: Compliance logSensitiveAccess company_id
- **File**: `src/services/compliance/complianceService.ts:102-116`
- **Change**: Added `companyId` parameter; all 6 call sites updated
- **Impact**: Audit logs now include company_id for proper tenant attribution
