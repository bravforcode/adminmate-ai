# Release 26D.3 — Audit Log Integrity

**Gate:** D — Observability, Recovery, and Operational Readiness
**Date:** 2024-06-20
**Owner:** Security & Compliance

## Overview

Implement append-only audit logging with actor/target tracking, sensitive data masking, and configurable retention to meet compliance requirements and enable forensic analysis.

## Objectives

- All critical operations produce audit log entries
- Audit logs are append-only and cryptographically signed
- Actor and target identified with full context
- Sensitive data masked while preserving forensic value
- Retention policy enforced automatically

## Audit Log Schema

### Table: `audit_log`

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'api_key', 'impersonator')),
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  changes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  correlation_id UUID,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only enforcement
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION raise_immutable_error();

-- Index for tenant isolation
CREATE INDEX idx_audit_log_company_id ON audit_log(company_id);
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

### Cryptographic Signature

```typescript
// Each audit entry signed with HMAC-SHA256
function generateAuditSignature(entry: AuditEntry): string {
  const payload = [
    entry.id,
    entry.company_id,
    entry.actor_id,
    entry.action,
    entry.resource_type,
    entry.resource_id,
    entry.created_at.toISOString(),
    entry.previous_entry_hash,
  ].join('|');

  return createHmac('sha256', AUDIT_SECRET)
    .update(payload)
    .digest('hex');
}
```

## Actor Tracking

### Actor Types

| Type | Description | Example |
|------|-------------|---------|
| `user` | Authenticated human user | Employee editing invoice |
| `system` | Automated process | Cron job updating statuses |
| `api_key` | External integration | Zapier creating record |
| `impersonator` | Admin impersonating user | Support agent debugging |

### Actor Context

```typescript
interface ActorContext {
  actor_id: string;
  actor_type: 'user' | 'system' | 'api_key' | 'impersonator';
  actor_email?: string;
  impersonated_user_id?: string;
  session_id?: string;
  ip_address: string;
  user_agent: string;
}
```

## Target Tracking

### Resource Types

| Type | Auditable Actions |
|------|-------------------|
| `user` | create, update, delete, login, logout, password_change |
| `invoice` | create, update, delete, send, void, payment_received |
| `customer` | create, update, delete, merge |
| `product` | create, update, delete, price_change |
| `settings` | update, feature_flag_change |
| `integration` | connect, disconnect, sync |

### Change Tracking

```typescript
interface AuditChange {
  field: string;
  old_value: unknown;
  new_value: unknown;
  sensitive: boolean; // If true, values masked in log
}

// Example change payload
{
  "changes": [
    {
      "field": "amount",
      "old_value": 100.00,
      "new_value": 150.00,
      "sensitive": false
    },
    {
      "field": "payment_method",
      "old_value": "[REDACTED]",
      "new_value": "[REDACTED]",
      "sensitive": true
    }
  ]
}
```

## Sensitive Data Masking

### Masking Rules

| Field | Masking Strategy | Example |
|-------|------------------|---------|
| `password` | Full redaction | `[REDACTED]` |
| `token` | Show first/last 4 | `tok_...xyz9` |
| `ssn` | Show last 4 | `***-**-1234` |
| `credit_card` | Show last 4 | `****-****-****-1234` |
| `bank_account` | Show last 4 | `****1234` |
| `email` | Full redaction in PII contexts | `[REDACTED_EMAIL]` |
| `ip_address` | Partial redaction | `192.168.***.***` |

### Masking Implementation

```typescript
const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'secret', 'ssn', 'credit_card',
  'bank_account', 'api_key', 'access_token', 'refresh_token'
]);

function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...data };
  for (const [key, value] of Object.entries(masked)) {
    if (SENSITIVE_FIELDS.has(key)) {
      masked[key] = '[REDACTED]';
    } else if (typeof value === 'string' && looksLikeSensitive(value)) {
      masked[key] = maskPattern(value);
    }
  }
  return masked;
}
```

## Retention Policy

### Policy Table: `audit_log_retention`

```sql
CREATE TABLE audit_log_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  resource_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 2555, -- ~7 years default
  legal_hold BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, resource_type)
);
```

### Retention Tiers

| Tier | Retention | Applies To |
|------|-----------|------------|
| Default | 7 years | All audit entries |
| Extended | 10 years | Financial records, contracts |
| Legal Hold | Indefinite | Active investigations |
| Short | 1 year | System operations (non-critical) |

### Automated Cleanup

```sql
-- Scheduled job runs nightly
DELETE FROM audit_log
WHERE created_at < now() - (retention_days || ' days')::interval
  AND company_id = $company_id
  AND resource_type = $resource_type
  AND NOT EXISTS (
    SELECT 1 FROM audit_log_retention
    WHERE company_id = audit_log.company_id
      AND resource_type = audit_log.resource_type
      AND legal_hold = true
  );
```

## Query Interface

### Common Queries

```sql
-- All actions by a specific user
SELECT * FROM audit_log
WHERE company_id = $1 AND actor_id = $2
ORDER BY created_at DESC LIMIT 100;

-- All changes to a specific resource
SELECT * FROM audit_log
WHERE company_id = $1 AND resource_type = $2 AND resource_id = $3
ORDER BY created_at DESC;

-- Actions in time range
SELECT * FROM audit_log
WHERE company_id = $1
  AND created_at BETWEEN $2 AND $3
ORDER BY created_at DESC;
```

## Acceptance Criteria

- [ ] All CRUD operations on sensitive resources produce audit entries
- [ ] Audit log is append-only (UPDATE/DELETE blocked by trigger)
- [ ] Each entry has valid HMAC signature
- [ ] Sensitive fields masked in change tracking
- [ ] Retention policy table populated with defaults
- [ ] Nightly cleanup job configured and tested
- [ ] Legal hold prevents deletion of marked entries
- [ ] Query interface documented with examples
