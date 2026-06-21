# Release 26B.7 — API & Error Contracts

**Generated:** 2026-06-22
**Gate:** B
**Tenant Key:** `company_id`

---

## 1. Standard Error Response Format

All API errors follow a consistent envelope:

```json
{
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "You do not have access to this resource",
    "details": {},
    "correlationId": "req_a1b2c3d4e5f6",
    "timestamp": "2026-06-22T12:00:00.000Z"
  }
}
```

### 1.1 Error Code Registry

| Code | HTTP Status | Category | Description |
|------|-------------|----------|-------------|
| `UNAUTHENTICATED` | 401 | Auth | Missing or invalid authentication token |
| `SESSION_EXPIRED` | 401 | Auth | Session has expired, re-login required |
| `TOKEN_INVALID` | 401 | Auth | JWT is malformed or signed with wrong key |
| `MFA_REQUIRED` | 401 | Auth | Multi-factor authentication required |
| `MFA_INVALID` | 401 | Auth | MFA code is incorrect |
| `FORBIDDEN` | 403 | Auth | Authenticated but insufficient permissions |
| `TENANT_ACCESS_DENIED` | 403 | Auth | Attempting to access resource outside user's `company_id` |
| `RESOURCE_NOT_FOUND` | 404 | Resource | Requested entity does not exist |
| `COMPANY_NOT_FOUND` | 404 | Resource | Company (tenant) does not exist |
| `VALIDATION_ERROR` | 400 | Input | Request body fails Zod schema validation |
| `DUPLICATE_RESOURCE` | 409 | Input | Entity already exists (unique constraint) |
| `REFERENCE_INTEGRITY` | 409 | Input | Foreign key constraint prevents operation |
| `RATE_LIMITED` | 429 | Throttle | Rate limit exceeded |
| `AI_SERVICE_UNAVAILABLE` | 503 | External | Gemini AI service unreachable |
| `AI_QUOTA_EXCEEDED` | 429 | External | AI API quota exhausted |
| `EXTERNAL_API_ERROR` | 502 | External | WhatsApp/LINE/Stripe API error |
| `INTERNAL_ERROR` | 500 | Server | Unhandled server-side error |
| `EDGE_FUNCTION_TIMEOUT` | 504 | Server | Supabase Edge Function exceeded time limit |
| `DATABASE_ERROR` | 500 | Server | Database operation failed |

### 1.2 Error Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error.code` | string | Yes | Machine-readable error code from registry |
| `error.message` | string | Yes | Human-readable message (may be localized) |
| `error.details` | object | No | Validation errors, field-level messages |
| `error.correlationId` | string | Yes | Unique request identifier for tracing |
| `error.timestamp` | ISO 8601 | Yes | Server timestamp of error |

---

## 2. Correlation ID Format

### 2.1 Generation

All incoming requests must carry or generate a correlation ID:

```
req_{nanoid-12}
```

- **Prefix:** `req_` (identifies request-originated IDs)
- **Body:** 12-character nanoid (URL-safe alphabet: `A-Za-z0-9_-`)
- **Example:** `req_a1b2c3d4e5F6`

### 2.2 Propagation

| Layer | Mechanism |
|-------|-----------|
| Client → Edge Function | `X-Correlation-ID` header (generated client-side if absent) |
| Edge Function → Supabase | Passed as `x-correlation-id` in request headers |
| Edge Function → External APIs | Passed as `X-Request-ID` to WhatsApp/LINE/Stripe |
| Frontend → Sentry | Attached as `extra.correlationId` on error events |
| Error response → Client | Returned in `error.correlationId` field |

### 2.3 Logging

All log entries include correlation ID as first structured field:

```
[req_a1b2c3d4e5F6] INFO  jobService.getJobs company_id=xyz
[req_a1b2c3d4e5F6] ERROR Gemini API timeout after 30000ms
```

---

## 3. Idempotency Patterns

### 3.1 Client-Side Idempotency

| Operation | Strategy | Key Source |
|-----------|----------|------------|
| Create job | UI disables submit button during POST | N/A (single-fire) |
| Create candidate | Supabase unique constraint on (email, company_id) | DB constraint |
| Send message | `message_queue` dedup on (platform + external_message_id) | Platform webhook ID |
| File upload | Supabase Storage `upsert` with deterministic path | `/{company_id}/{category}/{filename}` |
| Stripe webhook | `webhook_idempotency` table with 24h TTL | Stripe event ID |

