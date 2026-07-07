# Release 27K — Global Payroll Framework

**Gate:** G — Functional Module Completion
**Generated:** 2026-06-22
**Tenant Key:** `company_id`
**Status:** ⬜ Planning — requires human review before implementation

---

## Goal

Establish the architectural foundation for multi-country payroll expansion, ensuring the payroll engine can accept new country packs without rewriting core logic — while safely blocking calculation when a country pack is incomplete.

---

## Scope

### In Scope

1. **Country Pack Model** — `payroll_country_packs` table with country code, status (active/stub/deprecated), and metadata.
2. **Rule Engine Abstraction** — Generic rule set, rule version, rule input/output model that country packs plug into.
3. **Multi-Currency Payroll** — Exchange rate snapshots locked per payroll run for consistent conversion.
4. **Statutory Contribution Abstraction** — Generic employee social security and tax profile per country.
5. **Local Payslip Templates** — Country-specific payslip layout templates.
6. **Country Pack Stubs** — Stub entries for SG, VN, PH, ID, MY, JP, US/UK/EU with `status: stub`.
7. **Missing Pack Guard** — Attempting payroll run for a country with stub-only pack returns a clear error instead of fake calculation.
8. **UI States** — Country pack settings show correct state (`Active` for TH, `ComingSoon` for stubs).
9. **Permissions** — `payroll:manage_country_packs`, `payroll:manage_rules`.

---

## Required Work Items

| # | Work Item | Priority |
|---|-----------|----------|
| 1 | Audit global payroll framework tables for `company_id` and RLS | P0 |
| 2 | Audit services for permission checks and audit logging | P0 |
| 3 | Verify correct country pack selected by legal entity/country | P0 |
| 4 | Verify effective date selects correct rule version | P0 |
| 5 | Verify exchange rate snapshot locked per payroll run | P0 |
| 6 | Verify missing country rule blocks payroll instead of fake calculation | P0 |
| 7 | Verify payslip template selected by country | P1 |
| 8 | Create stub entries for non-TH country packs | P1 |
| 9 | Fix any gaps identified in audit | P0 |
| 10 | Run `npm run type-check`, `npm run lint`, `npm test` | P0 |

---

## Non-Goals

- This release does **not** implement real payroll calculation for non-TH countries.
- This release does **not** implement country-specific tax or social security formulas for SG, VN, PH, ID, MY, JP.
- This release does **not** implement real-time exchange rate API integration (manual/snapshot only).
- This release does **not** implement cross-border payroll consolidation.

---

## Notes

> **This is a planning document.** All work items, scopes, and acceptance criteria described above require human review and approval before any implementation begins. No code changes should be made based solely on this document.
