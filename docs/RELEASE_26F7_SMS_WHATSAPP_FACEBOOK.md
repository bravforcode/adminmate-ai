# Release 26F.7 — SMS, WhatsApp, Facebook Verification

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. SMS Provider

### Adapter Location

`src/services/messaging/providers/smsProvider.ts`

### Current State: Stub (Not Configured)

```typescript
async isConfigured(): Promise<boolean> {
  return false  // SMS provider not yet configured
}
```

### Integration Path

| Requirement | Detail |
|-------------|--------|
| Provider | Twilio (primary), MessageBird, Vonage |
| API | REST API with Bearer token auth |
| Sandbox | Twilio test credentials available |
| Flow | Service → Adapter → Twilio API → Delivery status webhook |

### Twilio Sandbox Setup

1. Create Twilio account
2. Get test Account SID and Auth Token
3. Use Twilio test phone numbers (no real SMS charged)
4. Configure webhook for delivery status

---

## 2. WhatsApp Provider

### Adapter Location

`src/services/messaging/providers/whatsappProvider.ts`

### Configuration Check

```typescript
async isConfigured(companyId: string): Promise<boolean> {
  const { data } = await supabase
    .from('chat_platform_connections')
    .select('id')
    .eq('company_id', companyId)
    .eq('platform', 'whatsapp')
    .eq('is_active', true)
    .maybeSingle()
  return !!data
}
```

### Send Behavior

Server-side only via `MessagingHub.processQueue()`.

### WhatsApp Business API Integration

| Requirement | Detail |
|-------------|--------|
| API | WhatsApp Business Platform Cloud API |
| Auth | System user access token |
| Phone Number | WhatsApp Business verified number |
| Sandbox | Test numbers available |
| Templates | Pre-approved templates for outbound |

### Message Flow

```
1. Service calls sendMessage('whatsapp', companyId, to, body)
2. Adapter checks chat_platform_connections for active connection
3. If configured → message queued to message_queue
4. MessagingHub.processQueue() picks up pending messages
5. Calls WhatsApp Cloud API with access token
6. Logs result to integration_event_logs
```

---

## 3. Facebook Messenger Provider

### Adapter Location

`src/services/messaging/providers/facebookProvider.ts`

### Current State: Stub (Not Configured)

```typescript
async isConfigured(): Promise<boolean> {
  return false  // Facebook Messenger not configured
}
```

### Integration Path

| Requirement | Detail |
|-------------|--------|
| API | Meta Graph API v18.0 |
| Auth | Page access token |
| App | Meta Developer App with Messenger product |
| Sandbox | Test page in development mode |
| Flow | Page token → Send API → Webhook for inbound |

### Meta Developer Setup

1. Create Meta Developer App
2. Enable Messenger product
3. Generate Page Access Token
4. Configure webhook URL for inbound messages
5. Subscribe to `messages`, `messaging_postbacks` events

---

## 4. Database Tables

### `chat_platform_connections`

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | UUID FK | Tenant scope |
| `platform` | VARCHAR | `line`, `whatsapp`, `facebook` |
| `is_active` | BOOLEAN | Connection enabled |
| `config_data` | JSONB | Platform tokens and config |

### `message_queue`

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | UUID FK | Tenant scope |
| `channel` | VARCHAR | `sms`, `whatsapp`, `facebook` |
| `recipient` | VARCHAR | Phone number or user ID |
| `body` | TEXT | Message content |
| `status` | VARCHAR | `pending`, `sent`, `failed` |
| `error_message` | TEXT | Failure reason |

---

## 5. Sandbox Verification Checklist

### SMS

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | `isConfigured()` returns false | Returns `false` | ✅ Stub |
| 2 | Client-side `send()` | Returns `provider_not_configured` | ✅ Stub |
| 3 | Twilio test credentials work | SMS delivered to test number | ⬜ Pending |
| 4 | Delivery status webhook | Status updated in `message_queue` | ⬜ Pending |
| 5 | Rate limiting | Respects Twilio rate limits | ⬜ Pending |

### WhatsApp

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | `isConfigured()` with no connection | Returns `false` | ⬜ Pending |
| 2 | `isConfigured()` with active connection | Returns `true` | ⬜ Pending |
| 3 | Client-side `send()` | Returns `provider_not_configured` | ✅ Stub |
| 4 | Server-side queue processes message | WhatsApp API called | ⬜ Pending |
| 5 | Template message (outbound) | Pre-approved template used | ⬜ Pending |
| 6 | Session message (inbound reply) | Free-form within 24h window | ⬜ Pending |

### Facebook

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | `isConfigured()` returns false | Returns `false` | ✅ Stub |
| 2 | Client-side `send()` | Returns `provider_not_configured` | ✅ Stub |
| 3 | Graph API send message | Message delivered to test user | ⬜ Pending |
| 4 | Webhook inbound messages | Inbound stored in `messages` | ⬜ Pending |

---

## 6. Multi-Channel Message Routing

### Channel Priority

| Channel | Use Case | Priority |
|---------|----------|----------|
| WhatsApp | External candidate communication | High |
| LINE | Thailand-based employees | High |
| SMS | Critical alerts, OTP | High |
| Facebook | Social media inquiries | Medium |
| Email | Formal communications | Medium |
| In-App | Internal notifications | Low |

### Fallback Strategy

```
Primary channel fails → Retry (3x) → Fallback to next channel → Log failure
```

---

## 7. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No Twilio integration | P0 | Implement SMS provider adapter |
| No WhatsApp Business API | P0 | Wire Cloud API with template management |
| No Meta Graph API | P1 | Implement Facebook Messenger adapter |
| No delivery status webhooks | P1 | Handle inbound delivery confirmations |
| No message template system | P2 | Pre-approved templates for each channel |
| No inbound message routing | P2 | Parse and route inbound messages to chat |