### 3.2 Server-Side Idempotency (Edge Functions)

```sql
-- webhook_idempotency table pattern
INSERT INTO webhook_idempotency (event_id, platform, processed_at)
VALUES ($1, $2, now())
ON CONFLICT (event_id) DO NOTHING
RETURNING id;  -- NULL if duplicate
```

### 3.3 Retry-safe Operations

| Operation | Safe to retry | Reason |
|-----------|---------------|--------|
| GET (all) | Yes | Idempotent by definition |
| PUT (update) | Yes | Idempotent — overwrites with same data |
| DELETE | Yes | Idempotent — already-deleted returns 404 |
| POST (create) | Conditional | Only if unique constraint prevents duplicates |
| Edge function (AI) | No | Non-deterministic output — do not auto-retry |

---

## 4. PII Redaction Rules

### 4.1 Sentry Redaction (Active)

Configured in `src/lib/sentry.ts` via `beforeSend` hook:

| Field | Redaction | Replacement |
|-------|-----------|-------------|
| `Authorization` header | Full | `[redacted]` |
| `X-RateLimit-Key` header | Full | `[redacted]` |
| `Cookie` header | Full | `[redacted]` |
| `user.email` | Full | `[redacted]` |
| `user.username` | Full | `[redacted]` |
| `user.ip_address` | Full | `[redacted]` |
| Request URL query params | Stripped | URL path only |

### 4.2 Error Handler Redaction

In `src/lib/errorHandler.ts`, error payloads sent to `log-client-error`:

| Field | Treatment |
|-------|-----------|
| `message` | Error message text only — no PII in standard errors |
| `stack` | Included as-is (contains file paths, not PII) |
| `userId` | Supabase `auth.uid()` — internal UUID, not PII |
| `companyId` | Internal UUID, not PII |
| `url` | Current page URL — may contain query params with PII |
| `userAgent` | Browser UA string — not PII |

### 4.3 Sensitive Field Registry (Database)

The `sensitive_field_registry` table tracks 15 database fields requiring masking:

```sql
SELECT field_name FROM sensitive_field_registry;
-- Expected: email, phone, national_id, passport_number, salary, etc.
```

Client-side service: `sensitiveFieldService.ts` — provides `maskField()` and `getFieldDisplay()`.

### 4.4 PII Redaction Checklist for New Features

When adding new API endpoints or error handling:

- [ ] Never include PII in error `message` fields
- [ ] Never log PII to console in production builds
- [ ] Never send PII to Sentry (use `beforeSend` hook)
- [ ] Mask sensitive fields in audit log entries
- [ ] Add new sensitive fields to `sensitive_field_registry`
- [ ] Use `company_id` scoping — never expose cross-tenant data in error messages

---

## 5. HTTP Status Code Conventions

| Status | Usage | Retryable? |
|--------|-------|------------|
| 200 | Successful GET/PUT/DELETE | N/A |
| 201 | Successful POST (created) | N/A |
| 204 | Successful DELETE (no body) | N/A |
| 400 | Validation error | No — fix request |
| 401 | Authentication required | Yes — re-authenticate |
| 403 | Authorization denied | No — insufficient permissions |
| 404 | Resource not found | No — resource doesn't exist |
| 409 | Conflict (duplicate, constraint) | No — resolve conflict |
| 429 | Rate limited | Yes — after retry-after |
| 500 | Internal error | Yes — transient |
| 502 | External service error | Yes — transient |
| 503 | Service unavailable | Yes — after backoff |
| 504 | Timeout | Yes — with backoff |

---

## 6. Request/Response Conventions

### 6.1 Pagination

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### 6.2 Date/Time Format

All dates in ISO 8601: `2026-06-22T12:00:00.000Z` (UTC).

### 6.3 Currency

Stored as `integer cents` in database. Displayed with currency code: `THB 25,000.00`.

### 6.4 UUIDs

All entity IDs are UUIDs (v4). `company_id` is the tenant partition key on all tables.

---

*Generated by OpenCode AI — Release 26B.7 API & Error Contracts*
