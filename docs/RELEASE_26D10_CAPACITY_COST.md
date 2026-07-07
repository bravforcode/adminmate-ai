# Release 26D.10 — Capacity & Cost Management

**Gate:** D — Observability, Recovery, and Operational Readiness
**Date:** 2024-06-20
**Owner:** Platform Engineering & FinOps

## Overview

Implement usage tracking, quota controls, and cost monitoring to ensure sustainable growth and prevent unexpected expenses.

## Objectives

- Real-time usage tracking across all resources
- Per-tenant quotas enforced automatically
- Cost attribution to teams and features
- Alert thresholds for capacity and budget
- Capacity planning based on usage trends

## Usage Tracking

### Usage Metrics Table

```sql
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_company ON usage_metrics(company_id);
CREATE INDEX idx_usage_metric ON usage_metrics(metric_name);
CREATE INDEX idx_usage_period ON usage_metrics(period_start, period_end);
```

### Tracked Metrics

| Category | Metric | Unit | Collection |
|----------|--------|------|------------|
| API | Requests | count | Per endpoint |
| API | Response Time | ms | P50, P95, P99 |
| Storage | Files | count | Per tenant |
| Storage | Size | bytes | Per tenant |
| Database | Queries | count | Per tenant |
| Database | Rows Read | rows | Per query |
| Compute | CPU Time | seconds | Per request |
| Compute | Memory | MB | Peak per request |
| External | API Calls | count | Per provider |
| Users | Active Users | count | Per tenant |

### Usage Collection

```typescript
// src/lib/metrics.ts

interface UsageEvent {
  company_id: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

async function recordUsage(event: UsageEvent): Promise<void> {
  await db.query(`
    INSERT INTO usage_metrics (company_id, metric_name, metric_value, unit, period_start, period_end)
    VALUES ($1, $2, $3, $4, $5, $5)
  `, [
    event.company_id,
    event.metric_name,
    event.metric_value,
    event.unit,
    event.timestamp,
  ]);

  // Check quotas
  await checkQuotas(event.company_id, event.metric_name);
}
```

## Quota Controls

### Quota Table

```sql
CREATE TABLE tenant_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  metric_name TEXT NOT NULL,
  quota_limit NUMERIC NOT NULL,
  quota_period TEXT NOT NULL CHECK (quota_period IN ('hourly', 'daily', 'monthly')),
  enforcement TEXT NOT NULL DEFAULT 'soft' CHECK (enforcement IN ('soft', 'hard')),
  alert_threshold NUMERIC DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, metric_name)
);
```

### Default Quotas

| Metric | Free Tier | Pro Tier | Enterprise |
|--------|-----------|----------|------------|
| API Requests | 1,000/day | 100,000/day | Unlimited |
| Storage | 1 GB | 100 GB | 1 TB |
| Database Rows | 10,000 | 1,000,000 | Unlimited |
| Active Users | 5 | 50 | Unlimited |
| API Rate Limit | 10/min | 100/min | 1,000/min |

### Quota Enforcement

```typescript
async function checkQuotas(companyId: string, metricName: string): Promise<void> {
  const quota = await getQuota(companyId, metricName);
  if (!quota) return;

  const usage = await getCurrentUsage(companyId, metricName, quota.quota_period);

  // Alert threshold
  if (usage >= quota.quota_limit * quota.alert_threshold) {
    await sendQuotaAlert(companyId, metricName, usage, quota.quota_limit);
  }

  // Hard limit enforcement
  if (quota.enforcement === 'hard' && usage >= quota.quota_limit) {
    throw new QuotaExceededError(metricName, quota.quota_limit);
  }
}
```

## Cost Attribution

### Cost Tracking Table

```sql
CREATE TABLE cost_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  service TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  cost_usd NUMERIC NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_company ON cost_attribution(company_id);
CREATE INDEX idx_cost_service ON cost_attribution(service);
CREATE INDEX idx_cost_period ON cost_attribution(period_start, period_end);
```

