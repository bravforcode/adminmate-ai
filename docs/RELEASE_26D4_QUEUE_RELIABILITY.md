# Release 26D.4 — Queue Reliability

**Gate:** D — Observability, Recovery, and Operational Readiness
**Date:** 2024-06-20
**Owner:** Platform Engineering

## Overview

Ensure reliable message processing with idempotency, retry/backoff strategies, dead-letter queues, and tenant-safe operations to prevent data loss and duplicate processing.

## Objectives

- Messages processed exactly once (idempotency)
- Transient failures handled with exponential backoff
- Permanently failed messages routed to dead-letter queue
- Tenant isolation maintained in queue operations
- Queue health monitored and alerted

## Idempotency

### Key Generation

```typescript
// Idempotency key = operation + tenant + resource + timestamp window
function generateIdempotencyKey(operation: string, companyId: string, resourceId: string): string {
  const timestamp = Math.floor(Date.now() / (60 * 60 * 1000)); // 1-hour window
  return `${operation}:${companyId}:${resourceId}:${timestamp}`;
}
```

### Idempotency Table

```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  operation TEXT NOT NULL,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX idx_idempotency_key ON idempotency_keys(idempotency_key);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

### Processing Flow

```
1. Receive message
2. Generate idempotency_key
3. Check idempotency_keys table
   - EXISTS + completed → Return cached result (skip)
   - EXISTS + pending → Another worker processing (skip)
   - EXISTS + failed → Retry allowed
   - NOT EXISTS → Insert key, set status=pending
4. Process message
5. Update idempotency_keys: set status=completed, result=...
```

## Retry and Backoff

### Backoff Configuration

```typescript
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000,      // 1 second
  maxDelay: 60000,         // 60 seconds
  backoffMultiplier: 2,    // Exponential
  jitter: true,            // Prevent thundering herd
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'rate_limited',
    'service_unavailable',
  ],
};
```

### Backoff Formula

```
delay = min(initialDelay * (2 ^ attempt), maxDelay)
actual_delay = jitter ? delay * (0.5 + Math.random() * 0.5) : delay
```

### Retry Strategy

```typescript
async function processWithRetry(message: QueueMessage): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      await processMessage(message);
      return; // Success
    } catch (error) {
      if (!isRetryable(error) || attempt === RETRY_CONFIG.maxRetries) {
        await sendToDeadLetter(message, error);
        return;
      }

      const delay = calculateBackoff(attempt);
      await scheduleRetry(message, delay);
    }
  }
}
```

## Dead-Letter Queue

### Configuration

```typescript
const DEAD_LETTER_CONFIG = {
  maxRetries: 5,
  retentionDays: 30,
  alertThreshold: 10,       // Alert when DLQ > 10 messages
  batchSize: 10,            // Process 10 at a time
  processingInterval: 60000, // Every 60 seconds
};
```

### Dead-Letter Table

```sql
CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  queue_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reprocessed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dlq_company ON dead_letter_queue(company_id);
CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_created ON dead_letter_queue(created_at);
```

### DLQ Management

```sql
-- Archive old DLQ messages
UPDATE dead_letter_queue
SET status = 'archived'
WHERE status = 'pending'
  AND created_at < now() - INTERVAL '30 days';

-- Reprocess specific message
UPDATE dead_letter_queue
SET status = 'pending', retry_count = 0
WHERE id = $1 AND status = 'archived';
```

## Tenant Safety

### Isolation Rules

1. **Queue Partitioning**: Messages tagged with `company_id`
2. **Rate Limits**: Per-tenant rate limiting on queue consumption
3. **Resource Caps**: Max concurrent jobs per tenant
4. **Error Isolation**: Tenant errors don't affect other tenants

### Implementation

```typescript
interface QueueMessage {
  id: string;
  company_id: string;
  payload: unknown;
  priority: 'low' | 'normal' | 'high' | 'critical';
  created_at: Date;
  correlation_id: string;
}

// Tenant-aware worker
async function processTenantMessage(message: QueueMessage): Promise<void> {
  // Set tenant context for RLS
  await db.query('SET app.current_company_id = $1', [message.company_id]);

  // Check tenant quota
  const quota = await getTenantQueueQuota(message.company_id);
  if (quota.current >= quota.max) {
    throw new TenantQuotaExceeded(message.company_id);
  }

  // Process with tenant context
  await processMessage(message);
}
```

## Queue Monitoring

### Health Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Queue Depth | Messages waiting | > 1000 |
| Processing Rate | Messages/second | < 10/sec |
| Error Rate | Failed/total | > 5% |
| DLQ Depth | Dead-letter count | > 10 |
| Latency P99 | 99th percentile processing time | > 30s |

### Dashboard

```
Grafana Dashboard: AdminMate Queue Health
├── Queue Depth (per tenant)
├── Processing Rate (per queue)
├── Error Rate (by error type)
├── DLQ Growth Rate
├── Retry Distribution
└── Worker Health
```

## Acceptance Criteria

- [ ] Idempotency keys prevent duplicate processing
- [ ] Exponential backoff with jitter implemented
- [ ] Dead-letter queue captures all failed messages
- [ ] Tenant isolation enforced at queue level
- [ ] DLQ alert triggers when threshold exceeded
- [ ] Queue depth monitored and graphed
- [ ] Retry logic tested with transient failures
- [ ] Tenant quota enforcement verified
