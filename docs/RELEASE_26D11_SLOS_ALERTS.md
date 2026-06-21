# Release 26D.11 — SLOs & Alerts

**Gate:** D — Observability, Recovery, and Operational Readiness
**Date:** 2024-06-20
**Owner:** SRE & Platform Engineering

## Overview

Define Service Level Indicators (SLIs), Service Level Objectives (SLOs), alert routing, and status dashboard to ensure reliable service delivery and proactive incident detection.

## Objectives

- SLIs defined for all critical user journeys
- SLOs established with clear error budgets
- Alert routing ensures proper response
- Status dashboard provides real-time visibility
- SLO compliance tracked over time

## SLI Definitions

### Availability SLI

```typescript
// Successful requests / Total requests
const availabilitySLI = {
  metric: 'http_requests_total',
  filter: {
    status: { not_in: ['5xx'] },
  },
  labelMatchers: [
    { name: 'service', value: 'adminmate-api' },
  ],
};
```

### Latency SLI

```typescript
// Requests faster than threshold / Total requests
const latencySLI = {
  metric: 'http_request_duration_seconds',
  filter: {
    le: '0.5',  // 500ms threshold
  },
  labelMatchers: [
    { name: 'service', value: 'adminmate-api' },
  ],
};
```

### Error Rate SLI

```typescript
// Error requests / Total requests
const errorRateSLI = {
  metric: 'http_requests_total',
  filter: {
    status: { regex: '5..' },  // 5xx errors
  },
  labelMatchers: [
    { name: 'service', value: 'adminmate-api' },
  ],
};
```

### SLI Summary

| SLI | Metric | Threshold | Description |
|-----|--------|-----------|-------------|
| Availability | Success rate | ≥ 99.9% | Non-5xx responses |
| Latency (P50) | Response time | ≤ 200ms | Median response time |
| Latency (P99) | Response time | ≤ 500ms | 99th percentile |
| Error Rate | 5xx ratio | ≤ 0.1% | Server errors |
| Throughput | Requests/sec | ≥ 100 | Minimum capacity |

## SLO Definitions

### SLO Configuration

```yaml
# slos.yml
slos:
  - name: api_availability
    description: API availability for all endpoints
    sli: http_requests_total{status!~"5.."}
    target: 99.9%
    window: 30 days
    error_budget: 43.2 minutes/month

  - name: api_latency
    description: API response time
    sli: http_request_duration_seconds{le="0.5"}
    target: 99.5%
    window: 30 days
    error_budget: 3.6 hours/month

  - name: invoice_processing
    description: Invoice processing success rate
    sli: invoice_processing_total{status="success"}
    target: 99.95%
    window: 30 days
    error_budget: 21.6 minutes/month

  - name: payment_processing
    description: Payment processing success rate
    sli: payment_processing_total{status="success"}
    target: 99.99%
    window: 30 days
    error_budget: 4.3 minutes/month
```

### Error Budget

```typescript
interface ErrorBudget {
  slo_name: string;
  target: number;           // 0.999 = 99.9%
  window_days: number;      // 30
  total_minutes: number;    // 43200 (30 days)
  allowed_downtime: number; // 43.2 minutes
  consumed: number;         // Minutes consumed
  remaining: number;        // Minutes remaining
  burn_rate: number;        // Current burn rate
}

function calculateErrorBudget(slo: SLO, currentAvailability: number): ErrorBudget {
  const totalMinutes = slo.window_days * 24 * 60;
  const allowedDowntime = totalMinutes * (1 - slo.target);
  const consumed = totalMinutes * (1 - currentAvailability);
  const remaining = allowedDowntime - consumed;
  const burnRate = consumed / (totalMinutes * (1 - currentAvailability));

  return {
    slo_name: slo.name,
    target: slo.target,
    window_days: slo.window_days,
    total_minutes: totalMinutes,
    allowed_downtime: allowedDowntime,
    consumed,
    remaining,
    burn_rate: burnRate,
  };
}
```

### Error Budget Policy

