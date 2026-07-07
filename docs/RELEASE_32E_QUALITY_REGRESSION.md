# Release 32E — Quality Regression Shield

**Gate:** L — Lifecycle Governance & Operational Maturity
**Date:** 2026-06-22
**Owner:** QA & Platform Engineering
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Build an automated regression detection system that catches quality degradation across test suites, performance benchmarks, bundle size, and accessibility scores — preventing slow regressions that individual PRs don't trigger but accumulate over time.

---

## Scope

### In Scope

1. **Quality baseline registry** — Capture current test pass rates, performance metrics, bundle sizes, and accessibility scores as regression baselines.
2. **Regression detection engine** — Automated comparison of current vs. baseline metrics with configurable tolerance thresholds.
3. **Trend tracking** — Historical metric storage enabling trend analysis and early warning.
4. **PR gate integration** — CI pipeline checks that fail when metrics regress beyond threshold.
5. **Regression dashboard** — Visual overview of all quality dimensions with trend charts and alert indicators.
6. **Automated regression reports** — Weekly digest of quality trends with highlighted regressions.

### Out of Scope

- Test authoring (covered by Gate E / Release 26E series).
- Performance optimization (covered by Gate E / Release 26E.9).
- Accessibility remediation (covered by Gate E / Release 26E.7).

---

## Required Work Items

| # | Work Item | Priority | Evidence Target |
|---|-----------|----------|-----------------|
| 1 | Create `quality_baselines` table (metric_name, baseline_value, tolerance_percent, last_measured_at, category) | P0 | Migration SQL |
| 2 | Create `quality_measurements` table (measurement_id, metric_name, measured_value, delta_percent, regression_detected, measured_at) | P0 | Migration SQL |
| 3 | Create `quality_regression_alerts` table (alert_id, metric_name, severity, details, acknowledged, created_at) | P0 | Migration SQL |
| 4 | Build `qualityRegressionService.ts` — baseline CRUD, measurement recording, regression detection, alert management | P0 | Unit tests |
| 5 | Build `QualityDashboardPage.tsx` — All quality dimensions, trend charts, alert list | P0 | Component |
| 6 | Create `quality-measure` script (`scripts/quality-measure.sh`) — collects all metrics in one run | P0 | Script |
| 7 | Create `quality-check` CI step — compares current metrics against baselines, fails on regression | P0 | CI config |
| 8 | Create `quality-report` Edge Function — weekly digest generation | P1 | Edge function |
| 9 | Seed baselines from current test/performance/bundle/a11y runs | P0 | Seed script |
| 10 | Write unit tests for regression detection logic | P0 | Test file |
| 11 | Write component tests for dashboard | P1 | Test file |
| 12 | Update docs: `phase-ledger.md`, `testing.md`, `security-baseline.md` | P1 | Docs |

---

## Quality Dimensions

### Dimension 1: Test Suite Health

| Metric | Baseline Source | Tolerance |
|--------|----------------|-----------|
| Test pass rate | `npm test -- --run` | 0% regression |
| Test count | Total test files × avg tests/file | -5% |
| Flaky test count | Tests failing intermittently | 0 new flaky |
| Coverage (statements) | Vitest coverage report | -2% |

### Dimension 2: Build Health

| Metric | Baseline Source | Tolerance |
|--------|----------------|-----------|
| TypeScript errors | `npx tsc --noEmit` | 0 errors |
| Lint errors | `npm run lint` | 0 new errors |
| Build success | `npm run build` | Must pass |
| Build time | Time from `npm run build` | +20% |

### Dimension 3: Performance

| Metric | Baseline Source | Tolerance |
|--------|----------------|-----------|
| Bundle size (total) | Vite build output | +10% |
| Bundle size (JS) | JS chunks only | +10% |
| Bundle size (CSS) | CSS chunks only | +15% |
| Largest contentful paint | Lighthouse / Web Vitals | +10% |
| First input delay | Lighthouse / Web Vitals | +10% |

### Dimension 4: Accessibility

| Metric | Baseline Source | Tolerance |
|--------|----------------|-----------|
| WCAG 2.1 AA violations | axe-core scan | 0 new violations |
| WCAG 2.1 A violations | axe-core scan | 0 new violations |
| Color contrast failures | axe-core scan | 0 new failures |

### Dimension 5: Security

