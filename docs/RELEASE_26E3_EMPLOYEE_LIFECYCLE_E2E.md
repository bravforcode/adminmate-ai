# Release 26E.3 — Employee Lifecycle E2E (Onboarding → HRIS → Offboarding)

## Scope

Full employee journey from hire through HRIS record management to offboarding.

## Lifecycle Stages

```
Hire Decision → Onboarding Tasks → HRIS Record → Employment Changes → Offboarding
```

## Test Coverage

| Stage | Spec File | Assertions |
|-------|-----------|------------|
| Onboarding kickoff | `08-onboarding.spec.ts` | Task list generation, document requests, welcome flow |
| Onboarding completion | `08-onboarding.spec.ts` | Checklist all-complete gate, status promotion |
| HRIS record creation | Implied by hire flow | Employee profile populated from candidate data |
| Employment changes | Employee management | Department transfer, promotion, salary change |
| Offboarding | Offboarding flow | Asset return, access revocation, final paycheck trigger |

## Onboarding Task Board

| Category | Tasks | Completion Gate |
|----------|-------|-----------------|
| Documents | Contract, NDA, tax forms | All signed |
| IT Setup | Account provisioning, device assignment | Status = active |
| Training | Compliance, role-specific | All completed |
| Welcome | Team intro, first 1:1 | Confirmed by manager |

## HRIS Data Model

```
Employee
├── personal_info (name, DOB, contact)
├── employment (department, role, start_date, salary)
├── compensation_history (changes over time)
├── leave_balances (PTO, sick, etc.)
├── documents (uploaded docs, signed contracts)
└── audit_log (all changes with timestamp, actor)
```

## Offboarding Checklist

1. Manager initiates offboarding request
2. System generates return checklist (equipment, badges, access)
3. IT revokes system access (all integrated services)
4. Finance calculates final payout (unused PTO, severance if applicable)
5. HR conducts exit interview record
6. Employee record status → `terminated` (with reason code)
7. Data retention policy applied (archive vs. purge per compliance)

## Tenant Isolation

All employee data scoped by `company_id`. Cross-tenant employee lookup returns empty. Offboarding at company A does not affect company B data.

## Rollback Scenarios

- Onboarding revert: Reset task completion, re-open checklist
- Offboarding reversal: Reactivate account within retention window
- HRIS correction: Audit-log previous values, apply correction