| Budget Remaining | Action |
|------------------|--------|
| > 50% | Normal operations, feature development |
| 25-50% | Caution, increased testing |
| 10-25% | Risk management, no risky deploys |
| < 10% | Freeze non-critical changes |
| 0% | All hands on reliability |

## Alert Routing

### Alert Levels

| Level | Trigger | Response | Channel |
|-------|---------|----------|---------|
| Critical | SLO burn rate > 10x | Immediate | PagerDuty |
| Warning | SLO burn rate > 2x | 1 hour | Slack |
| Info | SLO burn rate > 1x | 4 hours | Slack |
| Ticket | SLO trend negative | Next sprint | JIRA |

### Alert Configuration

```yaml
# alerts.yml
alerts:
  - name: slo_burn_rate_critical
    expr: slo:burn_rate:30d{job="adminmate-api"} > 10
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "SLO burn rate critical for {{ $labels.slo }}"
      description: "Burn rate {{ $value }}x exceeds threshold"
    routes:
      - channel: pagerduty://platform
        repeat: 15m

  - name: slo_burn_rate_warning
    expr: slo:burn_rate:30d{job="adminmate-api"} > 2
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "SLO burn rate elevated for {{ $labels.slo }}"
    routes:
      - channel: slack://alerts-slo
        repeat: 1h

  - name: error_budget_low
    expr: slo:error_budget:remaining{job="adminmate-api"} < 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Error budget nearly exhausted for {{ $labels.slo }}"
    routes:
      - channel: pagerduty://platform
        repeat: 30m
```

### Alert Routing Rules

```yaml
# routing.yml
routing:
  rules:
    - match:
        severity: critical
      routes:
        - channel: pagerduty://platform
        - channel: slack://incidents
        - email: oncall@company.com

    - match:
        severity: warning
      routes:
        - channel: slack://alerts-warning
        - email: tech-leads@company.com

    - match:
        severity: info
      routes:
        - channel: slack://alerts-info
```

## Status Dashboard

### Dashboard Components

```
Status Dashboard
├── Current Status (per service)
│   ├── API: Operational / Degraded / Outage
│   ├── Database: Operational / Degraded / Outage
│   ├── File Storage: Operational / Degraded / Outage
│   └── External: Operational / Degraded / Outage
├── SLO Compliance (30-day)
│   ├── Availability: 99.95% (target: 99.9%)
│   ├── Latency P99: 450ms (target: 500ms)
│   └── Error Rate: 0.05% (target: 0.1%)
├── Error Budget
│   ├── Remaining: 68%
│   ├── Burn Rate: 0.8x
│   └── Trend: Stable
├── Recent Incidents
│   └── [List of recent incidents]
└── Maintenance Windows
    └── [Scheduled maintenance]
```

### Status Page Configuration

```yaml
# statuspage.yml
page:
  name: AdminMate Status
  url: status.adminmate.ai

components:
  - name: API
    group: Core Services
    status: operational

  - name: Dashboard
    group: Core Services
    status: operational

  - name: Database
    group: Infrastructure
    status: operational

  - name: File Storage
    group: Infrastructure
    status: operational

  - name: Email Service
    group: External
    status: operational

  - name: Payment Processing
    group: External
    status: operational

incidents:
  auto_create: true
  auto_resolve: true
  notify_subscribers: true

subscribers:
  - email
  - webhook
  - slack
```

### Dashboard Queries

```promql
# Availability SLO
1 - (
  sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
  /
  sum(rate(http_requests_total[5m])) by (service)
)

# Latency SLO
sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m])) by (service)
/
sum(rate(http_request_duration_seconds_count[5m])) by (service)

# Error Budget Remaining
(slo:error_budget:total{window="30d"} - slo:error_budget:consumed{window="30d"})
/ slo:error_budget:total{window="30d"}
```

## Acceptance Criteria

- [ ] SLIs defined for all critical paths
- [ ] SLOs established with error budgets
- [ ] Alert routing configured and tested
- [ ] Status dashboard deployed
- [ ] Error budget policy documented
- [ ] SLO compliance tracked historically
- [ ] On-call team trained on alert response