| Metric | Baseline Source | Tolerance |
|--------|----------------|-----------|
| Critical CVEs | `npm audit` | 0 critical |
| High CVEs | `npm audit` | +0 high |
| RLS policy count | `pg_policies` query | -0 (no policies removed) |

---

## Database Schema

```sql
-- Quality baselines (one row per metric)
CREATE TABLE quality_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL CHECK (metric_category IN (
    'test', 'build', 'performance', 'accessibility', 'security'
  )),
  baseline_value NUMERIC NOT NULL,
  tolerance_percent NUMERIC(5,2) DEFAULT 0,
  unit TEXT,
  measurement_command TEXT,
  last_measured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, metric_name)
);

-- Historical measurements
CREATE TABLE quality_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  measured_value NUMERIC NOT NULL,
  baseline_value NUMERIC NOT NULL,
  delta_percent NUMERIC(7,2),
  regression_detected BOOLEAN DEFAULT FALSE,
  git_commit TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regression alerts
CREATE TABLE quality_regression_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  details JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
ALTER TABLE quality_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_baselines" ON quality_baselines
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE quality_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_measurements" ON quality_measurements
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE quality_regression_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_qa_alerts" ON quality_regression_alerts
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);
```

---

## CI Pipeline Integration

```yaml
# .github/workflows/quality-gate.yml (or equivalent)
quality-regression-check:
  steps:
    - name: Install dependencies
      run: npm ci
    - name: Run type check
      run: npx tsc --noEmit
    - name: Run lint
      run: npm run lint
    - name: Run tests
      run: npm test -- --run
    - name: Build
      run: npm run build
    - name: Measure quality metrics
      run: bash scripts/quality-measure.sh
    - name: Check regression baselines
      run: node scripts/quality-check.mjs
```

---

## Regression Detection Logic

```typescript
function detectRegression(
  metric: string,
  currentValue: number,
  baseline: number,
  tolerancePercent: number
): { regression: boolean; severity: string; delta: number } {
  const delta = ((currentValue - baseline) / baseline) * 100;

  // For "lower is better" metrics (test failures, bundle size, etc.)
  if (delta > tolerancePercent) {
    const severity = delta > tolerancePercent * 3 ? 'critical'
      : delta > tolerancePercent * 2 ? 'high'
      : delta > tolerancePercent * 1.5 ? 'medium'
      : 'low';
    return { regression: true, severity, delta };
  }

  return { regression: false, severity: 'none', delta };
}
```

---

## UI: Quality Regression Dashboard

### Page Layout

| Section | Content |
|---------|---------|
| Quality Score | Overall health score (0-100) based on all dimensions |
| Dimension Cards | 5 cards (Test, Build, Perf, A11y, Security) with status indicators |
| Trend Charts | Per-metric line charts showing 30-day history |
| Regression Alerts | Active regressions with severity, metric, delta, acknowledge action |
| Baseline Management | Table of all baselines with edit capability |
| Historical Reports | Weekly digests archived for review |

---

## Tests

| Test | Type | Scope |
|------|------|-------|
| `qualityRegressionService.test.ts` | Unit | Baseline CRUD, measurement recording, alert lifecycle |
| `regressionDetection.test.ts` | Unit | Detection logic, tolerance boundaries, severity classification |
| `qualityDashboardPage.test.tsx` | Component | Dashboard, cards, charts, empty/error states |
| `qualityMeasureScript.test.ts` | Integration | Script output format, metric collection |

---

## Non-Goals

- This release does **not** fix existing test failures (tracked separately).
- This release does **not** modify CI/CD pipeline beyond adding quality-gate step.
- This release does **not** implement auto-remediation for regressions.
- This release does **not** touch `.env` or deploy.

---

## Dependencies

- **Gate B** (Quality Budgets / Release 26B.9) — Initial quality budget definitions
- **Gate E** (Quality / Releases 26E.1–26E.12) — Test harness and E2E infrastructure
- **Release 32A** (Continuous Security) — Security metric baselines

---

## Sign-Off Requirements

| Role | Responsibility |
|------|----------------|
| QA Lead | Approve quality dimensions and tolerance thresholds |
| Platform Lead | Approve CI pipeline integration |
| Product Owner | Approve dashboard scope |

---

*Generated by OpenCode AI — Release 32E Quality Regression Shield*
