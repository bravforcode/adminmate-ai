# Release 32C — Restore & DR Exercise Automation

**Gate:** L — Lifecycle Governance & Operational Maturity
**Date:** 2026-06-22
**Owner:** SRE & Platform Engineering
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Automate disaster recovery exercise scheduling, execution tracking, and evidence collection — transforming manual quarterly DR drills into a repeatable, auditable, self-service workflow.

---

## Scope

### In Scope

1. **DR exercise registry** — Schedule, track, and manage tabletop exercises, partial restores, and full DR drills.
2. **Exercise execution workflow** — Step-by-step runbook with pass/fail checkpoints, timed phases, and role assignments.
3. **Automated evidence collection** — Capture backup integrity hashes, restore timestamps, data verification results.
4. **RTO/RPO measurement** — Actual recovery metrics recorded against targets; alert on regression.
5. **Exercise reports** — Auto-generated summary reports with findings, gaps, and remediation items.
6. **Compliance export** — Exportable evidence packages for auditors.

### Out of Scope

- Backup creation (handled by Supabase infrastructure).
- Incident response execution (covered by Gate D / Release 26D.8).
- BCP document authoring (covered by Gate D / Release 26D.7).

---

## Required Work Items

| # | Work Item | Priority | Evidence Target |
|---|-----------|----------|-----------------|
| 1 | Create `dr_exercises` table (exercise_id, type, status, scheduled_at, started_at, completed_at, rto_actual, rpo_actual, rto_target, rpo_target) | P0 | Migration SQL |
| 2 | Create `dr_exercise_checkpoints` table (checkpoint_id, exercise_id, phase, step, description, passed, evidence_url, notes, completed_at) | P0 | Migration SQL |
| 3 | Create `dr_exercise_findings` table (finding_id, exercise_id, severity, category, description, remediation, owner, status) | P0 | Migration SQL |
| 4 | Build `drExerciseService.ts` — CRUD, start/pause/complete, checkpoint tracking, finding management | P0 | Unit tests |
| 5 | Build `DRExercisePage.tsx` — Exercise list, detail view with runbook, findings panel | P0 | Component |
| 6 | Create `dr-exercise-report` Edge Function — generates PDF/markdown report from exercise data | P1 | Edge function |
| 7 | Implement RTO/RPO measurement logic (timestamp diff between restore start and verification complete) | P0 | Service method |
| 8 | Create exercise template library (tabletop, partial restore, full DR) | P1 | Seed data |
| 9 | Write unit tests for exercise service | P0 | Test file |
| 10 | Write component tests for exercise dashboard | P1 | Test file |
| 11 | Update docs: `phase-ledger.md`, `security-baseline.md` | P1 | Docs |

---

## Database Schema

```sql
-- DR exercises
CREATE TABLE dr_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('tabletop', 'partial_restore', 'full_dr')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'
  )),
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rto_target_minutes INTEGER,
  rto_actual_minutes INTEGER,
  rpo_target_minutes INTEGER,
  rpo_actual_minutes INTEGER,
  lead_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step-by-step checkpoints
CREATE TABLE dr_exercise_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES dr_exercises(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  passed BOOLEAN,
  evidence_url TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Findings from exercises
CREATE TABLE dr_exercise_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES dr_exercises(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  remediation TEXT,
  owner_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

```sql
ALTER TABLE dr_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_exercises" ON dr_exercises
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE dr_exercise_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_checkpoints" ON dr_exercise_checkpoints
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);

ALTER TABLE dr_exercise_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation_findings" ON dr_exercise_findings
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);
```

---

## Exercise Templates

### Tabletop Exercise (Monthly, ~1 hour)

| Phase | Steps | Success Criteria |
|-------|-------|-----------------|
| 1. Scenario Brief | Announce incident scenario, assign roles | All participants briefed |
| 2. Response Walkthrough | Step through incident response playbook | Decisions documented |
| 3. Communication Check | Verify notification channels work | All channels confirmed |
| 4. Debrief | Identify gaps and improvements | Findings recorded |

### Partial Restore (Quarterly, ~4 hours)

| Phase | Steps | Success Criteria |
|-------|-------|-----------------|
| 1. Environment Prep | Provision staging environment | Environment ready |
| 2. Database Restore | Restore from 24h-old backup | Data integrity verified |
| 3. File Restore | Restore file storage subset | Files accessible |
| 4. Verification | Run data integrity checks | All checks pass |
| 5. Cleanup | Destroy staging environment | No residual resources |

### Full DR Drill (Annually, ~8 hours)

| Phase | Steps | Success Criteria |
|-------|-------|-----------------|
| 1. Full Backup | Create fresh backup | Backup verified |
| 2. Simulate Failure | Document failure scenario | Scenario documented |
| 3. Failover | Execute failover procedure | System operational on DR |
| 4. Restore | Restore primary from backup | Primary operational |
| 5. Failback | Return to primary | Original state restored |
| 6. Metrics | Record RTO/RPO actuals | Metrics documented |
| 7. Debrief | Full team review | Findings and actions |

---

## UI: DR Exercise Dashboard

### Page Layout

| Section | Content |
|---------|---------|
| Exercise Calendar | Upcoming and past exercises with status badges |
| Active Exercise | Runbook with checkpoint checklist, timer, role assignments |
| RTO/RPO Trends | Chart showing actual vs. target over past exercises |
| Findings Panel | Open findings with severity, owner, status |
| Evidence Archive | Downloadable reports for completed exercises |

---

## Tests

| Test | Type | Scope |
|------|------|-------|
| `drExerciseService.test.ts` | Unit | CRUD, lifecycle, RTO/RPO calculation |
| `drExercisePage.test.tsx` | Component | Dashboard, runbook, empty/error states |
| `rtoRpoMeasurement.test.ts` | Unit | Timing accuracy, edge cases |
| `drReportGeneration.test.ts` | Unit | Report output correctness |

---

## Non-Goals

- This release does **not** execute actual backup/restore operations (requires production access).
- This release does **not** modify backup policies.
- This release does **not** create infrastructure for DR (uses existing Supabase).
- This release does **not** touch `.env` or deploy.

---

## Dependencies

- **Gate D** (Releases 26D.5–26D.7) — Backup policy, restore drill, DR/BCP foundations
- **Release 32A** (Continuous Security) — Alert infrastructure for exercise reminders
- **Release 32B** (Rule Review) — Review workflow patterns

---

## Sign-Off Requirements

| Role | Responsibility |
|------|----------------|
| SRE Lead | Approve exercise templates and RTO/RPO targets |
| Security Lead | Approve tabletop scenarios |
| Product Owner | Approve UI scope and reporting format |

---

*Generated by OpenCode AI — Release 32C Restore & DR Exercise Automation*
