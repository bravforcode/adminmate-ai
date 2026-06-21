# Release 26E.9 — Performance Budgets, Load Profiles & Capacity

## Scope

Performance testing targets, load profiles, latency percentiles, and capacity planning for production traffic.

## Performance Budgets

| Metric | Target (Desktop) | Target (Mobile 3G) |
|--------|------------------|---------------------|
| First Contentful Paint (FCP) | < 800 ms | < 1,500 ms |
| Largest Contentful Paint (LCP) | < 1,500 ms | < 2,500 ms |
| Cumulative Layout Shift (CLS) | < 0.1 | < 0.1 |
| First Input Delay (FID) | < 50 ms | < 100 ms |
| Time to First Byte (TTFB) | < 200 ms | < 400 ms |
| Total bundle (gzipped) | < 250 KB | < 250 KB |
| JS parse time | < 300 ms | < 800 ms |

## Load Profiles

| Profile | Concurrent Users | Duration | Purpose |
|---------|-----------------|----------|---------|
| Baseline | 10 | 5 min | Smoke test |
| Normal load | 50 | 15 min | Expected production |
| Peak load | 200 | 10 min | Marketing push |
| Stress test | 500 | 5 min | Find breaking point |
| Soak test | 50 | 60 min | Memory leak detection |

## Latency Percentiles

| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|-----------|-----------|-----------|
| Dashboard load | < 200 ms | < 500 ms | < 1,000 ms |
| List queries (jobs, candidates) | < 150 ms | < 400 ms | < 800 ms |
| Search | < 200 ms | < 600 ms | < 1,200 ms |
| Document upload (5 MB) | < 2 s | < 4 s | < 8 s |
| Report generation | < 3 s | < 6 s | < 10 s |
| Auth (login) | < 500 ms | < 1,000 ms | < 2,000 ms |
| Supabase queries | < 100 ms | < 300 ms | < 500 ms |
| Edge functions | < 200 ms | < 500 ms | < 1,000 ms |

## Bundle Analysis

| Chunk | Target Size (gzip) |
|-------|--------------------|
| Main entry | < 100 KB |
| Vendor (React, Supabase) | < 80 KB |
| Router chunk | < 15 KB |
| Each lazy page | < 20 KB |
| Total initial | < 250 KB |

## Database Capacity

| Metric | Threshold |
|--------|-----------|
| Connection pool | < 80% utilization |
| Query cache hit ratio | > 95% |
| Slow query (> 1 s) rate | < 1% |
| Replication lag | < 500 ms |
| Storage growth | < 10 GB/month projected |

## Monitoring

- Vercel Analytics for Core Web Vitals
- Supabase Dashboard for query performance
- Custom `/api/health` endpoint for uptime
- Alerting thresholds: p95 > 2x target, error rate > 1%

## Test Commands

```bash
# Lighthouse audit
npx lighthouse http://localhost:5173 --output html

# Bundle analysis
npx vite-bundle-visualizer

# Load test (if k6 installed)
k6 run tests/load/stress.js
```
