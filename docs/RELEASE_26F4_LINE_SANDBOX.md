# Release 26F.4 — LINE OA Sandbox Verification

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. LINE Provider Adapter

### Adapter Location

`src/services/messaging/providers/lineProvider.ts`

### Configuration Check

```typescript
async isConfigured(companyId: string): Promise<boolean> {
  const { data } = await supabase
    .from('chat_platform_connections')
    .select('id')
    .eq('company_id', companyId)
    .eq('platform', 'line')
    .eq('is_active', true)
    .maybeSingle()
  return !!data
}
```

### Send Behavior

LINE sending is **server-side only** via `MessagingHub.processQueue()`. Client-side adapter returns:

```typescript
{
  success: false,
  provider: 'line',
  status: 'provider_not_configured',
  errorMessage: 'LINE sending via client not supported. Use server-side queue.',
}
```

---

## 2. Database Schema

### `chat_platform_connections`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `company_id` | UUID FK | Tenant scope |
| `platform` | VARCHAR | `line`, `whatsapp`, etc. |
| `is_active` | BOOLEAN | Whether connection is active |
| `config_data` | JSONB | Platform-specific config (tokens, etc.) |

### RLS Enforcement

```sql
-- Company members can read their own connections
CREATE POLICY chat_platform_connections_read ON chat_platform_connections
  FOR SELECT USING (company_id = safe_user_company_id());
```

---

## 3. LINE Official Account Integration

### Required LINE Configuration

| Config | Description | Source |
|--------|-------------|--------|
| Channel Access Token | Long-lived or short-lived token | LINE Developers Console |
| Channel Secret | For webhook signature verification | LINE Developers Console |
| LINE OA ID | Official Account identifier | LINE OA Manager |

### LINE API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /v2/bot/message/push` | Push message to user |
| `POST /v2/bot/message/multicast` | Push to multiple users |
| `GET /v2/bot/blocked/list` | Check blocked users |
| `POST /v2/bot/channel/webhook` | Receive webhook events |

### Message Types Supported

| Type | Use Case |
|------|----------|
| Text | Employee notifications, candidate updates |
| Sticker | Engagement messages |
| Template | Structured messages (leave approval, etc.) |
| Flex | Rich interactive messages |

---

## 4. Server-Side Queue Flow

```
1. Service calls sendMessage('line', companyId, to, body)
2. Adapter checks isConfigured() via chat_platform_connections
3. If configured → message queued to message_queue table
4. MessagingHub.processQueue() picks up pending messages
5. Calls LINE Push API with Channel Access Token
6. Logs result to integration_event_logs
7. Updates message_queue status
```

---

## 5. Sandbox Verification Checklist

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | `isConfigured()` with no connection | Returns `false` | ⬜ Pending |
| 2 | `isConfigured()` with active connection | Returns `true` | ⬜ Pending |
| 3 | `isConfigured()` with inactive connection | Returns `false` | ⬜ Pending |
| 4 | Client-side `send()` returns error | `provider_not_configured` | ✅ Stub |
| 5 | Message queued on server side | `message_queue` updated | ⬜ Pending |
| 6 | LINE Push API returns 200 | Message status=`sent` | ⬜ Pending |
| 7 | LINE Push API returns 4xx (blocked) | Message status=`failed`, logged | ⬜ Pending |
| 8 | Webhook signature verification | Invalid signatures rejected | ⬜ Pending |
| 9 | RLS: Company A cannot read Company B connections | Query returns empty | ✅ Migrated |
| 10 | Rate limiting (LINE: 500 msg/s) | Queue respects limit | ⬜ Pending |

---

## 6. LINE Sandbox Environment

### LINE Developers Console Setup

1. Create Provider in LINE Developers Console
2. Create Messaging API Channel
3. Issue Channel Access Token (long-lived for testing)
4. Enable webhook and set URL
5. Use LINE Official Account Manager for testing

### Test User Setup

1. Add test user as friend on LINE Official Account
2. Obtain user ID from webhook or API
3. Use user ID as `to` parameter in send calls

---

## 7. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No server-side queue processor | P0 | Implement `MessagingHub.processQueue()` |
| No webhook receiver | P1 | Implement webhook endpoint for inbound messages |
| No rich message templates | P2 | Add Flex Message templates for HR workflows |
| No group chat support | P2 | Add multicast for team notifications |
| No webhook signature verification | P2 | Validate `X-Line-Signature` header |
