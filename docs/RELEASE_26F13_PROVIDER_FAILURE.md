# Release 26F.13 — Provider Failure and Kill-Switch

**Generated:** 2026-06-22
**Gate:** F — Provider and Integration Verification
**Tenant Key:** `company_id`

---

## 1. Provider Failure Handling

### Failure Categories

| Category | Examples | Impact |
|----------|----------|--------|
| Transient | Network timeout, rate limit, 5xx | Retry may succeed |
| Permanent | Invalid credentials, account suspended | Retry will not help |
| Degraded | Slow response, partial failure | Service available but degraded |
| Unavailable | Provider outage, DNS failure | Service completely down |

### Adapter-Level Error Handling

All adapters return structured errors:

```typescript
{
  success: false,
  provider: string,
  status: 'failed',
  errorMessage: string  // Human-readable error description
}
```

### Error Handling Flow

```
1. Adapter.send() called
2. Provider API call made
3. On success → return success result
4. On transient error → retry with exponential backoff
5. On permanent error → log and return failure
6. On timeout → mark as failed, schedule retry
7. All failures logged to integration_event_logs
```

---

## 2. Kill-Switch Mechanism

### Feature Flag Kill-Switch

Defined in `feature_flags_enhanced.sql` migration:

```sql
-- Kill switch evaluation order (highest priority first):
-- 1. kill_switch flags (can disable ANY feature globally)
-- 2. plan flags
-- 3. country flags
-- 4. tenant flags
-- 5. beta flags
-- 6. global flags
```

### Kill-Switch Types

| Type | Scope | Use Case |
|------|-------|----------|
| `provider_kill_switch` | Per-provider | Disable specific provider |
| `feature_kill_switch` | Per-feature | Disable specific feature |
| `global_kill_switch` | Platform-wide | Emergency shutdown |

### Kill-Switch Activation

```sql
-- Activate kill switch for a provider
SELECT activate_kill_switch(
  p_feature_key := 'email_messaging',
  p_reason := 'Provider outage detected',
  p_activated_by := 'user-uuid'
);
```

### Provider-Level Kill-Switch

| Provider | Kill-Switch Key | Default |
|----------|----------------|---------|
| Email | `killswitch:email` | OFF |
| LINE | `killswitch:line` | OFF |
| WhatsApp | `killswitch:whatsapp` | OFF |
| SMS | `killswitch:sms` | OFF |
| Facebook | `killswitch:facebook` | OFF |
| Stripe | `killswitch:stripe` | OFF |
| SSO | `killswitch:sso` | OFF |
| SCIM | `killswitch:scim` | OFF |

---

## 3. Circuit Breaker Pattern (Planned)

### States

| State | Description | Behavior |
|-------|-------------|----------|
| `closed` | Normal operation | Requests pass through |
| `open` | Failure threshold exceeded | All requests blocked |
| `half_open` | Testing recovery | Limited requests allowed |

### Thresholds

| Metric | Threshold | Window |
|--------|-----------|--------|
| Failure count | 5 consecutive failures | 5 minutes |
| Open duration | 30 seconds | — |
| Half-open probes | 3 requests | — |

### Circuit Breaker Flow

```
1. Request arrives
2. Check circuit state
3. If CLOSED → execute request
   - Success → reset failure count
   - Failure → increment count, if ≥ threshold → OPEN
4. If OPEN → reject immediately
   - After open_duration → HALF_OPEN
5. If HALF_OPEN → allow probe requests
   - Success → CLOSED
   - Failure → OPEN
```

---

## 4. Fallback Strategy

### Channel Fallback

| Primary | Fallback | Condition |
|---------|----------|-----------|
| Email | In-App | Email provider failed |
| LINE | In-App | LINE provider failed |
| WhatsApp | SMS | WhatsApp provider failed |
| SMS | In-App | SMS provider failed |
| Facebook | In-App | Facebook provider failed |

### Fallback Flow

```
1. Primary channel attempted
2. If failed → check fallback configuration
3. Fallback channel attempted
4. If fallback also failed → queue for manual retry
5. Log both attempts in audit trail
6. Notify admin of multi-channel failure
```

---

## 5. Monitoring & Alerting

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health/providers` | All provider status |
| `/health/stripe` | Stripe API connectivity |
| `/health/sso` | SSO provider status |

### Alert Conditions

| Condition | Severity | Action |
|-----------|----------|--------|
| Provider error rate > 10% | Warning | Email admin |
| Provider error rate > 50% | Critical | Activate kill-switch |
| Provider response time > 5s | Warning | Monitor |
| Provider response time > 30s | Critical | Activate kill-switch |
| Kill-switch activated | Critical | Page on-call |
| Webhook delivery failure > 50% | Warning | Email admin |

### Metrics to Track

| Metric | Source |
|--------|--------|
| Provider success rate | `integration_event_logs` |
| Provider response time | `integration_event_logs` |
| Webhook delivery rate | `webhook_delivery_attempts` |
| Message queue depth | `message_queue` |
| Kill-switch activation count | `feature_flag_evaluation_log` |

---

## 6. Sandbox Verification Checklist

### Error Handling

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | Adapter timeout (10s) | Returns `failed` with error message | ⬜ Pending |
| 2 | Adapter 5xx error | Returns `failed`, logged | ⬜ Pending |
| 3 | Adapter 4xx error | Returns `failed`, no retry | ⬜ Pending |
| 4 | Adapter network error | Returns `failed`, logged | ⬜ Pending |
| 5 | Invalid credentials | Returns `failed`, permanent | ⬜ Pending |

### Kill-Switch

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | Activate provider kill-switch | Provider disabled immediately | ⬜ Pending |
| 2 | Send message on killed provider | Returns `provider_not_configured` | ⬜ Pending |
| 3 | Deactivate kill-switch | Provider re-enabled | ⬜ Pending |
| 4 | Global kill-switch | All providers disabled | ⬜ Pending |
| 5 | Kill-switch audit log | Activation logged | ⬜ Pending |

### Circuit Breaker (Planned)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1 | 5 consecutive failures | Circuit opens | ⬜ Planned |
| 2 | Request while circuit open | Rejected immediately | ⬜ Planned |
| 3 | After 30s timeout | Circuit half-opens | ⬜ Planned |
| 4 | Successful probe | Circuit closes | ⬜ Planned |

---

## 7. Gaps & Next Steps

| Gap | Severity | Action Required |
|-----|----------|----------------|
| No circuit breaker implementation | P1 | Add circuit breaker to adapters |
| No automated kill-switch triggers | P1 | Monitor error rates, auto-activate |
| No fallback channel routing | P1 | Implement channel fallback chain |
| No health check endpoints | P2 | Add `/health/*` routes |
| No alerting integration | P2 | Connect to Sentry/PagerDuty |
| No provider status dashboard | P3 | Real-time provider health view |
