# Release 26F.2 — Email Sandbox Verification

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. Email Provider Adapter

### Adapter Location

`src/services/messaging/providers/emailProvider.ts`

### Current State: Stub

The email provider is implemented as a **stub adapter** that checks configuration but does not send real email.

```typescript
// Real implementation would call SMTP/SendGrid/Mailgun API
return {
  success: false,
  provider: 'email',
  status: 'provider_not_configured',
  errorMessage: 'Email sending not yet implemented. Configure SMTP provider first.',
}
```

### Configuration Check

```typescript
async isConfigured(companyId: string): Promise<boolean> {
  const { data } = await supabase
    .from('messaging_provider_configs')
    .select('is_enabled, config_status')
    .eq('company_id', companyId)
    .eq('provider', 'email')
    .maybeSingle()
  return data?.is_enabled === true && data?.config_status === 'configured'
}
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `messaging_provider_configs` | Per-company email provider config |
| `integration_configs` | General integration config (alternative path) |

#### `messaging_provider_configs` Schema

```sql
CREATE TABLE IF NOT EXISTS messaging_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config_status VARCHAR(30) DEFAULT 'not_configured',
  config_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Sandbox Verification Checklist

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | `isConfigured()` with no config | Returns `false` | ⬜ Pending |
| 2 | `isConfigured()` with `is_enabled=false` | Returns `false` | ⬜ Pending |
| 3 | `isConfigured()` with `config_status=not_configured` | Returns `false` | ⬜ Pending |
| 4 | `isConfigured()` with `config_status=configured` + `is_enabled=true` | Returns `true` | ⬜ Pending |
| 5 | `send()` when not configured | Returns `provider_not_configured` | ⬜ Pending |
| 6 | `send()` with valid input structure | Correctly shaped result | ⬜ Pending |
| 7 | Config masking (API key in `config_data`) | Sensitive keys masked | ✅ Implemented |
| 8 | RLS enforcement | Company A cannot read Company B's config | ✅ Migrated |

---

## 3. SMTP Provider Integration Path

### Required Environment / Config

| Config Key | Description | Example |
|------------|-------------|---------|
| `smtp_host` | SMTP server hostname | `smtp.sendgrid.net` |
| `smtp_port` | SMTP server port | `587` |
| `smtp_user` | SMTP username / API key | `apikey` |
| `smtp_pass` | SMTP password / API key value | `SG.xxx` |
| `from_email` | Sender email address | `noreply@company.com` |
| `from_name` | Sender display name | `AdminMate` |

### Recommended Providers

| Provider | Sandbox Available | Notes |
|----------|------------------|-------|
| SendGrid | Yes (free tier, 100/day) | API key auth |
| Mailgun | Yes (sandbox domain) | API key auth |
| AWS SES | Yes (sandbox mode) | IAM credentials |
| Postmark | Yes (sandbox mode) | Server token |

---

## 4. Email Flow Architecture

```
1. Service calls sendMessage('email', companyId, to, body, subject)
2. Adapter checks isConfigured(companyId) via messaging_provider_configs
3. If not configured → returns provider_not_configured
4. If configured → (currently stub, future: SMTP/API call)
5. Result logged to integration_event_logs
6. message_queue table updated with status
```

---

## 5. Message Queue Integration

Email messages flow through `message_queue` table:

| Column | Purpose |
|--------|---------|
| `company_id` | Tenant scope |
| `channel` | `email` |
| `recipient` | Email address |
| `subject` | Email subject |
| `body` | Email body (HTML) |
| `status` | `pending`, `sent`, `failed` |
| `provider_message_id` | External provider's message ID |
| `error_message` | Failure reason |

---

## 6. Audit Trail

All email sends logged to `audit_logs`:

```sql
-- Verify email audit trail
SELECT action, resource_type, details, created_at
FROM audit_logs
WHERE company_id = 'COMPANY_ID'
  AND action LIKE 'messaging.email%'
ORDER BY created_at DESC;
```

---

## 7. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No real SMTP implementation | P0 | Wire SendGrid/Mailgun adapter |
| No email template system | P1 | Implement template rendering with variables |
| No bounce/complaint handling | P2 | Add webhook receiver for delivery status |
| No rate limiting per company | P2 | Add rate limit check before send |
| No email content sanitization | P2 | Add HTML sanitization for body |
