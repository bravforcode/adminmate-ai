# Release 32F — Annual Security & Compliance Review

**Gate:** L — Lifecycle Governance & Operational Maturity
**Date:** 2026-06-22
**Owner:** Security, Compliance & Legal
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Establish a structured annual review process covering security posture, compliance adherence, data protection practices, and operational maturity — producing an executive-ready assessment report and remediation roadmap for the next 12 months.

---

## Scope

### In Scope

1. **Annual review framework** — Structured checklist covering security, compliance, privacy, operational maturity, and vendor risk.
2. **Automated evidence collection** — Pull metrics from existing systems (RLS status, audit logs, test coverage, incident count, etc.) into a review snapshot.
3. **Compliance mapping** — Map current controls against PDPA, GDPR, and SOC 2 requirements; identify gaps.
4. **Risk register refresh** — Review and update all risk registers from Gates A–H with current likelihood and impact.
5. **Executive summary report** — Auto-generated markdown report suitable for board/leadership review.
6. **Remediation roadmap** — Prioritized list of improvements for the next 12 months with owners and target dates.
7. **Review scheduling** — Annual reminder system ensuring reviews happen on time.

### Out of Scope

- Security incident response (covered by Gate D / Release 26D.8).
- Penetration testing execution (external activity, not in-scope for code changes).
- Regulatory filing (covered by Gate H / Release 28J).
- Policy authoring (covered by Release 32B).

---

## Required Work Items

| # | Work Item | Priority | Evidence Target |
|---|-----------|----------|-----------------|
| 1 | Create `annual_reviews` table (review_id, review_year, status, completed_at, reviewer_id, report_url) | P0 | Migration SQL |
| 2 | Create `review_checklist_items` table (item_id, review_id, category, check_name, status, evidence_ref, notes) | P0 | Migration SQL |
| 3 | Create `compliance_mappings` table (mapping_id, review_id, framework, control_id, control_name, status, gap_description) | P0 | Migration SQL |
| 4 | Create `remediation_items` table (item_id, review_id, priority, category, description, owner_id, target_date, status) | P0 | Migration SQL |
| 5 | Build `annualReviewService.ts` — CRUD, checklist management, evidence collection, report generation | P0 | Unit tests |
| 6 | Build `AnnualReviewPage.tsx` — Review dashboard, checklist editor, compliance matrix, report viewer | P0 | Component |
| 7 | Create `collect-review-evidence` Edge Function — pulls system metrics for review snapshot | P1 | Edge function |
| 8 | Create `generate-review-report` Edge Function — produces executive summary markdown | P1 | Edge function |
| 9 | Seed initial checklist items from security baseline, existing gates, and compliance requirements | P0 | Seed data |
| 10 | Create annual review reminder (pg_cron, fires 30 days before review deadline) | P1 | Edge function |
| 11 | Write unit tests for review service | P0 | Test file |
| 12 | Write component tests for review dashboard | P1 | Test file |
| 13 | Update docs: `phase-ledger.md`, `security-baseline.md`, `adminmate-roadmap.md` | P1 | Docs |

---

## Database Schema

```sql
-- Annual review record
CREATE TABLE annual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  review_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'evidence_collection', 'analysis', 'reporting', 'completed'
  )),
  review_period_start DATE,
  review_period_end DATE,
  completed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES auth.users(id),
  report_url TEXT,
  executive_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, review_year)
);

-- Checklist items
CREATE TABLE review_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES annual_reviews(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'security', 'privacy', 'compliance', 'operational', 'vendor', 'data_protection'
  )),
  check_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'partial', 'waived')),
  evidence_reference TEXT,
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance framework mapping
CREATE TABLE compliance_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES annual_reviews(id) ON DELETE CASCADE,
  framework TEXT NOT NULL CHECK (framework IN ('pdpa', 'gdpr', 'soc2', 'iso27001')),
  control_id TEXT NOT NULL,
  control_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unassessed' CHECK (status IN (
    'compliant', 'non_compliant', 'partial', 'not_applicable', 'unassessed'
  )),
  gap_description TEXT,
  remediation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remediation roadmap
CREATE TABLE remediation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES annual_reviews(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('p0_immediate', 'p1_90_days', 'p2_180_days', 'p3_next_year')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'deferred')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
ALTER TABLE annual_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_reviews" ON annual_reviews
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE review_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_checklist" ON review_checklist_items
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE compliance_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_compliance" ON compliance_mappings
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE remediation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_remediation" ON remediation_items
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);
```

---

## Review Checklist Categories

### Security

| # | Check | Evidence Source |
|---|-------|-----------------|
| S1 | All tenant tables have RLS enabled | `pg_policies` query |
| S2 | No policy gaps detected in drift scan | Release 32A alerts |
| S3 | All credentials within rotation window | Release 32D credential status |
| S4 | No critical/high CVEs in dependencies | `npm audit` output |
| S5 | Secret scan clean | CI secret-scan results |
| S6 | RBAC permissions reviewed in last 6 months | Release 32B review history |
| S7 | Audit log integrity verified | `audit_logs` append-only check |
| S8 | MFA enabled for all admin accounts | `user_profiles` query |

### Privacy

