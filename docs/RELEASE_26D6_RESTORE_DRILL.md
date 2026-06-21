# Release 26D.6 — Restore Drill

**Gate:** D — Observability, Recovery, and Operational Readiness
**Date:** 2024-06-20
**Owner:** SRE & Platform Engineering

## Overview

Define and execute restore rehearsals to validate backup integrity, measure actual recovery times, and identify gaps in disaster recovery procedures.

## Objectives

- Restore rehearsals conducted quarterly
- Actual RTO measured against target
- Backup integrity verified through full restoration
- Recovery procedures validated end-to-end
- Evidence documented for compliance

## Restore Rehearsal Plan

### Frequency

| Drill Type | Frequency | Duration | Participants |
|------------|-----------|----------|--------------|
| Tabletop Exercise | Monthly | 1 hour | On-call team |
| Partial Restore | Quarterly | 2-4 hours | Platform team |
| Full DR Drill | Annually | 4-8 hours | Full SRE team |

### Scope

| Phase | Data Restored | Success Criteria |
|-------|---------------|------------------|
| 1. Database | 1 hour snapshot | Data integrity verified |
| 2. Files | File storage subset | All files accessible |
| 3. Full System | Complete environment | Application functional |

## Drill Procedure

### Pre-Drill Checklist

- [ ] Notify stakeholders of drill window
- [ ] Confirm backup availability
- [ ] Prepare staging environment
- [ ] Review previous drill findings
- [ ] Assign roles and responsibilities

### Step 1: Backup Selection

```bash
# Select backup from 24 hours ago
BACKUP_DATE=$(date -d '24 hours ago' +%Y%m%d)
BACKUP_PATH="s3://backups/pg/${BACKUP_DATE}_*"

# List available backups
aws s3 ls s3://backups/pg/ | grep "${BACKUP_DATE}"
```

### Step 2: Environment Preparation

```bash
# Create isolated restore environment
createdb adminmate_restore_drill

# Restore database
pg_restore \
  --dbname=adminmate_restore_drill \
  --no-owner \
  --no-privileges \
  "${BACKUP_PATH}"

# Verify schema
psql adminmate_restore_drill -c "\dt+"
```

### Step 3: Data Integrity Verification

```sql
-- Row count comparison
SELECT
  schemaname,
  tablename,
  n_live_tup as current_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for data corruption
SELECT COUNT(*) FROM invoices WHERE id IS NULL;
SELECT COUNT(*) FROM customers WHERE email IS NULL;

-- Verify recent data
SELECT MAX(created_at) FROM invoices;
SELECT MAX(created_at) FROM audit_log;
```

### Step 4: Application Connectivity Test

```bash
# Point application to restored database
export DATABASE_URL="postgresql://localhost:5432/adminmate_restore_drill"

# Run smoke tests
npm run test:smoke

# Verify API endpoints
curl -X GET http://localhost:3000/api/health
curl -X GET http://localhost:3000/api/invoices?limit=10
```

### Step 5: Performance Validation

```bash
# Run baseline queries
EXPLAIN ANALYZE SELECT * FROM invoices WHERE company_id = 'test';
EXPLAIN ANALYZE SELECT * FROM customers WHERE email LIKE '%@test.com';
EXPLAIN ANALYZE SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 1000;
```

## Evidence Format

### Drill Report Template

```markdown
# Restore Drill Report — [DATE]

## Summary
- **Drill Type:** [Partial/Full]
- **Backup Date:** [YYYY-MM-DD]
- **Actual RTO:** [X hours Y minutes]
- **Target RTO:** [X hours]
- **Status:** [PASS/FAIL]

## Timeline
| Time | Activity | Duration | Notes |
|------|----------|----------|-------|
| 10:00 | Started drill | — | — |
| 10:05 | Backup selected | 5 min | — |
| 10:15 | Environment prepared | 10 min | — |
| 10:45 | Database restored | 30 min | — |
| 11:00 | Integrity verified | 15 min | — |
| 11:30 | Application tested | 30 min | — |

## Findings
- **Issue 1:** [Description]
  - **Severity:** [Critical/High/Medium/Low]
  - **Resolution:** [How to fix]
  - **Action Item:** [JIRA ticket]

## Metrics
- **Data Integrity:** [100%/X%]
- **Restore Speed:** [X GB/min]
- **Verification Time:** [X minutes]

## Recommendations
1. [Improvement 1]
2. [Improvement 2]
```

### Evidence Storage

```
s3://adminmate-evidence/restore-drills/
├── 2024-Q1/
│   ├── drill-report.md
│   ├── screenshots/
│   ├── logs/
│   └── metrics.json
├── 2024-Q2/
│   └── ...
```

## Success Criteria

### Pass Criteria

| Metric | Target | Minimum |
|--------|--------|---------|
| RTO Achievement | ≤ 4 hours | ≤ 6 hours |
| Data Integrity | 100% | ≥ 99.9% |
| Application Health | All checks pass | Core features work |
| Documentation | Complete | Complete |

### Fail Criteria

- Data loss > 0.1%
- RTO exceeded by > 50%
- Application unable to start
- Critical features non-functional

## Post-Drill Actions

### Immediate (Same Day)

1. Document all findings in drill report
2. Create JIRA tickets for any issues
3. Update runbook with lessons learned
4. Notify stakeholders of results

### Follow-Up (Within 1 Week)

1. Address critical/high severity issues
2. Update backup procedures if needed
3. Schedule remediation for medium issues
4. Update RTO/RPO targets if needed

## Acceptance Criteria

- [ ] Drill procedure documented step-by-step
- [ ] Evidence format defined
- [ ] Success criteria established
- [ ] Post-drill actions defined
- [ ] First drill scheduled
- [ ] Stakeholders notified of drill cadence
