# Release 26E.2 — Recruit-to-Hire E2E Journey

## Scope

End-to-end coverage of the full candidate lifecycle from job posting through hiring decision.

## Journey Stages

```
Job Create → Candidate Apply → Pipeline Move → Interview Schedule → Hire Decision
```

## Test Coverage

| Stage | Spec File | Assertions |
|-------|-----------|------------|
| Job listing | `03-jobs.spec.ts` | CRUD, search, filter, status transitions |
| Candidate intake | `04-candidates.spec.ts` | Create, profile completeness, resume upload |
| Pipeline movement | `05-pipeline.spec.ts` | Stage transitions, drag-drop, status gates |
| Interview scheduling | `06-interviews.spec.ts` | Calendar create, reschedule, cancel, conflict detection |
| Hiring decision | `07-hiring.spec.ts` | Offer generation, rejection flow, decision audit log |

## Data Flow

```
┌──────────┐    ┌────────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐
│  Jobs    │───▶│ Candidates │───▶│ Pipeline │───▶│ Interviews │───▶│  Hiring  │
│ (create) │    │ (intake)   │    │ (move)   │    │ (schedule) │    │ (decide) │
└──────────┘    └────────────┘    └──────────┘    └────────────┘    └──────────┘
     │               │                 │                │                │
     ▼               ▼                 ▼                ▼                ▼
  RLS check      RLS check        RLS check        RLS check        RLS check
  (company_id)   (company_id)     (company_id)     (company_id)     (company_id)
```

## RLS Verification

Every stage validates tenant isolation:
- Create → verify `company_id` set on insert
- Read → verify only same-tenant rows returned
- Update → verify cross-tenant update rejected
- Delete → verify soft-delete preserves audit trail

## Key Assertions

- Job status transitions: `draft → published → closed`
- Candidate pipeline: `applied → screening → interview → offer → hired` (or `rejected`)
- Interview states: `scheduled → completed → feedback-submitted`
- Hiring outcome: `hired` sets `employee_id`, `rejected` archives with reason

## Edge Cases

- Duplicate candidate detection (same email, same job)
- Pipeline stage regression (moving backward)
- Interview double-booking conflict
- Concurrent hiring decisions on same candidate

## Cleanup

Test data cleaned up via Supabase seed reset between runs. No persistent state across test suites.
