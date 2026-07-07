# Release 26F.11 — SSO Sandbox Verification

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. SSO Service

### Service Location

`src/services/security/ssoService.ts`

### Migration

`supabase/migrations/20240620000045_enterprise_security.sql`

### Provider Types Supported

| Type | Protocol | Status |
|------|----------|--------|
| `saml` | SAML 2.0 | Schema + service implemented |
| `oidc` | OpenID Connect | Planned |
| `azure_ad` | Azure AD / Entra ID | Planned |
| `google_workspace` | Google Workspace | Planned |

### Config Status Lifecycle

```
not_configured → configured → verified → error
```

---

## 2. Database Schema

### `sso_provider_configs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `company_id` | UUID FK | Tenant scope (one per company) |
| `provider_type` | VARCHAR | `saml`, `oidc`, `azure_ad`, `google_workspace` |
| `provider_name` | VARCHAR | Display name |
| `metadata_url` | TEXT | SAML metadata URL |
| `entity_id` | VARCHAR(512) | SAML entity ID |
| `certificate` | TEXT | SAML X.509 certificate |
| `is_enabled` | BOOLEAN | **Disabled by default** |
| `config_status` | VARCHAR | `not_configured`, `configured`, `verified`, `error` |

### RLS Policies

```sql
-- Read: company members
CREATE POLICY sso_read ON sso_provider_configs
  FOR SELECT USING (company_id = safe_user_company_id());

-- Write: admin/owner only (via has_permission)
CREATE POLICY sso_insert ON sso_provider_configs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'write')
  );
```

---

## 3. SSO Configuration Flow

### Setup

```
1. Admin navigates to Settings → Security → SSO
2. Selects provider type (SAML/OIDC/Azure AD/Google)
3. Enters metadata URL OR entity_id + certificate
4. Saves configuration (is_enabled defaults to false)
5. Admin tests connection
6. If successful → sets is_enabled=true
7. SSO login available for company users
```

### Test Connection Flow

```typescript
testSSOConnection(companyId) → {
  success: boolean
  message: string
  details?: Record<string, unknown>
}
```

1. Fetch SSO config for company
2. Check `is_enabled` and `config_status`
3. If `metadata_url` provided → fetch URL, validate response
4. If `entity_id` + `certificate` → verify both present
5. Update `config_status` to `verified` or `error`
6. Return result

### SAML Metadata Validation

| Check | Failure |
|-------|---------|
| Metadata URL returns 200 | `HTTP {status}` error |
| Metadata URL timeout (10s) | `Connection failed` |
| Entity ID missing | `Incomplete SAML configuration` |
| Certificate missing | `Incomplete SAML configuration` |

---

## 4. SSO Security Controls

### Default Security

| Control | Value | Notes |
|---------|-------|-------|
| SSO enabled | `false` | Must be explicitly enabled |
| MFA requirement | Configurable | Via `session_policies` |
| Session timeout | 8 hours default | Via `session_policies` |
| Idle timeout | 30 minutes default | Via `session_policies` |
| IP allowlist | Empty (all IPs) | Via `session_policies` |

### Session Policy Table

```sql
CREATE TABLE IF NOT EXISTS session_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  max_session_hours INTEGER DEFAULT 8,
  idle_timeout_minutes INTEGER DEFAULT 30,
  require_mfa BOOLEAN DEFAULT false,
  ip_allowlist JSONB DEFAULT '[]',
  UNIQUE(company_id)
);
```

---

## 5. SAML 2.0 Integration Path

### Service Provider (AdminMate) Configuration

| Field | Value |
|-------|-------|
| SP Entity ID | `https://app.adminmate.ai/saml/metadata` |
| ACS URL | `https://app.adminmate.ai/saml/acs` |
| SLO URL | `https://app.adminmate.ai/saml/slo` |
| Name ID Format | `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` |

### Identity Provider Configuration

| Field | Source |
|-------|--------|
| IdP Entity ID | From SAML metadata |
| SSO URL | From SAML metadata |
| SLO URL | From SAML metadata |
| X.509 Certificate | From SAML metadata or manual upload |

### SAML Flow

```
1. User clicks "Sign in with SSO"
2. AdminMate generates SAML AuthnRequest
3. Redirects user to IdP SSO URL
4. IdP authenticates user
5. IdP posts SAML Response to ACS URL
6. AdminMate validates signature, extracts attributes
7. Creates/finds user in Supabase Auth
8. Maps to company via NameID or attribute
9. Session created
```

---

## 6. Sandbox Verification Checklist

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | `getSSOConfig()` with no config | Returns `null` | ⬜ Pending |
| 2 | `saveSSOConfig()` creates config | Config saved, `is_enabled=false` | ⬜ Pending |
| 3 | `saveSSOConfig()` with `is_enabled=true` | Config saved, enabled | ⬜ Pending |
| 4 | `testSSOConnection()` no config | Returns error | ⬜ Pending |
| 5 | `testSSOConnection()` disabled | Returns "SSO is disabled" | ⬜ Pending |
| 6 | `testSSOConnection()` valid metadata URL | Returns success, status=`verified` | ⬜ Pending |
| 7 | `testSSOConnection()` invalid URL | Returns error, status=`error` | ⬜ Pending |
| 8 | `testSSOConnection()` entity_id + cert only | Returns success if both present | ⬜ Pending |
| 9 | RLS: Company A cannot read Company B SSO | Query returns empty | ✅ Migrated |
| 10 | Permission: `sso.write` required for save | Unauthorized rejected | ⬜ Pending |
| 11 | Only one SSO config per company | Upsert behavior | ⬜ Pending |

---

## 7. Azure AD / Google Workspace (Planned)

### Azure AD

| Requirement | Detail |
|-------------|--------|
| Protocol | OIDC or SAML |
| Tenant | Azure AD tenant ID |
| App registration | Required in Azure portal |
| Scopes | `openid`, `profile`, `email` |

### Google Workspace

| Requirement | Detail |
|-------------|--------|
| Protocol | OIDC |
| Client ID | From Google Cloud Console |
| Client secret | From Google Cloud Console |
| Scopes | `openid`, `email`, `profile` |

---

## 8. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No SAML AuthnRequest generation | P0 | Implement SP-initiated SSO |
| No SAML Response validation | P0 | Implement signature validation |
| No OIDC integration | P1 | Add OIDC adapter |
| No Azure AD integration | P1 | Add Azure AD adapter |
| No Google Workspace integration | P2 | Add Google OIDC adapter |
| No Just-In-Time user provisioning | P1 | Auto-create users on first SSO login |
| No SSO audit logging | P2 | Log all SSO login attempts |
