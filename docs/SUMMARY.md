# Release 1 — Summary

**Date:** 2026-06-20  
**Status:** ✅ COMPLETE  
**Tests:** 429 passed, 9 failed (pre-existing) | Typecheck clean | Lint clean | Build passes

## What Was Delivered

### Security
- Fixed notifications RLS vulnerability (`WITH CHECK (true)` → company-scoped)
- Added defense-in-depth: `user_id = auth.uid() AND company_id = safe_user_company_id()`

### RBAC Foundation
- 4 new tables: `roles`, `permissions`, `role_permissions`, `user_roles`
- 10 system roles (owner, admin, hr_manager, recruiter, hiring_manager, payroll_admin, department_head, employee, contractor, viewer)
- 40+ permissions across 15 resources (candidate, job, application, interview, offer, payroll, document, report, user, company, role, notification, audit, system, onboarding)
- SQL helper functions: `has_role()`, `has_permission()`, `has_any_role()`, `user_role_names()`
- Legacy migration function: `migrate_legacy_roles()`
- RLS policies on all RBAC tables (own roles readable, admins manage)

### Sensitive Field Registry
- 15 fields seeded (age, gender, race, religion, disability, pregnancy, photo, immigration_status, nationality, ethnicity, marital_status, medical_condition, criminal_record, political_affiliation, sexual_orientation)
- SQL helpers: `get_sensitive_field_names()`, `is_sensitive_field()`
- Frontend: `sensitiveFieldService.ts` with `excludeSensitiveFields()` for AI masking

### Global Configuration
- `country_configs` (9 countries: TH, SG, MY, ID, PH, VN, JP, KR, IN)
- `currency_configs` (9 currencies with symbols)
- `timezone_configs` (9 timezones)
- `locale_configs` (10 locales incl RTL ar-SA)
- `data_residency_regions` (3 regions: SEA, EU, US)
- `feature_flags` (11 flags) + `company_feature_flags` (company-level overrides)
- SQL function: `is_feature_enabled(p_feature_key, p_company_id)`

### Frontend
- `permissionService.ts` — RPC wrappers for permission checks
- `featureFlagService.ts` — Feature flag check with in-memory cache
- `PermissionDenied.tsx` — Access denied UI
- `NeedsConfiguration.tsx` — Module not configured UI
- RTL support: `dir` attribute on app container, CSS logical properties

### Tests
- 21 new tests across 4 files (all passing)
- permissionService: 8 tests
- sensitiveFieldService: 4 tests
- featureFlagService: 6 tests
- PermissionComponents: 3 tests

## Migration Files
| File | Purpose |
|------|---------|
| `20240620000001_security_hotfix_notifications_rls.sql` | Fix notifications RLS |
| `20240620000002_rbac_tables.sql` | Create RBAC schema |
| `20240620000003_rbac_seed.sql` | Seed roles + permissions |
| `20240620000004_permission_helpers.sql` | SQL permission functions |
| `20240620000005_sensitive_field_registry.sql` | Sensitive fields + helpers |
| `20240620000006_global_config_tables.sql` | Country/currency/tz/locale/residency/flags |

## Known Limitations
1. RBAC not yet wired into `AuthGuard` — existing route guards still use legacy `requiredRoles`
2. Edge functions don't call permission SQL functions yet
3. `user_profiles.role` string column kept for backward compat
4. `is_admin_or_hr()` still used by some existing RLS policies
5. Role-aware navigation not yet implemented

## RBAC Transition Strategy (Dual-Mode)
- **New path:** If user has entries in `user_roles` → use RBAC tables
- **Legacy fallback:** If user has NO `user_roles` entries → fall back to `user_profiles.role` via `map_legacy_role()`
- `migrate_legacy_roles(p_company_id)` provided for per-company one-time migration
- **No user loses access** — dual-mode ensures continuity until migration completes
- Migration 000007 adds fallback to `has_role()`, `has_permission()`, `has_any_role()`, `user_role_names()`

## Next Steps
- Wire `permissionService` into `AuthGuard` and route definitions
- Update existing RLS policies to use new permission helpers
- Add audit logging for permission-sensitive actions
- Proceed to Release 1B (Legal Entity & Org Hierarchy) or Release 2 (Recruiting)
