# Release 26F.12 — SCIM Sandbox Verification

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. SCIM Service Architecture

### Migration

`supabase/migrations/20240620000045_enterprise_security.sql`

### Current State

SCIM token management and RLS policies are implemented. No SCIM endpoint or provisioning logic exists yet.

---

## 2. Database Schema

### `scim_tokens`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `company_id` | UUID FK | Tenant scope |
| `provider_config_id` | UUID FK | Links to `sso_provider_configs` |
| `token_hash` | VARCHAR(64) | SHA-256 hash of SCIM bearer token |
| `scopes` | JSONB | `["users", "groups"]` |
| `expires_at` | TIMESTAMPTZ | Token expiration |
| `last_used_at` | TIMESTAMPTZ | Last API call timestamp |
| `is_active` | BOOLEAN | Whether token is active |

### RLS Policies

```sql
-- Read: admin/owner only (via has_permission('sso', 'read'))
CREATE POLICY scim_read ON scim_tokens
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'read')
  );

-- Write: admin/owner only (company_id CANNOT be bypassed)
CREATE POLICY scim_insert ON scim_tokens
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'write')
  );
```

### Security: Company Scope Enforcement

```sql
-- CRITICAL: SCIM tokens cannot bypass company scope
-- The INSERT policy requires company_id = safe_user_company_id()
-- This prevents cross-tenant token injection
```

---

## 3. SCIM 2.0 Protocol

### Endpoints (Planned)

| Endpoint | Method | Resource |
|----------|--------|----------|
| `/scim/v2/Users` | GET | List users |
| `/scim/v2/Users` | POST | Create user |
| `/scim/v2/Users/{id}` | GET | Get user |
| `/scim/v2/Users/{id}` | PUT | Replace user |
| `/scim/v2/Users/{id}` | PATCH | Update user |
| `/scim/v2/Users/{id}` | DELETE | Delete/deactivate user |
| `/scim/v2/Groups` | GET | List groups |
| `/scim/v2/Groups` | POST | Create group |
| `/scim/v2/Groups/{id}` | GET | Get group |
| `/scim/v2/Groups/{id}` | PUT | Replace group |
| `/scim/v2/Groups/{id}` | PATCH | Update group |
| `/scim/v2/Groups/{id}` | DELETE | Delete group |
| `/scim/v2/ServiceProviderConfig` | GET | Server capabilities |
| `/scim/v2/Schemas` | GET | Supported schemas |

### SCIM User Schema

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "id": "uuid",
  "userName": "john.doe@company.com",
  "name": {
    "givenName": "John",
    "familyName": "Doe"
  },
  "emails": [{"value": "john.doe@company.com", "primary": true}],
  "active": true,
  "groups": [{"value": "hr-manager-group-id"}],
  "meta": {
    "resourceType": "User",
    "created": "2026-06-22T00:00:00Z",
    "lastModified": "2026-06-22T00:00:00Z"
  }
}
```

### SCIM Group Schema

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
  "id": "uuid",
  "displayName": "HR Managers",
  "members": [
    {"value": "user-uuid", "$ref": "Users"}
  ],
  "meta": {
    "resourceType": "Group"
  }
}
```

---

## 4. SCIM Provisioning Flow

### Inbound (IdP → AdminMate)

```
1. IdP (Okta/Azure AD) sends SCIM provisioning request
2. AdminMate validates Bearer token against scim_tokens
3. Token must be active and not expired
4. Request scoped to company via token's company_id
5. User/Group created or updated in Supabase
6. RBAC roles mapped from SCIM groups
7. Response returned per SCIM spec
```

### Outbound (AdminMate → IdP) — Planned

```
1. Employee created/updated in AdminMate
2. SCIM provisioning job triggered
3. PATCH/PUT sent to IdP SCIM endpoint
4. IdP updates user directory
5. Provisioning status logged
```

### Token Authentication

```
Authorization: Bearer {scim_token}

1. Hash incoming token with SHA-256
2. Lookup in scim_tokens by token_hash
3. Verify is_active=true AND expires_at > NOW()
4. Update last_used_at
5. Return company_id for scoping
```

---

## 5. SCIM Resource Mapping

### User Mapping

| SCIM Attribute | AdminMate Field | Table |
|---------------|----------------|-------|
| `userName` | `email` | `user_profiles` |
| `name.givenName` | `first_name` | `user_profiles` |
| `name.familyName` | `last_name` | `user_profiles` |
| `emails[primary].value` | `email` | `user_profiles` |
| `active` | `is_active` | `user_profiles` |
| `groups[].value` | `role` | `user_profiles` |

### Group Mapping

| SCIM Group | AdminMate Role |
|-----------|---------------|
| `SCIM Admins` | `admin` |
| `SCIM HR Managers` | `hr_manager` |
| `SCIM HR Staff` | `hr_staff` |
| `SCIM Managers` | `manager` |
| `SCIM Employees` | `employee` |

---

## 6. Sandbox Verification Checklist

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | SCIM token creation | Token saved with hashed value | ⬜ Pending |
| 2 | SCIM token validation (valid) | Returns token record | ⬜ Pending |
| 3 | SCIM token validation (expired) | Returns `null` | ⬜ Pending |
| 4 | SCIM token validation (revoked) | Returns `null` | ⬜ Pending |
| 5 | `GET /scim/v2/Users` with valid token | Returns user list | ⬜ Pending |
| 6 | `POST /scim/v2/Users` creates user | User created in `user_profiles` | ⬜ Pending |
| 7 | `PATCH /scim/v2/Users/{id}` updates user | User attributes updated | ⬜ Pending |
| 8 | `DELETE /scim/v2/Users/{id}` deactivates | `active=false` set | ⬜ Pending |
| 9 | `GET /scim/v2/ServiceProviderConfig` | Returns capabilities | ⬜ Pending |
| 10 | RLS: Company A cannot manage Company B SCIM | Query returns empty | ✅ Migrated |
| 11 | Token scope enforcement | Token cannot access other company | ✅ Migrated |
| 12 | Permission: `sso.write` required | Unauthorized rejected | ⬜ Pending |

---

## 7. SCIM Provider Integration

| Provider | Protocol | Status |
|----------|----------|--------|
| Okta | SCIM 2.0 | Planned |
| Azure AD / Entra ID | SCIM 2.0 | Planned |
| Google Workspace | SCIM 2.0 (via GAM) | Planned |
| OneLogin | SCIM 2.0 | Planned |

---

## 8. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No SCIM 2.0 endpoint | P0 | Implement REST API endpoints |
| No token authentication middleware | P0 | Validate Bearer tokens |
| No user provisioning logic | P0 | Create/update users from SCIM |
| No group provisioning logic | P1 | Map SCIM groups to roles |
| No outbound provisioning | P2 | Push changes to IdP |
| No SCIM bulk operations | P2 | Support bulk API for large orgs |
| No provisioning audit log | P2 | Track all SCIM operations |
