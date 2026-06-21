# Release 32B — Rule Review & Policy Governance

**Gate:** L — Lifecycle Governance & Operational Maturity
**Date:** 2026-06-22
**Owner:** Security & Compliance Engineering
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Create a structured review process for all security policies, RLS rules, RBAC permissions, and compliance configurations — ensuring no rule operates indefinitely without human validation, and all changes are traceable.

---

## Scope

### In Scope

1. **Policy review registry** — Track every RLS policy, RBAC permission, and compliance rule with last-reviewed date, next-review date, and reviewer assignment.
2. **Automated review reminders** — Scheduled notifications when policies approach review deadlines.
3. **Review workflow** — Structured approval flow: reviewer examines policy, validates business justification, confirms no drift, marks reviewed.
4. **Change audit trail** — Every policy review produces an immutable audit record with reviewer identity, timestamp, and decision.
5. **Policy diff viewer** — Side-by-side comparison of current vs. previous policy definition.
6. **Bulk review dashboard** — Overview of all policies due for review, grouped by severity and module.

### Out of Scope

- Policy authoring (done via migrations in earlier gates).
- Policy enforcement (handled by RLS/RBAC engine).
- Compliance filing (covered by Gate H / Release 28J).

---

## Required Work Items

| # | Work Item | Priority | Evidence Target |
|---|-----------|----------|-----------------|
| 1 | Create `policy_review_registry` table (policy_id, policy_type, table_name, last_reviewed, next_review, reviewer_id, status) | P0 | Migration SQL |
| 2 | Create `policy_review_history` table (review_id, registry_id, reviewer_id, decision, notes, diff_snapshot, reviewed_at) | P0 | Migration SQL |
| 3 | Build `policyReviewService.ts` — list policies due, submit review, fetch history | P0 | Unit tests |
| 4 | Build `PolicyReviewPage.tsx` — Dashboard with due-soon list, review form, history timeline | P0 | Component |
| 5 | Create pg_cron job for weekly review reminders (`policy-review-reminder`) | P1 | Edge function |
| 6 | Implement policy diff utility (compare two pg_policies snapshots) | P1 | Utility |
| 7 | Seed initial review registry from existing RLS policies + RBAC permissions | P0 | Seed script |
| 8 | Write unit tests for review service | P0 | Test file |
| 9 | Write component tests for review dashboard | P1 | Test file |
| 10 | Update docs: `security-baseline.md`, `phase-ledger.md` | P1 | Docs |

---

## Database Schema

```sql
-- Policy review tracking
CREATE TABLE policy_review_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('rls', 'rbac', 'compliance', 'storage', 'webhook')),
  table_name TEXT NOT NULL,
  policy_name TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable review history
CREATE TABLE policy_review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  registry_id UUID NOT NULL REFERENCES policy_review_registry(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'needs_change', 'deprecated', 'escalated')),
  notes TEXT,
  diff_snapshot JSONB,
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
ALTER TABLE policy_review_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_review" ON policy_review_registry
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE policy_review_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_history" ON policy_review_history
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);
```

---

## Review Cadence

| Policy Type | Review Interval | Escalation |
|-------------|----------------|------------|
| RLS (critical tables) | 90 days | Auto-overdue → Security Lead |
| RLS (standard tables) | 180 days | Auto-overdue → Team Lead |
| RBAC permissions | 180 days | Auto-overdue → Admin Lead |
| Compliance rules | 90 days | Auto-overdue → Compliance Officer |
| Storage policies | 365 days | Auto-overdue → Platform Lead |
| Webhook configs | 180 days | Auto-overdue → Integration Lead |

---

## UI: Policy Review Dashboard

### Page Layout

| Section | Content |
|---------|---------|
| Summary Bar | Total policies, overdue count, due-soon count, reviewed-this-month |
| Due for Review | Filterable table: policy_type, table_name, severity, days overdue |
| Review Form | Read-only policy definition, reviewer notes textarea, decision buttons |
| History Timeline | Chronological review history for selected policy |
| Policy Diff | Side-by-side view when reviewing changes |

### Actions

- **Approve** — Policy valid, no changes needed, schedule next review
- **Needs Change** — Policy requires modification, create follow-up issue
- **Deprecated** — Policy no longer applicable, archive
- **Escalate** — Requires higher authority review

---

## Tests

| Test | Type | Scope |
|------|------|-------|
| `policyReviewService.test.ts` | Unit | CRUD, reminders, history |
| `policyReviewPage.testx` | Component | Dashboard, form, empty/error states |
| `policyDiff.test.ts` | Unit | Diff utility correctness |
| `reviewReminder.test.ts` | Integration | pg_cron trigger and notification |

---

## Non-Goals

- This release does **not** implement auto-approve for any policy type.
- This release does **not** modify existing RLS or RBAC policies.
- This release does **not** create new compliance rules.
- This release does **not** touch `.env` or deploy.

---

## Dependencies

- **Release 32A** (Continuous Security) — Security alert infrastructure
- **Gate A** (Tenant Isolation) — Existing RLS policies to register
- **Gate B** (Platform Foundation) — API contracts for audit trail

---

## Sign-Off Requirements

| Role | Responsibility |
|------|----------------|
| Security Lead | Approve review cadence and severity mapping |
| Compliance Officer | Approve compliance rule review intervals |
| Product Owner | Approve UI scope and workflow |

---

*Generated by OpenCode AI — Release 32B Rule Review & Policy Governance*
