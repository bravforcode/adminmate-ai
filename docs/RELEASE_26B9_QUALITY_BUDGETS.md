# Release 26B.9 — Quality Budgets

**Generated:** 2026-06-22
**Gate:** B
**Tenant Key:** `company_id`

---

## 1. Test Coverage Thresholds

Source: `vitest.config.ts` coverage configuration

| Metric | Threshold | Current Status |
|--------|-----------|----------------|
| **Line coverage** | ≥ 85% | Configured |
| **Function coverage** | ≥ 85% | Configured |
| **Branch coverage** | ≥ 80% | Configured |
| **Statement coverage** | Not enforced | Tracked by v8 provider |

### 1.1 Coverage by Module

| Module | Target | Enforcement |
|--------|--------|-------------|
| `src/utils/` | ≥ 90% | vitest coverage thresholds |
| `src/services/` | ≥ 85% | vitest coverage thresholds |
| `src/stores/` | ≥ 85% | vitest coverage thresholds |
| `src/components/` | ≥ 70% | Target only (component tests harder to reach) |
| `src/hooks/` | ≥ 80% | Target only |
| `src/lib/` | ≥ 85% | vitest coverage thresholds |

### 1.2 Coverage Reporters

| Reporter | Purpose |
|----------|---------|
| `text` | CI terminal output |
| `lcov` | Codecov / coveralls integration |
| `html` | Local browser report at `coverage/index.html` |

### 1.3 Coverage Exclusions

Files excluded from coverage measurement:
- `node_modules/`
- `src/types/` (type definitions only)
- `supabase/` (SQL migrations)
- `**/*.d.ts` (TypeScript declarations)

---

## 2. Flaky Test Rate Limits

### 2.1 Policy

> **No release may call itself green while any security, auth, tenant, payroll, document, billing, or provider-state test is flaky or unowned.**

### 2.2 Flaky Test Budget

| Metric | Budget | Current | Status |
|--------|--------|---------|--------|
| **Max flaky tests (unit/integration)** | 0 for release-critical | 9 pre-existing | ⚠️ Known |
| **Max flaky tests (E2E)** | ≤ 5 | ~3 (auth timeouts) | ⚠️ Monitored |
| **Flaky rate per 100 runs** | ≤ 1% | Unknown | Needs CI tracking |
| **Flaky test ownership** | Each flaky must have issue + owner | Not tracked | Gap |

### 2.3 Known Flaky Tests (Pre-existing)

| Test | Category | Root Cause | Status |
|------|----------|------------|--------|
| REST CRUD timing (26A.5.1) | Integration | Vitest auth flow race | Known, proven via direct HTTP |
| Cross-tenant timing (26A.5.2) | Integration | G5 test timing | Known, proven elsewhere |
| E2E auth retry timeouts | E2E | Supabase session cold start | Intermittent |

### 2.4 Flaky Test Remediation Rules

1. A flaky test must be quarantined (tagged `@flaky`) within 48 hours of identification
2. Root cause must be documented in test comments
3. Fix or delete within 2 sprints — no perpetually-flaky tests
4. CI must report flaky test rate per run — regressions block deploy

---

## 3. Performance Smoke Metrics

### 3.1 Page Load Budget

| Metric | Budget | Measurement |
|--------|--------|-------------|
| **First Contentful Paint (FCP)** | ≤ 1.5s | Lighthouse CI |
| **Largest Contentful Paint (LCP)** | ≤ 2.5s | Lighthouse CI |
| **Cumulative Layout Shift (CLS)** | ≤ 0.1 | Lighthouse CI |
| **Time to Interactive (TTI)** | ≤ 3.0s | Lighthouse CI |
| **Total Blocking Time (TBT)** | ≤ 300ms | Lighthouse CI |

### 3.2 API Response Budget

