# Release 26F.5 — E-Signature and Manual Signature

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. E-Signature Service

### Service Location

`src/services/onboarding/eSignatureService.ts`

### Provider Types

| Provider | Status | Notes |
|----------|--------|-------|
| `docusign` | Not configured | External provider integration required |
| `zapier_sign` | Not configured | External provider integration required |
| `manual` | **Always available** | Fallback when no e-signature provider |

### Status Lifecycle

```
not_configured → sent → viewed → signed
                           ↓
                      declined / expired / failed
```

Manual signature flow:

```
draft → manually_uploaded → (contract status: signed)
```

---

## 2. Database Schema

### `esignature_requests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `company_id` | UUID FK | Tenant scope |
| `generated_contract_id` | UUID FK | Link to contract |
| `provider` | VARCHAR | `docusign`, `zapier_sign`, `manual` |
| `provider_request_id` | VARCHAR | External provider's request ID |
| `status` | VARCHAR | Current status (see lifecycle) |
| `signer_email` | VARCHAR | Signer email |
| `signer_name` | VARCHAR | Signer display name |
| `sent_at` | TIMESTAMPTZ | When sent to signer |
| `signed_at` | TIMESTAMPTZ | When signed |
| `error_message` | TEXT | Failure reason |
| `metadata` | JSONB | Provider-specific metadata |
| `created_by` | UUID FK | User who initiated |

### RLS Policies

```sql
CREATE POLICY esr_read ON esignature_requests
  FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY esr_insert ON esignature_requests
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY esr_update ON esignature_requests
  FOR UPDATE USING (company_id = safe_user_company_id());
```

---

## 3. E-Signature Flow

### E-Signature Request

```
1. Contract must be in 'approved' status
2. createESignatureRequest() called with provider, signer info
3. Checks provider configuration
4. If configured → status='sent', sent_at set
5. If not configured → status='not_configured'
6. Contract status updated to 'sent_for_signature'
7. Audit log entry created
```

### Manual Signature Flow

```
1. markManualSigned() called
2. Creates esignature_request with provider='manual'
3. Status set to 'manually_uploaded'
4. signed_at set to NOW()
5. Contract status updated to 'signed'
6. Audit log entry created
```

---

## 4. Contract Lifecycle Integration

### `generated_contracts` Status Changes

| Trigger | From Status | To Status |
|---------|-------------|-----------|
| E-signature request sent | `approved` | `sent_for_signature` |
| E-signed (webhook) | `sent_for_signature` | `signed` |
| Manually marked | `approved` | `signed` |
| E-signature declined | `sent_for_signature` | `declined` |
| E-signature expired | `sent_for_signature` | `expired` |

---

## 5. Sandbox Verification Checklist

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | `createESignatureRequest()` on non-approved contract | Throws error | ⬜ Pending |
| 2 | `createESignatureRequest()` with `manual` provider | Status=`sent` (always configured) | ⬜ Pending |
| 3 | `createESignatureRequest()` with `docusign` (not configured) | Status=`not_configured` | ⬜ Pending |
| 4 | `markManualSigned()` | Contract status=`signed`, audit logged | ⬜ Pending |
| 5 | RLS: Company A cannot read Company B requests | Query returns empty | ✅ Migrated |
| 6 | Audit log created on request | `esignature.requested` logged | ⬜ Pending |
| 7 | Audit log created on manual sign | `esignature.manual_signed` logged | ⬜ Pending |
| 8 | Contract status validation | Cannot request sig on non-approved contract | ⬜ Pending |

---

## 6. Provider Integration Path

### DocuSign Integration

| Requirement | Detail |
|-------------|--------|
| API | DocuSign eSignature REST API v2.1 |
| Auth | OAuth 2.0 (JWT Grant) |
| Sandbox | Demo environment available |
| Flow | Create envelope → Send → Webhook callback |

### Zapier Sign Integration

| Requirement | Detail |
|-------------|--------|
| API | Zapier Webhooks |
| Auth | API key |
| Flow | Trigger webhook → Zapier handles signing → Callback |

---

## 7. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No DocuSign adapter implementation | P1 | Implement DocuSign API integration |
| No Zapier Sign adapter | P1 | Implement webhook-based signing |
| No webhook receiver for status updates | P1 | Handle DocuSign/Zapier callbacks |
| No document upload for manual signing | P2 | Allow upload of signed PDF |
| No expiration handling | P2 | Auto-expire after N days |
| No reminder notifications | P3 | Send reminder to unsigned signers |
