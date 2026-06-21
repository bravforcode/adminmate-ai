# Release 26D.1 — Structured Logging

**Gate:** D — Observability, Recovery, and Operational Readiness
**Date:** 2024-06-20
**Owner:** Platform Engineering

## Overview

Implement correlation IDs and PII-safe structured logging across AdminMate AI to enable distributed tracing, debugging, and compliance with data protection requirements.

## Objectives

- Every request generates a unique `correlation_id` propagated through the full request lifecycle
- Structured logs in JSON format with consistent schema
- PII automatically detected and redacted before log emission
- Logs shipped to centralized logging infrastructure

## Correlation ID

### Generation

- Each inbound HTTP request receives a `correlation_id` via the `X-Correlation-ID` header
- If absent, the middleware generates a UUIDv4
- Stored in request context and passed to all downstream calls
- Injected into log context via middleware

### Propagation

```
Client → API Gateway → Backend Service → Database Queries → External APIs
         (generates)   (passes through)  (passes through)  (passes through)
```

### Schema

```json
{
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-06-20T14:32:01.234Z",
  "level": "info",
  "service": "adminmate-api",
  "version": "1.2.3",
  "environment": "production",
  "company_id": "comp_abc123",
  "user_id": "usr_xyz789",
  "message": "Invoice generated",
  "context": {
    "invoice_id": "inv_001",
    "amount": 1250.00
  }
}
```

## Structured Log Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `correlation_id` | string | UUIDv4 for request tracing |
| `timestamp` | ISO 8601 | Time of log emission |
| `level` | enum | `debug`, `info`, `warn`, `error`, `fatal` |
| `service` | string | Service identifier (e.g., `adminmate-api`) |
| `message` | string | Human-readable log message |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `company_id` | string | Tenant context |
| `user_id` | string | Acting user |
| `request_id` | string | HTTP request ID |
| `span_id` | string | OpenTelemetry span ID |
| `trace_id` | string | OpenTelemetry trace ID |

## PII Detection and Redaction

### Redaction Rules

| Pattern | Replacement | Notes |
|---------|-------------|-------|
| Email addresses | `[REDACTED_EMAIL]` | All email formats |
| Phone numbers | `[REDACTED_PHONE]` | International formats supported |
| SSN patterns | `[REDACTED_SSN]` | `XXX-XX-XXXX` |
| Credit card numbers | `[REDACTED_CC]` | 13-16 digit sequences |
| IP addresses | `[REDACTED_IP]` | IPv4 and IPv6 |
| Names in context | `[REDACTED_NAME]` | Only when flagged |

### Redaction Implementation

```typescript
// Redaction middleware applied to all log outputs
const REDACTION_RULES: RedactionRule[] = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[REDACTED_PHONE]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  { pattern: /\b(?:\d[ -]*?){13,16}\b/g, replacement: '[REDACTED_CC]' },
];

function redactPII(message: string): string {
  return REDACTION_RULES.reduce(
    (redacted, rule) => redacted.replace(rule.pattern, rule.replacement),
    message
  );
}
```

### Sensitive Fields

These fields are NEVER logged even if present in context:

- `password`
- `token`
- `secret`
- `api_key`
- `authorization`
- `ssn`
- `credit_card`
- `bank_account`

## Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `debug` | Detailed diagnostic info | SQL query parameters |
| `info` | Normal operations | User login, record created |
| `warn` | Unexpected but handled | Retry attempt, rate limit approached |
| `error` | Operation failed | Database connection lost, API timeout |
| `fatal` | System cannot continue | Unrecoverable corruption, OOM |

## Local Development

```bash
# Run with structured log output
npm run dev | npx pino-pretty

# Filter by level
npm run dev | npx pino-pretty --level debug

# Filter by correlation_id
npm run dev | npx pino-pretty --search "550e8400"
```

## Acceptance Criteria

- [ ] All API endpoints emit structured JSON logs
- [ ] Correlation ID present in 100% of request logs
- [ ] PII redaction catches all defined patterns in test suite
- [ ] Sensitive fields never appear in log output
- [ ] Log rotation configured for local development
- [ ] Performance impact < 5ms per log entry
- [ ] Documentation updated with log query examples
