# Release Execution Ledger — Post-Gate-A

**Current Commit:** `5d7c4e3`
**Date:** 2026-06-22

---

## Gate Status

| Gate | Status | Evidence |
|------|--------|----------|
| A (Tenant Isolation) | CONDITIONALLY CLOSED | pgTAP 220/220, REST 89/91 (2 flaky), 42/42 security |
| B (Delivery Engineering) | IN PROGRESS | 26B.0–26B.1D complete. 1703/1703 vitest, 140/140 pgTAP, 254 tables |
| C (Capability Truth) | PLANNED | Registry created (86 features), not enforced in UI |
| D (Observability) | PLANNED | Docs + infra tables, not operational |
| E (Quality/E2E) | PLANNED | Docs only, no E2E suite |
| F (Providers) | PLANNED | Docs only, no sandbox proof |
| G (Module Completion) | PLANNED | Docs only, many schema_only |
| H (Thailand Validation) | PLANNED | Docs only, no specialist review |
| I (Pilot) | NOT STARTED | No pilot customers |
| J (GA) | NOT STARTED | Blocked by I |
| K (Country Expansion) | NOT STARTED | Blocked by J |
| L (Continuous Ops) | NOT STARTED | Blocked by J |

---

## Release-by-Release Status

| Release | Status | Implementation | Runtime Proof | Provider Evidence | Human Review |
|---------|--------|---------------|---------------|-------------------|-------------|
| 26B.0 | ✅ COMPLETE | ✅ | ✅ Baseline truth doc | N/A | ❌ |
| 26B.1A | ✅ COMPLETE | ✅ | ✅ db reset passes | N/A | ❌ |
| 26B.1B | ✅ COMPLETE | ✅ | ✅ Deterministic provisioning | N/A | ❌ |
| 26B.1C | ✅ COMPLETE | ✅ | ✅ Mock chain fix | N/A | ❌ |
| 26B.1D | ✅ COMPLETE | ✅ | ✅ 1703/1703 + 140/140 | N/A | ❌ |
| 26B.2-26B.5 | planned | ⚠️ | ❌ | N/A | ❌ |
| 26B.6-26B.10 | planned | ⚠️ | ❌ | N/A | ❌ |
| 26C.1 | planned | ⚠️ | ❌ | N/A | ❌ |
| 26C.2-26C.8 | planned | ⚠️ | ❌ | N/A | ❌ |
| 26D.1-26D.12 | planned | ⚠️ | ❌ | N/A | ❌ |
| 26E.1-26E.12 | planned | ⚠️ | ❌ | N/A | ❌ |
| 26F.1-26F.14 | planned | ⚠️ | ❌ | ❌ | ❌ |
| 27A-27Z | planned | ⚠️ | ❌ | ❌ | ❌ |
| 28A-28J | planned | ⚠️ | ❌ | ❌ | ❌ |
| 29A-29F | not_started | ❌ | ❌ | ❌ | ❌ |
| 30A-30E | not_started | ❌ | ❌ | ❌ | ❌ |
| 31A-31F | not_started | ❌ | ❌ | ❌ | ❌ |
| 32A-32F | not_started | ❌ | ❌ | ❌ | ❌ |

---

## 26B.1 Sub-Release Detail

| Sub | Name | Status | Key Evidence |
|-----|------|--------|-------------|
| 26B.1A | Migration Dependency Repair | ✅ | 000031 `$$ LANGUAGE`, 000056 table guard, 000057 RLS |
| 26B.1B | Deterministic Profile Provisioning | ✅ | SQL direct fix for handle_new_user() NULL company_id |
| 26B.1C | productionHardening Mock Fix | ✅ | Nested chain mock for error path |
| 26B.1D | Full Green Baseline | ✅ | 1703/1703 vitest, 140/140 pgTAP, 254 tables |

### 26B.1D Bug Analysis
Three bugs found and fixed:
1. **Mock chain resolution** (productionHardening): `.then()` on chainable resolved before `.single()` for error cases
2. **api() param ordering** (release26a51 + release26a52): `{ company_id: ... }` passed as `data` (4th arg) instead of `params` (5th arg). GET requests ignored body, RLS returned own-company data, tests saw "9 rows" instead of "0 rows"
3. **Scope reference** (release26a51): `T0` referenced from wrong `describe` block

---

## Next Action

**Release 26B.2 — Deterministic Data Factory**

Create repeatable test data setup to replace ad-hoc profile provisioning.
Then proceed to:
- 26B.3-26B.10 (delivery engineering: CI, supply chain, ADRs, quality budgets)
- Gate B closure
- 26C (capability truth enforcement)
- 26E (E2E quality)
- 26F (provider sandbox)
- 27A+ (module completion)
- 28+ (Thailand validation)
- 29+ (pilot)
- 30+ (GA)
