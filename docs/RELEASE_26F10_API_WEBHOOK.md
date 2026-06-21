# Release 26F.10 — Public API, Webhooks, No-Code

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. Public API

### Service Location

`src/services/api/apiKeyService.ts`

### Migration

`supabase/migrations/20240620000041_api_webhooks.sql`

### API Client & Key Management

| Table | Purpose |
|-------|---------|
| `api_clients` | Registered API clients per company |
| `api_keys` | Hashed API keys with scopes |

### API Key Format

```
am_{random-64-hex-chars}
```

- Prefix: `am_` (for identification)
- Hash: SHA-256 (never stored plaintext)
- Scopes: JSONB array of permitted resources

### Key Lifecycle

```
1. Create API client (client_name, client_type)
2. Generate API key with scopes
3. Raw key shown once (returned in response)
4. Key validated via hash lookup
5. Key revoked (soft delete, is_active=false)
```

### Service Methods

| Method | Permission | Description |
|--------|-----------|-------------|
| `createClient(companyId, input)` | `api_key.write` | Register new API client |
| `generateApiKey(clientId, scopes, expiresAt?)` | `api_key.write` | Generate key for client |
| `validateApiKey(keyHash)` | — | Validate key, update `last_used_at` |
| `revokeApiKey(keyId)` | `api_key.write` | Soft-revoke key |
| `listClients(companyId)` | `api_key.read` | List all clients |
| `listKeys(clientId)` | `api_key.read` | List keys for client |

### RLS Policies

```sql
-- API clients: company-scoped read/write
CREATE POLICY ac_read ON api_clients
  FOR SELECT USING (company_id = safe_user_company_id());

-- API keys: inherit via client join
CREATE POLICY ak_read ON api_keys
  FOR SELECT USING (client_id IN (
    SELECT id FROM api_clients WHERE company_id = safe_user_company_id()
  ));
```

---

## 2. Webhooks

### Service Location

`src/services/api/webhookService.ts`

### Database Tables

| Table | Purpose |
|-------|---------|
| `webhook_subscriptions` | Webhook endpoint registrations |
| `webhook_delivery_attempts` | Delivery history with retry state |

### Webhook Subscription

| Field | Description |
|-------|-------------|
| `company_id` | Tenant scope |
| `client_id` | API client that owns the webhook |
| `event_types` | JSONB array of subscribed events |
| `url` | Delivery endpoint URL |
| `secret_hash` | SHA-256 of signing secret |
| `is_active` | Whether webhook is active |

### Supported Event Types

| Event | Trigger |
|-------|---------|
| `employee.created` | New employee added |
| `employee.updated` | Employee record modified |
| `employee.deleted` | Employee soft-deleted |
| `candidate.created` | New candidate added |
| `application.created` | New application submitted |
| `interview.scheduled` | Interview created |
| `offer.created` | Offer letter generated |
| `offer.signed` | Offer accepted |
| `payroll.completed` | Payroll run finalized |
| `subscription.updated` | Subscription changed |

### Webhook Delivery

#### HMAC-SHA256 Signing

```typescript
const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex')
```

Headers sent:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Webhook-Signature` | HMAC-SHA256 signature |
| `X-Webhook-Event` | Event type name |

#### Retry Policy

| Attempt | Delay | Total Wait |
|---------|-------|------------|
| 1 | Immediate | 0s |
| 2 | 1s | 1s |
| 3 | 2s | 3s |
| 4 | 4s | 7s |
| 5 | 8s | 15s |

Max retries: 5. After exhausting retries, status remains `failed`.

#### Payload Structure

```json
{
  "event": "employee.created",
  "timestamp": "2026-06-22T10:00:00Z",
  "company_id": "uuid",
  "data": {
    "id": "employee-uuid",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Webhook Verification

```typescript
webhookService.verifySignature(secret, body, signature)
// Uses crypto.timingSafeEqual for constant-time comparison
```

---

## 3. No-Code Workflow Engine (Planned)

### Migration

`supabase/migrations/20240620000041_api_webhooks.sql` — Workflow tables defined.

### Workflow Tables

| Table | Purpose |
|-------|---------|
| `workflow_definitions` | Workflow triggers and steps |
| `workflow_runs` | Execution history |
| `workflow_step_runs` | Per-step execution state |

### Workflow Trigger Types

| Trigger | Description |
|---------|-------------|
| `event` | Webhook event received |
| `schedule` | Cron-based execution |
| `manual` | User-initiated |

### Workflow Action Types

| Action | Description |
|--------|-------------|
| `send_email` | Send via email adapter |
| `send_sms` | Send via SMS adapter |
| `send_webhook` | Call external webhook |
| `update_record` | Modify database record |
| `create_record` | Create new record |
| `condition` | If/else branching |
| `delay` | Wait for duration |

---

## 4. Sandbox Verification Checklist

### API Keys

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | Create API client | Client saved, UUID returned | ⬜ Pending |
| 2 | Generate API key | Raw key returned once, hash stored | ⬜ Pending |
| 3 | Validate valid key | Key returned, `last_used_at` updated | ⬜ Pending |
| 4 | Validate expired key | Returns `null` | ⬜ Pending |
| 5 | Validate revoked key | Returns `null` | ⬜ Pending |
| 6 | RLS: Company A cannot see Company B clients | Query returns empty | ✅ Migrated |
| 7 | Permission: `api_key.write` required for create | Unauthorized rejected | ⬜ Pending |

### Webhooks

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | Create webhook subscription | Subscription saved | ⬜ Pending |
| 2 | Trigger event → delivery attempted | `webhook_delivery_attempts` created | ⬜ Pending |
| 3 | Successful delivery (200 OK) | Status=`delivered` | ⬜ Pending |
| 4 | Failed delivery (5xx) | Status=`failed`, retry scheduled | ⬜ Pending |
| 5 | Max retries exhausted | Status=`failed`, no more retries | ⬜ Pending |
| 6 | Signature verification | Valid/invalid signatures detected | ⬜ Pending |
| 7 | Manual retry | New attempt created | ⬜ Pending |
| 8 | Delete subscription | Subscription removed | ⬜ Pending |
| 9 | RLS: Company A cannot trigger Company B webhooks | Query returns empty | ✅ Migrated |

---

## 5. RBAC Permissions

| Permission | Owner | Admin | HR Manager | HR Staff | Manager |
|-----------|-------|-------|------------|----------|---------|
| `api_key.read` | Yes | Yes | No | No | No |
| `api_key.write` | Yes | Yes | No | No | No |
| `webhook.read` | Yes | Yes | No | No | No |
| `webhook.write` | Yes | Yes | No | No | No |

---

## 6. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No REST API endpoint layer | P0 | Implement API routes (edge functions or gateway) |
| No API rate limiting | P0 | Add per-key rate limits |
| No API versioning | P1 | Implement `v1/` prefix strategy |
| No OpenAPI spec | P1 | Generate API documentation |
| No workflow engine runtime | P2 | Implement workflow executor |
| No API analytics dashboard | P3 | Track usage per API key |
