# Phase 1B — Payroll/Tax Correctness & Financial Integrity

## Summary

Phase 1B addresses the highest-stakes financial correctness issues in AdminMate AI's Thailand payroll system. All changes were made with precision — these are financial calculations where errors cause real monetary harm.

## Commits

| Commit | Fix | Files Changed |
|--------|-----|---------------|
| `44f3c32` | **1B-1:** Fix Thai tax bracket seed data | `20240627000001_fix_thai_tax_brackets.sql`, `thailandPayrollService.ts` |
| `6bc3c2c` | **1B-2:** Remove 10% NULL fallback | `payrollRunService.ts` |
| `c1de46a` | **1B-3:** Fix PND1 calculation | `thailandPayrollService.ts` |
| `913501a` | **1B-4:** Add RBAC to upsertCompanyPayrollConfig | `thailandPayrollService.ts` |
| `c6a29b7` | **1B-5:** Create payroll atomicity RPC | `20240627000002_payroll_atomicity_rpc.sql` |
| `ecdc6bd` | **1B-6:** Create leave balance RPC | `20240627000003_leave_balance_rpc.sql` |

## Detailed Changes

### Fix 1: Thai Tax Bracket Seed Data
**Problem:** Original seed data had only 3 brackets with placeholder rates (10%/15% instead of correct progressive rates).
**Impact:** Over/under-withholding tax for ALL employees in the system.
**Solution:** New migration replaces with correct 8-bracket Thai PIT:
- 0–150K: 0%, 150K–300K: 5%, 300K–500K: 10%, 500K–750K: 15%
- 750K–1M: 20%, 1M–2M: 25%, 2M–5M: 30%, 5M+: 35%
**Also fixed:** `TH_TAX_BRACKETS_2024` constant in thailandPayrollService.ts had wrong boundaries (1.8M/3.6M instead of correct 300K/500K/750K etc.).

### Fix 2: Remove 10% NULL Fallback
**Problem:** `calculateTHProgressiveTax` silently applied 10% rate when `tax_rate` was NULL.
**Impact:** Silent tax calculation errors for any bracket with NULL rate.
**Solution:** Throws fatal error instead: `Tax rate is NULL for bracket [...]`. Prevents silent financial mistakes.

### Fix 3: Fix PND1 Calculation
**Problem:** `calculatePND1` used fabricated deductions (40% uncapped) and fabricated allowances (10% of income).
**Impact:** Incorrect PND1 tax forms for all employees.
**Solution:** Real Thai tax computation:
- Employment income deduction: 40% of income, **capped at 100,000 THB** (was uncapped)
- Personal allowance: **60,000 THB** (was incorrectly 10% of income)
- Social security: accepts actual amount from `employee_tax_profiles`
- Other deductions: accepts provident fund, life insurance, donations
- Tax credit: 60,000 THB subtracted from final tax

### Fix 4: RBAC on upsertCompanyPayrollConfig
**Problem:** No permission check or company ownership verification on payroll config modification.
**Impact:** Any authenticated user could modify any company's payroll configuration.
**Solution:** Added `hasPermission('payroll', 'write')` + company_id ownership verification.

### Fix 5: Payroll Atomicity RPC
**Problem:** TypeScript payroll calculation updates items one-by-one; a failure mid-loop leaves inconsistent state.
**Impact:** Partial payroll runs with wrong totals.
**Solution:** `payroll_calculate_run(UUID)` RPC:
- Advisory lock prevents concurrent calculation
- Status guard: only draft/calculated runs can recalculate
- All item updates + run totals in single transaction
- NULL tax_rate treated as fatal error
- Audit event with calculation metadata

### Fix 6: Leave Balance RPC
**Problem:** Concurrent leave requests can double-spend leave balance (TOCTOU race condition).
**Impact:** Employees can request more leave than they have.
**Solution:** `leave_request_create(UUID, UUID, DATE, DATE, TEXT)` RPC:
- `SELECT ... FOR UPDATE` on leave_balances locks the row
- Blocks concurrent requests for same employee/leave type
- Validates: total - used - pending >= requested
- Auto-creates balance row if missing
- Companion `leave_request_approve` moves pending→used

## Schema Changes
- **New migration:** `20240627000001_fix_thai_tax_brackets.sql` — DELETE + INSERT correct tax brackets
- **New migration:** `20240627000002_payroll_atomicity_rpc.sql` — `payroll_calculate_run(UUID)` function
- **New migration:** `20240627000003_leave_balance_rpc.sql` — `leave_request_create` + `leave_request_approve` functions

## Risk Assessment
- **Fix 1:** HIGH — Corrects ALL tax calculations system-wide. Any existing incorrect withholding will be corrected going forward.
- **Fix 2:** MEDIUM — Throws on NULL rate. If seed data is wrong, this surfaces the error instead of silently calculating.
- **Fix 3:** HIGH — PND1 forms will now show correct deductions/allowances.
- **Fix 4:** MEDIUM — Prevents unauthorized payroll config changes.
- **Fix 5:** HIGH — Eliminates race condition in batch payroll calculation.
- **Fix 6:** HIGH — Eliminates race condition in leave balance deduction.

## Testing Notes
- Run all payroll unit tests after migration
- Verify tax calculations against manual PND1 computation for sample employees
- Test concurrent leave request submission to verify FOR UPDATE locking
- Verify payroll_calculate_run produces same totals as TypeScript calculateRun