| Endpoint Category | P50 | P95 | P99 |
|-------------------|-----|-----|-----|
| CRUD operations (Supabase) | ≤ 200ms | ≤ 500ms | ≤ 1000ms |
| AI chat (Gemini) | ≤ 3s | ≤ 8s | ≤ 15s |
| Resume screening | ≤ 5s | ≤ 12s | ≤ 20s |
| File upload (< 5MB) | ≤ 2s | ≤ 5s | ≤ 8s |
| Dashboard aggregate queries | ≤ 300ms | ≤ 800ms | ≤ 1500ms |

### 3.3 Edge Function Budget

| Metric | Budget |
|--------|--------|
| Cold start | ≤ 500ms |
| Warm invocation | ≤ 100ms overhead |
| Timeout limit | 30s (Supabase default) |
| Max concurrent | Platform-managed |

### 3.4 Database Performance

| Metric | Budget |
|--------|--------|
| Connection pool utilization | ≤ 80% |
| Slow query threshold | > 1s = logged |
| Index hit rate | ≥ 95% |
| Table bloat | ≤ 20% |

---

## 4. Bundle Size Budgets

### 4.1 Overall Bundle

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| **Total JS (gzipped)** | ≤ 250KB | Build warning |
| **Total CSS (gzipped)** | ≤ 50KB | Build warning |
| **Initial chunk (main)** | ≤ 150KB gzipped | Hard gate |
| **Vendor chunk** | ≤ 100KB gzipped | Soft target |

### 4.2 Per-Route Chunk Budget

| Route | Max Size (gzipped) | Notes |
|-------|-------------------|-------|
| `/dashboard` | ≤ 60KB | Heavy chart library usage |
| `/recruitment/*` | ≤ 40KB | Pipeline + candidate components |
| `/chat/*` | ≤ 30KB | Messaging + realtime |
| `/settings/*` | ≤ 25KB | Forms + config |
| `/onboarding/*` | ≤ 35KB | Checklist + document components |
| `/auth/*` | ≤ 15KB | Login, register, forgot password |

### 4.3 Largest Dependencies (gzipped estimates)

| Package | Est. Gzipped | Route Impact |
|---------|-------------|--------------|
| react + react-dom | ~45KB | All routes (shared) |
| recharts | ~35KB | Dashboard only |
| @react-pdf/renderer | ~40KB | Reports only (lazy) |
| @radix-ui/* (all) | ~25KB | All routes (shared) |
| framer-motion | ~15KB | Animation routes |
| zustand | ~3KB | All routes (shared) |
| react-router-dom | ~15KB | All routes (shared) |
| tailwindcss (output) | ~10KB | All routes |

### 4.4 Bundle Analysis Commands

```bash
# Build with size reporting
npm run build

# Analyze bundle composition
npx vite-bundle-visualizer

# Check specific chunk sizes
ls -la dist/assets/*.js | sort -k5 -n -r
```

---

## 5. Quality Gate Checklist

### 5.1 Pre-Release Requirements

| Check | Requirement | Status |
|-------|-------------|--------|
| `npm run type-check` | Zero errors | Required |
| `npm run lint` | Zero errors | Required |
| `npm test -- --run` | All pass, ≤ 5 flaky | Required |
| `npm run build` | Success, within budgets | Required |
| `npm audit` | No critical runtime vulns | Required |
| Coverage thresholds | All met | Required |
| E2E critical paths | All pass | Required |

### 5.2 Regression Detection

| Tool | Purpose | Frequency |
|------|---------|-----------|
| Vitest | Unit/integration regression | Every commit |
| Playwright | E2E regression | Every PR |
| Lighthouse CI | Performance regression | Weekly |
| Bundle analyzer | Size regression | Every release |
| npm audit | Supply chain regression | Weekly |

---

## 6. Monitoring & Alerting

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| Error rate (Sentry) | > 1% of sessions | Investigate immediately |
| P95 response time | > 2x budget | Performance review |
| Bundle size | > 10% increase | Review new dependencies |
| Test pass rate | < 95% | Block deploy |
| Flaky rate | > 2% | Quarantine + fix |

---

*Generated by OpenCode AI — Release 26B.9 Quality Budgets*
