# Release 26F.1 — Integration Control Plane

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. Provider Adapter Interface

All messaging adapters implement the `MessageProvider` interface defined in `src/services/messaging/providers/types.ts`.

```typescript
export interface MessageProvider {
  provider: string
  channel: MessageChannel
  isConfigured(companyId: string): Promise<boolean>
  send(input: MessageProviderSendInput): Promise<MessageProviderSendResult>
}
```

### MessageChannel Enum

| Channel | Provider Adapter | Config Source |
|---------|-----------------|---------------|
| `email` | `emailProvider` | `messaging_provider_configs` |
| `line` | `lineProvider` | `chat_platform_connections` |
| `whatsapp` | `whatsappProvider` | `chat_platform_connections` |
| `sms` | `smsProvider` | Stub (returns `provider_not_configured`) |
| `facebook` | `facebookProvider` | Stub (returns `provider_not_configured`) |
| `in_app` | `inAppProvider` | Client-side only |

### Adapter Registry

Centralized in `src/services/messaging/providers/index.ts`:

| Function | Description |
|----------|-------------|
| `getProvider(channel)` | Returns adapter for given channel |
| `isChannelConfigured(channel, companyId)` | Checks `isConfigured()` on adapter |
| `sendMessage(channel, companyId, to, body, subject?, metadata?)` | Delegates to adapter `send()` |

### Send Result Contract

```typescript
export interface MessageProviderSendResult {
  success: boolean
  provider: string
  providerMessageId?: string
  status: MessageProviderStatus  // 'sent' | 'queued' | 'failed' | 'provider_not_configured'
  errorMessage?: string
}
```

---

## 2. Integration Provider Catalog

Global provider catalog stored in `integration_providers` table (migration `20240620000034_integration_adapters.sql`).

| provider_key | Name | Category | Description |
|-------------|------|----------|-------------|
| `google_calendar` | Google Calendar | calendar | Sync events with Google Calendar |
| `microsoft_calendar` | Microsoft Calendar | calendar | Sync events with Outlook / M365 Calendar |
| `slack` | Slack | messaging | Send notifications via Slack |
| `teams` | Microsoft Teams | messaging | Send notifications via MS Teams |
| `line` | LINE | messaging | Send notifications via LINE Messaging API |
| `whatsapp` | WhatsApp | messaging | Send notifications via WhatsApp Business API |
| `xero` | Xero | accounting | Sync financial data with Xero |
| `quickbooks` | QuickBooks | accounting | Sync financial data with QuickBooks |

### Category Taxonomy

| Category | Providers | Status |
|----------|-----------|--------|
| `calendar` | Google Calendar, Microsoft Calendar | Planned |
| `messaging` | Slack, Teams, LINE, WhatsApp | LINE/WhatsApp adapters exist |
| `accounting` | Xero, QuickBooks | Planned |

---

## 3. Capability Model

### Integration Capability States

Defined in `feature_capabilities` table via `capabilityRegistryService.ts`:

| Status | Meaning |
|--------|---------|
| `complete` | Fully implemented and verified |
| `sandbox_verified` | Verified in sandbox environment |
| `functional_local` | Works locally, not verified with real provider |
| `adapter_only` | Adapter interface implemented, no real provider |
| `schema_only` | Database schema exists, no service code |
| `disabled_not_configured` | Provider exists but not configured |
| `not_started` | Not yet implemented |

### Current Capability Matrix (Messaging Integrations)

| Feature Key | Module | Status | Provider Requirement |
|-------------|--------|--------|---------------------|
| `email_messaging` | Messaging | `adapter_only` | SMTP/SendGrid/Mailgun |
| `line_messaging` | Messaging | `adapter_only` | LINE Channel Access Token |
| `whatsapp_messaging` | Messaging | `adapter_only` | WhatsApp Business API |
| `sms_messaging` | Messaging | `not_started` | Twilio/SMS gateway |
| `facebook_messaging` | Messaging | `not_started` | Meta Graph API |
| `google_calendar_sync` | Calendar | `schema_only` | Google Calendar API OAuth |
| `microsoft_calendar_sync` | Calendar | `schema_only` | Microsoft Graph API OAuth |
| `slack_notifications` | Messaging | `schema_only` | Slack Bot Token |
| `teams_notifications` | Messaging | `schema_only` | MS Teams Bot Framework |
| `xero_accounting` | Accounting | `schema_only` | Xero OAuth |
| `quickbooks_accounting` | Accounting | `schema_only` | QuickBooks OAuth |

---

## 4. Per-Company Configuration

### Tables

| Table | Scope | Key Columns |
|-------|-------|-------------|
| `integration_configs` | Per-company | `company_id`, `provider_id`, `config_data` (JSONB), `is_enabled`, `config_status` |
| `messaging_provider_configs` | Per-company | `company_id`, `provider`, `is_enabled`, `config_status` |
| `chat_platform_connections` | Per-company | `company_id`, `platform`, `is_active` |

### Config Status Lifecycle

```
not_configured → configured → connected → error
                                    ↑
                              (connection test)
```

### Service Layer

| Method | Description |
|--------|-------------|
| `integrationService.getProviders()` | List all active providers (global catalog) |
| `integrationService.getConfig(companyId, providerKey)` | Get per-company config (masked) |
| `integrationService.saveConfig(companyId, providerKey, configData)` | Create or update config |
| `integrationService.testConnection(companyId, providerKey)` | Test provider connection |
| `integrationService.syncData(companyId, providerKey, syncType)` | Trigger sync job |
| `integrationService.getEventLogs(companyId, providerKey)` | Get event audit trail |

### Sensitive Config Masking

`maskConfigData()` in `integrationService.ts` masks keys: `api_key`, `secret`, `token`, `password`, `access_token`, `refresh_token` — showing first 4 and last 4 chars.

---

## 5. Event Logging

All integration events logged to `integration_event_logs`:

| Column | Purpose |
|--------|---------|
| `event_type` | e.g., `connection_test`, `sync`, `send` |
| `direction` | `inbound` or `outbound` |
| `payload_hash` | Deterministic hash of payload (no PII) |
| `status` | `success`, `failed`, `error` |
| `error_message` | Error details on failure |

---

## 6. RBAC Permissions

| Permission | Owner | Admin | HR Manager | HR Staff | Manager |
|-----------|-------|-------|------------|----------|---------|
| `integration.read` | Yes | Yes | Yes | Yes | Yes |
| `integration.write` | Yes | Yes | Yes | No | No |

Enforced via `has_permission('integration', 'write')` in service layer and RLS policies.

---

## Verification

```sql
-- List all providers in global catalog
SELECT provider_key, name, category, is_active FROM integration_providers ORDER BY category, name;

-- List per-company configs with status
SELECT ip.provider_key, ic.config_status, ic.is_enabled
FROM integration_configs ic
JOIN integration_providers ip ON ip.id = ic.provider_id
WHERE ic.company_id = 'COMPANY_ID';

-- Check event logs for a provider
SELECT event_type, direction, status, created_at
FROM integration_event_logs
WHERE company_id = 'COMPANY_ID'
  AND provider_id = (SELECT id FROM integration_providers WHERE provider_key = 'email')
ORDER BY created_at DESC LIMIT 10;
```
