# Release 26A — Tenant Isolation Classification

## Table Classification

### tenant_data (Company-scoped, must have company_id RLS)

| Table | has company_id | Current Policy | Fix Required |
|-------|---------------|----------------|--------------|
| chat_messages | YES | USING(user_id = auth.uid() OR role IN admin,hr) — OK for reads, but INSERT via service-role edge function needs audit | Verify per-operation |
| chat_platform_connections | YES | Needs RLS — currently no explicit policy in hardened_rls | ADD company-scoped RLS |
| messages | YES | Needs RLS — created in unified_messages migration | ADD company-scoped RLS |
| conversation_threads | YES | Needs RLS — created in unified_messages migration | ADD company-scoped RLS |
| message_queue | YES | service_role only — OK | Verify |
| platform_sync_log | YES | service_role only — OK | Verify |
| system_health | YES | service_role only — OK | Verify |

### global_reference (No company_id needed, read for all, write restricted)

| Table | Current Policy | Fix Required |
|-------|----------------|--------------|
| document_type_configs | USING(true) FOR ALL — CRITICAL: any user can INSERT/UPDATE/DELETE | Restrict writes to admin/service_role |
| immigration_case_types | USING(true) FOR ALL — CRITICAL: any user can modify | Restrict writes to admin/service_role |
| th_tax_brackets | USING(true) FOR ALL — CRITICAL: any user can modify tax rules | Restrict writes to admin/service_role |
| th_social_security_rules | USING(true) FOR ALL — CRITICAL: any user can modify SS rules | Restrict writes to admin/service_role |

### platform_admin (Platform-level, not tenant-scoped)

| Table | Status |
|-------|--------|
| plans | Read: authenticated, Write: service_role — OK |
| plan_features | Read: authenticated, Write: service_role — OK |
| integration_providers | Read: authenticated — OK |
| roles | Read: authenticated — OK |
| permissions | Read: authenticated — OK |
| role_permissions | Read: authenticated — OK |

### global_config (Reference data, read-only for authenticated)

| Table | Status |
|-------|--------|
| country_configs | USING(true) for SELECT — OK |
| currency_configs | USING(true) for SELECT — OK |
| timezone_configs | USING(true) for SELECT — OK |
| locale_configs | USING(true) for SELECT — OK |
| data_residency_regions | USING(true) for SELECT — OK |
| feature_flags | USING(true) for SELECT — OK |
| sensitive_field_registry | USING(true) for SELECT — OK |

## Critical Findings

### 4 tables have USING(true) on ALL operations (SELECT + INSERT + UPDATE + DELETE):

1. **document_type_configs** — Any authenticated user can create/modify/delete document types
2. **immigration_case_types** — Any authenticated user can create/modify/delete case types
3. **th_tax_brackets** — Any authenticated user can modify Thailand tax brackets
4. **th_social_security_rules** — Any authenticated user can modify social security rules

### Remediation strategy:

**Global reference tables:**
- SELECT: `USING(true)` — any authenticated user can read (correct)
- INSERT: Restrict to `service_role` only (admin path through edge function)
- UPDATE: Restrict to `service_role` only
- DELETE: Restrict to `service_role` only
- Do NOT add fake company_id — these are global by design

**Tenant data tables (messages, chat_platform_connections, etc.):**
- All operations: `company_id = safe_user_company_id()`
- INSERT must have WITH CHECK
- UPDATE must have both USING and WITH CHECK
