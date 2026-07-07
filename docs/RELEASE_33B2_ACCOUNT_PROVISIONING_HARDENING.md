# Release 33B.2 — Account Provisioning Hardening

**Date:** 2026-06-23
**Status:** PASS

---

## A. Problem Statement

The `handle_new_user()` trigger created profiles with `company_id = NULL` by design. While the frontend flow (auto-confirm → create company → link profile) handled this correctly, there were gaps:

1. **Invite flows**: No way to pass `company_id` during user creation
2. **Email verification**: Profile created with NULL company_id; AuthGuard redirect worked but no direct link
3. **Audit gap**: No way to check provisioning status or detect orphaned profiles
4. **RLS gap**: Users without company couldn't read their own profile

---

## B. Changes Made

### Migration 20240620000058_account_provisioning_hardening.sql

| Component | Description |
|-----------|-------------|
| `handle_new_user()` (improved) | Accepts `company_id` and `role` from `raw_user_meta_data`. Supports invite flows. ON CONFLICT DO UPDATE for idempotency. |
| `check_user_provisioning_status(UUID)` | Returns provisioning state: `complete`, `needs_company`, `needs_profile`, or `inactive` |
| `link_user_to_company(UUID, UUID, VARCHAR)` | Safely links user to company with FK validation. Used by invite flows. |
| `audit_orphaned_profiles()` | Detects profiles with invalid company references. Defensive audit function. |
| `audit_provisioning_completeness()` | Returns provisioning stats: total users, with/without company, orphaned, provisioning rate |
| `profiles_own_read` RLS policy | Allows NULL company_id users to read their own profile (prevents lockout) |
| Index | `idx_user_profiles_company_id_null` for efficient orphan queries |

### OAuthCallbackPage.tsx

- Redirects to `/setup-company` if profile has no `company_id` (provisioning incomplete)
- Prevents redirect loop through dashboard when user has no company

---

## C. Test Results

**26/26 pgTAP tests PASS**

| Category | Tests | Status |
|----------|-------|--------|
| Trigger behavior | 8 | ✅ PASS |
| check_user_provisioning_status() | 4 | ✅ PASS |
| link_user_to_company() | 4 | ✅ PASS |
| audit_orphaned_profiles() | 2 | ✅ PASS |
| audit_provisioning_completeness() | 4 | ✅ PASS |
| RLS + integration | 4 | ✅ PASS |
| **Total** | **26** | **✅ ALL PASS** |

### Key Test Findings

1. **FK constraints prevent orphan creation**: The `user_profiles.company_id` FK to `companies.id` prevents orphaned profiles. The `audit_orphaned_profiles()` function is a defensive measure for data corruption scenarios.

2. **Trigger handles invite flows**: When `raw_user_meta_data` contains `company_id`, the trigger creates the profile with the company already linked.

3. **ON CONFLICT DO UPDATE**: Re-running the trigger on an existing user updates `company_id` and `role` from metadata.

4. **profiles_own_read policy**: Users without a company can still read their own profile, preventing lockout.

---

## D. Provisioning Flow (After Fix)

### Standard Signup (Email Verification)

```
1. User registers → auth.users INSERT
2. handle_new_user() → user_profiles (company_id = NULL)
3. User verifies email → logs in
4. OAuthCallbackPage → no company_id → /setup-company
5. User creates company → companyService.create()
6. Profile updated with company_id
7. AuthGuard → /dashboard
```

### Invite Flow (Admin creates user)

```
1. Admin creates user with company_id in metadata
2. auth.users INSERT → handle_new_user()
3. user_profiles created with company_id (no NULL state)
4. User logs in → AuthGuard → /dashboard
```

### Auto-Confirm Flow

```
1. User registers → auth.users INSERT
2. handle_new_user() → user_profiles (company_id = NULL)
3. Frontend immediately creates company → updates profile
4. AuthGuard → /dashboard
```

---

## E. Seed Issue (Known, Deferred)

The `seed.sql` file still fails on clean `supabase db reset` because it tries to insert a `user_profiles` row referencing an `auth.users` row that doesn't exist yet. This is a known issue documented in 33B.1R.

**Status:** Deferred to seed redesign in 33B.2+ per the provisioning boundary document.

---

## F. Verdict

**PASS**

- All 26 pgTAP tests pass
- Trigger improved for invite flows
- Audit functions created
- RLS policy added for NULL company_id users
- OAuthCallbackPage fixed for provisioning redirect
- No forbidden commands used

---

*This report is valid as of 2026-06-23.*