### Cost Categories

| Category | Services | Attribution |
|----------|----------|-------------|
| Compute | API, Workers | Per request |
| Storage | S3, Database | Per GB |
| External | Stripe, Email | Per transaction |
| Infrastructure | Vercel, Supabase | Per tenant |
| Support | Intercom, Slack | Per ticket |

### Cost Per Tenant

```sql
-- Monthly cost per tenant
SELECT
  company_id,
  SUM(cost_usd) as total_cost,
  SUM(CASE WHEN service = 'compute' THEN cost_usd ELSE 0 END) as compute_cost,
  SUM(CASE WHEN service = 'storage' THEN cost_usd ELSE 0 END) as storage_cost,
  SUM(CASE WHEN service = 'external' THEN cost_usd ELSE 0 END) as external_cost
FROM cost_attribution
WHERE period_start >= date_trunc('month', now())
GROUP BY company_id;
```

## Alert Thresholds

### Capacity Alerts

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API Requests | 80% quota | 95% quota | Notify admin |
| Storage | 75% quota | 90% quota | Notify admin |
| Database | 70% quota | 85% quota | Notify admin |
| Rate Limit | 70% limit | 90% limit | Throttle requests |

### Cost Alerts

| Threshold | Action |
|-----------|--------|
| $100/day | Slack notification |
| $500/day | Email to finance |
| $1000/day | PagerDuty alert |
| Budget 80% | Executive notification |

### Alert Configuration

```yaml
# alerts.yml
capacity:
  - metric: api_requests
    warning: 0.80
    critical: 0.95
    channel: slack://alerts-capacity

  - metric: storage_bytes
    warning: 0.75
    critical: 0.90
    channel: slack://alerts-capacity

cost:
  - threshold: 100
    period: daily
    channel: slack://alerts-cost

  - threshold: 500
    period: daily
    channel: email://finance@company.com

  - threshold: 1000
    period: daily
    channel: pagerduty://platform
```

## Capacity Planning

### Trend Analysis

```sql
-- Monthly growth rate
WITH monthly_usage AS (
  SELECT
    metric_name,
    date_trunc('month', period_start) as month,
    SUM(metric_value) as total
  FROM usage_metrics
  WHERE period_start >= now() - INTERVAL '6 months'
  GROUP BY metric_name, month
)
SELECT
  metric_name,
  month,
  total,
  LAG(total) OVER (PARTITION BY metric_name ORDER BY month) as prev_month,
  ROUND(
    (total - LAG(total) OVER (PARTITION BY metric_name ORDER by month)) /
    NULLIF(LAG(total) OVER (PARTITION BY metric_name ORDER BY month), 0) * 100,
    2
  ) as growth_pct
FROM monthly_usage
ORDER BY metric_name, month;
```

### Capacity Forecast

```python
# Simple linear regression for capacity forecasting
import numpy as np

def forecast_capacity(usage_history: list[float], months: int = 3) -> list[float]:
    """Forecast future capacity needs based on historical usage."""
    x = np.arange(len(usage_history))
    y = np.array(usage_history)

    # Linear fit
    coefficients = np.polyfit(x, y, 1)
    polynomial = np.poly1d(coefficients)

    # Forecast
    future_x = np.arange(len(usage_history), len(usage_history) + months)
    return polynomial(future_x).tolist()
```

## Dashboard

### Cost & Capacity Dashboard

```
Grafana Dashboard: Capacity & Cost
├── Usage Trends (per metric)
├── Quota Utilization (per tenant)
├── Cost Attribution (by service)
├── Growth Rate (month-over-month)
├── Forecast (next 3 months)
└── Alert History
```

## Acceptance Criteria

- [ ] Usage metrics collected for all resources
- [ ] Per-tenant quotas configured
- [ ] Cost attribution implemented
- [ ] Alert thresholds configured
- [ ] Capacity forecasting working
- [ ] Dashboard deployed
- [ ] FinOps review process established
