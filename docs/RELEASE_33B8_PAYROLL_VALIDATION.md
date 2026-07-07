# Release 33B.8 — Payroll Professional Validation

**Date:** 2026-06-23  
**Commit:** `8863706`  
**Status:** COMPLETE — 15/15 pgTAP PASS

## Summary

Added professional payroll validation layer for Thailand payroll. Replaces the 3-bracket placeholder seed data with the official 8-bracket Royal Decree structure, adds a social security calculator, a config completeness validator, and a payroll readiness auditor.

## What Changed

### Migration: `20240620000063_payroll_validation.sql`

**New table:**
- `payroll_configs` — per-company Thailand payroll settings (pay_period, pay_day, province, cycle_type, tax_year)

**Tax brackets corrected (Royal Decree 782, B.E. 2567):**

| Bracket | Income Range (THB) | Rate |
|---------|-------------------|------|
| 1 | 0 – 150,000 | 0% |
| 2 | 150,001 – 1,800,000 | 5% |
| 3 | 1,800,001 – 3,600,000 | 10% |
| 4 | 3,600,001 – 5,400,000 | 15% |
| 5 | 5,400,001 – 7,200,000 | 20% |
| 6 | 7,200,001 – 9,600,000 | 25% |
| 7 | 9,600,001 – 12,000,000 | 30% |
| 8 | 12,000,001+ | 35% |

> **Previously:** Only 3 brackets with placeholder rates (0%, 10%, 15%)  
> **Now:** 8 brackets matching the Revenue Department's official progressive tax schedule

### Functions

#### 1. `validate_thailand_payroll_config(company_id)` → JSONB

Checks 8-point configuration completeness:
- pay_period, pay_day, province, cycle_type configured
- Thailand country pack active
- Social security rules seeded for current year
- Tax brackets complete (8 per Royal Decree)
- Active rule versions exist

Returns `{"is_valid": true/false, "score": N/8, "issues": [...], "details": {...}}`

#### 2. `get_thailand_tax_brackets(year)` → TABLE

Returns all tax brackets for a given year with:
- `bracket_number` (1-8)
- `min_income`, `max_income`, `tax_rate`
- `marginal_amount` (bracket width)
- `reference` (Royal Decree citation)

#### 3. `calculate_thailand_social_security(gross_salary, year)` → JSONB

Calculates SSO contributions per Social Security Office rules:
- Floor: 1,650 THB/month
- Cap: 15,000 THB/month
- Employee rate: 5%
- Employer rate: 5%
- Rounding: nearest 1 THB

Returns `{"assessable_salary", "employee", "employer", "total", "employee_rate", "employer_rate", ...}`

#### 4. `audit_payroll_readiness(company_id)` → JSONB

Comprehensive readiness assessment:
- Calls `validate_thailand_payroll_config()` for completeness
- Counts tax brackets (must be 8)
- Counts SS rules
- Checks employee coverage vs salary structures
- Returns `{"readiness": "READY"|"PARTIAL"|"BLOCKED"|"NOT_READY", ...}`

### Tests: `33b8_payroll_validation.sql`

| # | Test | Result |
|---|------|--------|
| 1 | validate_thailand_payroll_config is callable | PASS |
| 2 | Returns is_valid key | PASS |
| 3 | Score > 0 for configured company | PASS |
| 4 | Returns false for non-existent company | PASS |
| 5 | get_thailand_tax_brackets returns 8 brackets | PASS |
| 6 | First bracket is 0% (exempt threshold) | PASS |
| 7 | Last bracket is 35% (highest rate) | PASS |
| 8 | Rates monotonically non-decreasing | PASS |
| 9 | SS on 30K salary (above cap) → employee 750 | PASS |
| 10 | SS on 30K salary (above cap) → employer 750 | PASS |
| 11 | SS on 1K (below floor) → clamped to 83 | PASS |
| 12 | SS on 100K (above cap) → employer 750 | PASS |
| 13 | audit_payroll_readiness is callable | PASS |
| 14 | Returns readiness key | PASS |
| 15 | Full config → READY or PARTIAL | PASS |

## Pre-Existing Issues Fixed

1. **Incomplete tax brackets:** The original seed in migration `20240620000023` had only 3 brackets with placeholder rates. Replaced with 8 correct brackets per Royal Decree 782.

2. **No payroll_configs table:** The frontend service (`thailandPayrollService.ts`) referenced a `payroll_configs` table that didn't exist in any migration. Now created.

3. **No validation functions:** Zero payroll validation logic existed at the database level. All 4 functions now provide server-side validation.

## Files Modified

| File | Action |
|------|--------|
| `supabase/migrations/20240620000063_payroll_validation.sql` | Created |
| `supabase/tests/33b8_payroll_validation.sql` | Created |

## Dependencies

- pgTAP extension (pre-installed)
- Migration `20240620000023_thailand_payroll.sql` (tables: `th_tax_brackets`, `th_social_security_rules`)
- Migration `20240620000024_global_payroll_framework.sql` (tables: `payroll_country_packs`, `payroll_rule_sets`, `payroll_rule_versions`)
- `safe_user_company_id()` function (from RLS migrations)
