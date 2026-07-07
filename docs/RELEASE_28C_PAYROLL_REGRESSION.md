# Release 28C — Payroll Regression Suite

**Gate:** H — Thailand Professional Validation
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Build a comprehensive regression test suite for Thai payroll calculations, using known-good test cases with expected outcomes — ensuring formula changes do not introduce regressions.

---

## Scope

### In Scope

1. **Test Case Registry** — Structured test cases with employee profiles, inputs, and expected outputs.
2. **Tax Calculation Tests** — PND1 progressive tax bracket tests for various salary levels.
3. **SSO Calculation Tests** — Social security contribution tests including cap enforcement.
4. **Allowance/Deduction Tests** — Recurring and one-time item calculation tests.
5. **OT/Leave Integration Tests** — Tests verifying OT hours and leave records feed correctly into payroll.
6. **Edge Case Tests** — Minimum wage, maximum cap, mid-month join, termination, back-pay.
7. **Regression Runner** — Automated test runner that executes all payroll tests on every formula change.
8. **Test Report** — Pass/fail report with diff for any regression.
9. **UI States** — Regression suite pages show correct truthful UI state.
10. **Permissions** — `payroll:run_tests`, `payroll:view_test_results`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Design and apply migration for test case registry tables | P0 |
| 2 | Create test cases for Thai tax brackets (5+ salary levels) | P0 |
| 3 | Create test cases for SSO calculation (below cap, at cap, above cap) | P0 |
| 4 | Create test cases for allowance/deduction calculations | P0 |
| 5 | Create test cases for OT and leave integration | P0 |
| 6 | Create edge case test cases (minimum wage, mid-month, termination) | P1 |
| 7 | Implement regression test runner service | P0 |
| 8 | Build test results dashboard UI | P1 |
| 9 | Write tests: regression runner detects formula changes | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement visual regression testing for payslip layout.
- This release does **not** implement cross-country payroll regression tests.
- This release does **not** implement AI-generated test cases.
- This release does **not** implement production monitoring for calculation drift.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
>
> Payroll regression tests are the safety net for formula changes. Expected outcomes must be verified against published Thai tax/SSO rates by a qualified accountant.
