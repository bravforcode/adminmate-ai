# Release 32A — Continuous Security Monitoring

**Gate:** L — Lifecycle Governance & Operational Maturity
**Date:** 2026-06-22
**Owner:** Security & Platform Engineering
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Establish continuous, automated security monitoring that detects misconfigurations, policy drift, privilege escalation, and anomalous access patterns in real time — replacing periodic manual audits with always-on controls.

---

## Scope

### In Scope

1. **RLS drift detection** — Scheduled scan comparing deployed policies against migration source-of-truth; alert on divergence.
2. **Privilege escalation monitor** — Detect role/permission changes outside approved change windows.
3. **Sensitive-data access audit** — Track and alert on bulk reads from tables containing PII or financial data.
4. **Secret-scan CI gate** — Pre-commit and CI pipeline check for leaked API keys, tokens, or credentials.
5. **Dependency vulnerability feed** — Automated daily check against CVE databases; auto-create P1 issues for critical CVEs.
6. **Anomaly detection rules** — Time-series baselines for login patterns, API call volumes, and data export rates.

### Out of Scope

- Incident response (covered by Gate D / Release 26D.8).
- Disaster recovery (covered by Gate D / Release 26D.6–26D.7).
- Compliance audit (covered by Gate H / Releases 28A–28I).

---

## Required Work Items

| # | Work Item | Priority | Evidence Target |
|---|-----------|----------|-----------------|
| 1 | Create `security_monitor_config` table (rules, thresholds, severity, enabled flag) | P0 | Migration SQL |
| 2 | Create `security_alerts` table (alert_id, rule_id, company_id, severity, payload, acknowledged, resolved_at) | P0 | Migration SQL |
| 3 | Create RLS drift detection SQL function (`check_rls_drift()`) comparing `pg_policies` against migration files | P0 | pgTAP test |
| 4 | Create privilege escalation monitor (`detect_privilege_escalation()`) querying `information_schema.role_table_grants` | P0 | pgTAP test |
| 5 | Build `securityMonitorService.ts` — CRUD for rules, alert lifecycle, threshold config | P0 | Unit tests |
| 6 | Build `SecurityMonitorPage.tsx` — Dashboard showing active alerts, rule status, trend charts | P0 | Component |
| 7 | Wire Supabase Edge Function `security-scan` — scheduled cron job executing drift + privilege checks | P1 | Edge function |
| 8 | Add secret-scan check to CI pipeline (pre-commit hook + GitHub Actions step) | P0 | CI config |
| 9 | Create daily CVE check script (`scripts/check-cve.sh`) with GitHub Issues integration | P1 | Script |
| 10 | Write unit tests for anomaly detection rules | P1 | Test file |
| 11 | Write integration test: trigger alert on policy drift | P0 | Test file |
| 12 | Update docs: `security-baseline.md`, `phase-ledger.md`, `adminmate-roadmap.md` | P1 | Docs |

---

## Database Schema

```sql
-- Security monitoring rules
CREATE TABLE security_monitor_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'rls_drift', 'privilege_escalation', 'bulk_data_access',
    'anomalous_login', 'secret_leak', 'dependency_vuln'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  threshold_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security alerts
CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES security_monitor_rules(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS audit log (immutable append-only)
CREATE TABLE rls_audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'modified', 'dropped')),
  old_definition TEXT,
  new_definition TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
ALTER TABLE security_monitor_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation_rules" ON security_monitor_rules
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation_alerts" ON security_alerts
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

-- rls_audit_log: append-only, no UPDATE/DELETE
ALTER TABLE rls_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "append_only_rls_audit" ON rls_audit_log
  FOR INSERT WITH CHECK (true);
CREATE POLICY "read_rls_audit" ON rls_audit_log
  FOR SELECT USING (true);
```

---

## Edge Function: `security-scan`

```typescript
// supabase/functions/security-scan/index.ts
// Triggered by pg_cron every 6 hours
// Steps:
// 1. Query pg_policies, compare against migration baseline
// 2. Detect any policy created/modified/dropped since last scan
// 3. Check role grants for privilege escalation patterns
// 4. Insert alerts into security_alerts for any findings
// 5. Log scan completion to rls_audit_log
```

---

## UI: Security Monitor Dashboard

### Page Layout

| Section | Content |
|---------|---------|
| Alert Summary | Critical / High / Medium / Low counts with trend |
| Active Alerts | Sortable table with severity, rule, timestamp, acknowledge/resolve actions |
| Rule Configuration | CRUD for security_monitor_rules with enable/disable toggle |
| Trend Chart | Alert volume over 30-day window |
| Drift History | List of RLS drift events with before/after diff |

### States

- Loading
- Empty (no rules configured)
- Active (alerts present)
- All Clear (rules active, no unresolved alerts)

---

## Tests

| Test | Type | Scope |
|------|------|-------|
| `rls_drift_detection.test.ts` | pgTAP | Policy drift detection function |
| `privilege_escalation.test.ts` | pgTAP | Role grant anomaly detection |
| `securityMonitorService.test.ts` | Unit | CRUD, alert lifecycle, thresholds |
| `securityMonitorPage.test.tsx` | Component | Dashboard rendering, empty/error/loading states |
| `securityScanEdgeFunction.test.ts` | Integration | Edge function execution against test DB |

---

## Non-Goals

- This release does **not** implement SIEM integration (future consideration).
- This release does **not** create automated remediation — alerts only, human decides.
- This release does **not** modify existing RLS policies.
- This release does **not** touch `.env` or deploy.

---

## Verification Commands

```bash
npx supabase db diff --use-migra supabase/migrations/
npx vitest run tests/unit/security/
npx vitest run tests/integration/security-monitor.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

---

## Dependencies

- **Gate A** (Tenant Isolation) — RLS baseline must be established
- **Gate D** (Observability) — Alert routing infrastructure
- **Gate H** (Thailand Validation) — Compliance baseline for severity thresholds

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| False-positive fatigue from overly sensitive rules | Medium | Medium | Tunable thresholds per company, default conservative |
| pg_cron job failure silently skipping scans | Low | High | Health-check ping, alert if no scan in 24h |
| RLS drift detected after-hours | Low | High | Critical alerts page, PagerDuty integration (future) |

---

## Sign-Off Requirements

| Role | Responsibility |
|------|----------------|
| Security Lead | Approve rule definitions and severity thresholds |
| Platform Lead | Approve edge function architecture |
| Product Owner | Approve UI dashboard scope |

---

*Generated by OpenCode AI — Release 32A Continuous Security Monitoring*
