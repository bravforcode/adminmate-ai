# Residual Risk Register — Release 26B.0

**Last Updated:** 2026-06-21

---

## Test Failures

| Risk ID | Test | Category | Severity | Affected Module | Root Cause | Repro | Owner | Expiry | Blocks Pilot | Closure Evidence |
|---------|------|----------|----------|----------------|-----------|-------|-------|--------|-------------|-----------------|
| R-001 | release26a51 > G5 | REST flaky | P1 | Tenant isolation | Vitest/Supabase auth timing | Run with Docker Desktop | QA | 2026-07-01 | Yes | 10 consecutive clean runs |
| R-002 | release26a5 > cross-tenant SELECT | REST flaky | P1 | Tenant isolation | Vitest/Supabase auth timing | Run with Docker Desktop | QA | 2026-07-01 | Yes | 10 consecutive clean runs |
| R-003 | release26a52 > cross-tenant SELECT | REST flaky | P1 | Tenant isolation | Vitest/Supabase auth timing | Run with Docker Desktop | QA | 2026-07-01 | Yes | 10 consecutive clean runs |
| R-004 | productionHardening > logSecurityAudit | Mock bug | P2 | Security audit | Mock chain undefined | Fix mock | Dev | 2026-07-15 | No | Mock fixed, test passes |

## Security Findings

| Risk ID | Finding | Severity | Owner | Expiry | Blocks |
|---------|---------|----------|-------|--------|--------|
| R-005 | 6 SECURITY DEFINER functions missing search_path | P1 | Security | 2026-07-15 | Pilot |
| R-006 | 4 views missing security_invoker | P1 | Security | 2026-07-15 | Pilot |
| R-007 | 43 migrations with remote drift risk | P1 | DevOps | 2026-07-01 | GA |

## Infrastructure Gaps

| Risk ID | Gap | Severity | Owner | Expiry | Blocks |
|---------|-----|----------|-------|--------|--------|
| R-008 | No CI/CD pipeline verified in practice | P1 | Platform | 2026-07-15 | Pilot |
| R-009 | No backup restore drill executed | P1 | Ops | 2026-07-30 | GA |
| R-010 | No external security review | P1 | Security | 2026-08-15 | GA |

## Provider Gaps

| Risk ID | Provider | Gap | Severity | Owner | Expiry | Blocks |
|---------|----------|-----|----------|-------|--------|--------|
| R-011 | All 13 providers | No sandbox_verified status | P1 | Platform | 2026-08-01 | Pilot |
| R-012 | Payroll (TH) | No specialist validation | P1 | Payroll | 2026-08-15 | Pilot |

## Product Gaps

| Risk ID | Gap | Severity | Owner | Expiry | Blocks |
|---------|-----|----------|-------|--------|--------|
| R-013 | 86 features: only 42 are complete | P2 | Product | 2026-09-01 | GA |
| R-014 | No pilot customers selected | P2 | Business | 2026-08-01 | Pilot |

## Risk Summary

| Severity | Count | % |
|----------|-------|---|
| P0 | 0 | 0% |
| P1 | 9 | 64% |
| P2 | 5 | 36% |

**No P0 risks. 9 P1 risks must be resolved before pilot. 5 P2 risks before GA.**