| # | Check | Evidence Source |
|---|-------|-----------------|
| P1 | PDPA consent collection operational | `pdpa_compliance` table |
| P2 | Data retention policies enforced | `documents` lifecycle |
| P3 | Right-to-erasure workflow tested | `delete-user-data` edge function |
| P4 | Data export workflow tested | `export-user-data` edge function |
| P5 | Sensitive fields properly masked | `sensitive_field_registry` |
| P6 | AI scoring excludes sensitive data | Release 4 safety tests |

### Compliance

| # | Check | Evidence Source |
|---|-------|-----------------|
| C1 | PDPA compliance controls mapped | `compliance_mappings` table |
| C2 | GDPR controls mapped (if applicable) | `compliance_mappings` table |
| C3 | SOC 2 controls mapped (if pursuing) | `compliance_mappings` table |
| C4 | All compliance findings remediated | `remediation_items` table |
| C5 | Policy reviews current (no overdue) | Release 32B registry |

### Operational

| # | Check | Evidence Source |
|---|-------|-----------------|
| O1 | DR exercise completed in last 12 months | Release 32C exercise history |
| O2 | RTO/RPO targets met | Release 32C metrics |
| O3 | Incident response plan current | Release 26D.8 |
| O4 | Monitoring/alerting operational | Release 32A alerts |
| O5 | Backup restore verified | Release 26D.6 |
| O6 | Quality regression shield active | Release 32E baselines |

### Vendor

| # | Check | Evidence Source |
|---|-------|-----------------|
| V1 | All providers have current contracts | Release 32D contracts |
| V2 | Provider health checks passing | Release 32D health logs |
| V3 | No deprecated providers in active use | Release 32D registry |
| V4 | Vendor security assessments current | Manual review |

### Data Protection

| # | Check | Evidence Source |
|---|-------|-----------------|
| D1 | Encryption at rest enabled | Supabase config |
| D2 | Encryption in transit enforced | HTTPS enforcement |
| D3 | Backup encryption verified | Supabase config |
| D4 | Data residency compliance | `data_residency_regions` table |
| D5 | Cross-border transfer controls | Release 7B mobility |

---

## Compliance Framework Mapping

### PDPA (Thailand)

| Control | Description | Status |
|---------|-------------|--------|
| Consent | Explicit consent for data collection | ✅ Implemented |
| Purpose Limitation | Data used only for stated purposes | ✅ Implemented |
| Data Minimization | Collect only necessary data | ⚠️ Review needed |
| Access Rights | Users can access their data | ✅ Implemented |
| Rectification | Users can correct their data | ⚠️ Partial |
| Erasure | Users can request deletion | ✅ Implemented |
| Notification | Breach notification procedures | ⚠️ Review needed |
| DPO | Data Protection Officer assignment | ⬜ Pending |

### GDPR (EU — if applicable)

| Control | Description | Status |
|---------|-------------|--------|
| Lawful Basis | Legal basis for processing | ⚠️ Review needed |
| Consent Management | Granular consent controls | ⚠️ Partial |
| Data Subject Rights | All GDPR rights supported | ⚠️ Partial |
| DPO | Data Protection Officer | ⬜ Pending |
| DPIA | Data Protection Impact Assessment | ⬜ Pending |
| Breach Notification | 72-hour notification | ⚠️ Review needed |
| Cross-border Transfer | Adequacy decisions / SCCs | ⬜ Pending |

---

## UI: Annual Review Dashboard

### Page Layout

| Section | Content |
|---------|---------|
| Review Timeline | Annual review history with status badges |
| Active Review | Checklist progress, compliance matrix, findings |
| Compliance Matrix | Framework × control grid with status indicators |
| Risk Register | Current risks with likelihood × impact heatmap |
| Remediation Roadmap | Timeline view of improvement items |
| Evidence Vault | Links to all evidence artifacts for the review period |
| Executive Summary | Auto-generated markdown report preview |

---

## Tests

| Test | Type | Scope |
|------|------|-------|
| `annualReviewService.test.ts` | Unit | CRUD, checklist, compliance mapping, report generation |
| `annualReviewPage.test.tsx` | Component | Dashboard, checklist, compliance matrix, empty/error states |
| `evidenceCollection.test.ts` | Integration | Metric aggregation from existing tables |
| `reportGeneration.test.ts` | Unit | Executive summary markdown output |

---

## Non-Goals

- This release does **not** conduct actual security audits (external activity).
- This release does **not** modify compliance controls.
- This release does **not** file regulatory reports.
- This release does **not** touch `.env` or deploy.

---

## Dependencies

- **All Gates A–H** — Evidence from all prior gates feeds into the review
- **Release 32A** (Continuous Security) — Security alert metrics
- **Release 32B** (Rule Review) — Policy review history
- **Release 32C** (DR Exercises) — DR exercise results
- **Release 32D** (Provider Governance) — Provider status and credentials
- **Release 32E** (Quality Regression) — Quality baseline metrics

---

## Sign-Off Requirements

| Role | Responsibility |
|------|----------------|
| Security Lead | Approve security checklist and compliance mapping |
| Compliance Officer | Approve PDPA/GDPR framework mapping |
| Legal | Approve data protection checklist |
| Product Owner | Approve executive summary format |
| CTO / Engineering Lead | Final sign-off on annual review |

---

*Generated by OpenCode AI — Release 32F Annual Security & Compliance Review*
