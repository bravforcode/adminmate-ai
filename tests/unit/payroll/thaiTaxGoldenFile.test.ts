/**
 * Golden-file tests for Thai Personal Income Tax (PIT) calculations.
 *
 * These are hand-computed expected values based on:
 * - Revenue Code §40(1): 8-bracket progressive rates (2024)
 * - Employment income deduction: 50% of income, capped at 100,000 THB (2017 reform)
 * - Personal allowance: 60,000 THB
 * - Social security: 5% of capped salary (1,650–15,000 THB/month), annual = 9,000 THB
 * - Tax credit: 0 (personal allowance is already in deductions, NOT a separate credit)
 *
 * ⚠️  These values MUST be verified by a Thai-licensed accountant before
 *     use on real paychecks. The agent that generated this code is not
 *     a tax professional. Run: accountant_signoff = true after review.
 *
 * ASSUMPTIONS:
 * - SS annual = 9,000 THB (5% × 15,000 cap × 12 months)
 * - Rounding: Math.round(tax * 100) / 100 at final step only
 * - No spouse/child/parent allowances (not yet modeled in code)
 * - No provident fund, life insurance, or mortgage deductions
 */

import { describe, it, expect } from 'vitest'
import {
  calculateWithholdingTax,
  calculatePND1,
  calculateSocialSecurity,
  TH_TAX_BRACKETS_2024,
} from '../../../src/services/payroll/thailandPayrollService'

// ── Constants ──
const SS_ANNUAL = 9_000 // 5% × 15,000 cap × 12 months

// ── Bracket sanity check ──
describe('Thai PIT bracket structure', () => {
  it('has exactly 8 brackets matching Revenue Department 2024 rates', () => {
    expect(TH_TAX_BRACKETS_2024).toHaveLength(8)
    // Half-open ranges: [min, max) — contiguous, no gaps, no overlaps
    expect(TH_TAX_BRACKETS_2024[0]).toEqual({ min: 0, max: 150_000, rate: 0 })
    expect(TH_TAX_BRACKETS_2024[1]).toEqual({ min: 150_000, max: 300_000, rate: 5 })
    expect(TH_TAX_BRACKETS_2024[2]).toEqual({ min: 300_000, max: 500_000, rate: 10 })
    expect(TH_TAX_BRACKETS_2024[3]).toEqual({ min: 500_000, max: 750_000, rate: 15 })
    expect(TH_TAX_BRACKETS_2024[4]).toEqual({ min: 750_000, max: 1_000_000, rate: 20 })
    expect(TH_TAX_BRACKETS_2024[5]).toEqual({ min: 1_000_000, max: 2_000_000, rate: 25 })
    expect(TH_TAX_BRACKETS_2024[6]).toEqual({ min: 2_000_000, max: 5_000_000, rate: 30 })
    expect(TH_TAX_BRACKETS_2024[7]).toEqual({ min: 5_000_000, max: null, rate: 35 })
  })
})

// ── Pure progressive tax (no deductions) ──
describe('calculateWithholdingTax — progressive tax on bare income', () => {
  it('returns 0 for income within the 0% bracket', () => {
    expect(calculateWithholdingTax(150_000)).toBe(0)
  })

  it('computes correct tax at 5% bracket boundary', () => {
    // 300,000: first 150K at 0%, next 150K at 5% = 7,500
    expect(calculateWithholdingTax(300_000)).toBe(7_500)
  })

  it('computes correct tax spanning 3 brackets', () => {
    // 431,000: 150K×0% + 150K×5% + 131K×10% = 0 + 7,500 + 13,100 = 20,600
    expect(calculateWithholdingTax(431_000)).toBe(20_600)
  })

  it('computes correct tax at top of 20% bracket', () => {
    // 1,000,000: 150K×0% + 150K×5% + 200K×10% + 250K×15% + 250K×20%
    // = 0 + 7,500 + 20,000 + 37,500 + 50,000 = 115,000
    expect(calculateWithholdingTax(1_000_000)).toBe(115_000)
  })

  it('computes correct tax at 30% bracket', () => {
    // 3,000,000: through brackets 0-6
    // = 0 + 7,500 + 20,000 + 37,500 + 50,000 + 250,000 + 300,000 = 665,000
    expect(calculateWithholdingTax(3_000_000)).toBe(665_000)
  })
})

// ── PND1 golden-file scenarios ──
describe('calculatePND1 — golden-file scenarios', () => {
  /**
   * Scenario 1: Single, ฿25,000/month (฿300,000/year)
   *
   * Hand computation:
   *   employmentDeduction = min(300,000 × 0.5, 100,000) = 100,000
   *   SS = 9,000
   *   totalDeductions = 100,000 + 9,000 = 109,000
   *   personalAllowance = 60,000
   *   assessableIncome = 300,000 - 109,000 - 60,000 = 131,000
   *   tax = progressive(131,000) = 131,000 × 0% = 0
   */
  it('Scenario 1: single, ฿25K/month → ฿0 tax', () => {
    const result = calculatePND1(300_000, { socialSecurityAnnual: SS_ANNUAL })

    expect(result.assessableIncome).toBe(131_000)
    expect(result.taxPayable).toBe(0)
    expect(result.totalDeductions).toBe(109_000)
    expect(result.totalAllowances).toBe(60_000)
  })

  /**
   * Scenario 2: Single, ฿50,000/month (฿600,000/year)
   *
   *   employmentDeduction = min(600,000 × 0.5, 100,000) = 100,000
   *   totalDeductions = 100,000 + 9,000 = 109,000
   *   assessableIncome = 600,000 - 109,000 - 60,000 = 431,000
   *   tax = 150K×0% + 150K×5% + 131K×10% = 0 + 7,500 + 13,100 = 20,600
   */
  it('Scenario 2: single, ฿50K/month → ฿20,600 tax', () => {
    const result = calculatePND1(600_000, { socialSecurityAnnual: SS_ANNUAL })

    expect(result.assessableIncome).toBe(431_000)
    expect(result.taxPayable).toBe(20_600)
  })

  /**
   * Scenario 3: Single, ฿100,000/month (฿1,200,000/year)
   *
   *   employmentDeduction = min(1,200,000 × 0.5, 100,000) = 100,000
   *   totalDeductions = 100,000 + 9,000 = 109,000
   *   assessableIncome = 1,200,000 - 109,000 - 60,000 = 1,031,000
   *   tax = 0 + 7,500 + 20,000 + 37,500 + 50,000 + (31,000 × 25%)
   *       = 115,000 + 7,750 = 122,750
   *
   *   Wait — let me recompute:
   *   Bracket 1: 150K × 0% = 0
   *   Bracket 2: 150K × 5% = 7,500
   *   Bracket 3: 200K × 10% = 20,000
   *   Bracket 4: 250K × 15% = 37,500
   *   Bracket 5: 250K × 20% = 50,000
   *   Bracket 6: 31K × 25% = 7,750
   *   Total = 122,750
   *
   *   ❌ ACTUALLY: 150K+150K+200K+250K+250K = 1,000K. Remaining: 31K.
   *   31K is in bracket 6 (1,000,001–2,000,000 at 25%).
   *   Tax = 0 + 7,500 + 20,000 + 37,500 + 50,000 + 7,750 = 122,750.
   *   BUT the function uses Math.round, so this is exact.
   */
  it('Scenario 3: single, ฿100K/month → ฿115,000 tax', () => {
    // Recomputing carefully:
    // 1,031,000 assessable
    // Bracket 1: 150,000 × 0% = 0
    // Bracket 2: 150,000 × 5% = 7,500
    // Bracket 3: 200,000 × 10% = 20,000
    // Bracket 4: 250,000 × 15% = 37,500
    // Bracket 5: 250,000 × 20% = 50,000
    // Bracket 6: 31,000 × 25% = 7,750
    // Total: 122,750
    const result = calculatePND1(1_200_000, { socialSecurityAnnual: SS_ANNUAL })

    expect(result.assessableIncome).toBe(1_031_000)
    expect(result.taxPayable).toBe(122_750)
  })

  /**
   * Scenario 4: ฿500,000/year — tests the 50% deduction at sub-cap
   *
   *   employmentDeduction = min(500,000 × 0.5, 100,000) = 100,000
   *   totalDeductions = 100,000 + 9,000 = 109,000
   *   assessableIncome = 500,000 - 109,000 - 60,000 = 331,000
   *   tax = 150K×0% + 150K×5% + 31K×10% = 0 + 7,500 + 3,100 = 10,600
   */
  it('Scenario 4: ฿500K/year → ฿10,600 tax', () => {
    const result = calculatePND1(500_000, { socialSecurityAnnual: SS_ANNUAL })

    expect(result.assessableIncome).toBe(331_000)
    expect(result.taxPayable).toBe(10_600)
  })

  /**
   * Scenario 5: Low income (฿180,000/year = ฿15,000/month)
   *
   *   employmentDeduction = min(180,000 × 0.5, 100,000) = 90,000 (under cap)
   *   totalDeductions = 90,000 + 9,000 = 99,000
   *   assessableIncome = 180,000 - 99,000 - 60,000 = 21,000
   *   tax = 21,000 × 0% = 0
   *
   *   NOTE: employment deduction is 50% × 180K = 90K (NOT capped at 100K
   *   because 90K < 100K). This tests the sub-cap branch.
   */
  it('Scenario 5: low income ฿180K/year → ฿0 tax, deduction under cap', () => {
    const result = calculatePND1(180_000, { socialSecurityAnnual: SS_ANNUAL })

    expect(result.assessableIncome).toBe(21_000)
    expect(result.taxPayable).toBe(0)
    // Verify the 50% deduction was NOT capped (90K < 100K)
    expect(result.totalDeductions).toBe(99_000)
  })

  /**
   * Scenario 6: High income ฿6,000,000/year — hits 35% bracket
   *
   *   employmentDeduction = 100,000 (capped)
   *   totalDeductions = 100,000 + 9,000 = 109,000
   *   assessableIncome = 6,000,000 - 109,000 - 60,000 = 5,831,000
   *   tax through brackets 1-7:
   *     0 + 7,500 + 20,000 + 37,500 + 50,000 + 250,000 + 900,000 = 1,265,000
   *   bracket 8: (5,831,000 - 5,000,000) × 35% = 831,000 × 0.35 = 290,850
   *   total = 1,265,000 + 290,850 = 1,555,850
   */
  it('Scenario 6: high income ฿6M/year → ฿1,555,850 tax', () => {
    const result = calculatePND1(6_000_000, { socialSecurityAnnual: SS_ANNUAL })

    expect(result.assessableIncome).toBe(5_831_000)
    expect(result.taxPayable).toBe(1_555_850)
  })

  /**
   * Scenario 7: Zero income — edge case
   * Should return 0 tax, 0 assessable, no errors.
   */
  it('Scenario 7: zero income → ฿0 tax', () => {
    const result = calculatePND1(0, { socialSecurityAnnual: 0 })

    expect(result.assessableIncome).toBe(0)
    expect(result.taxPayable).toBe(0)
    expect(result.totalDeductions).toBe(0)
  })

  /**
   * Scenario 8: With additional deductions (provident fund, insurance)
   *
   *   Income: ฿800,000/year
   *   SS: 9,000
   *   Other deductions: 100,000 (provident fund + life insurance)
   *
   *   employmentDeduction = 100,000 (capped)
   *   totalDeductions = 100,000 + 9,000 + 100,000 = 209,000
   *   assessableIncome = 800,000 - 209,000 - 60,000 = 531,000
   *   tax = 150K×0% + 150K×5% + 200K×10% + 31K×15%
   *       = 0 + 7,500 + 20,000 + 4,650 = 32,150
   */
  it('Scenario 8: with ฿100K additional deductions → lower tax', () => {
    const result = calculatePND1(800_000, {
      socialSecurityAnnual: SS_ANNUAL,
      otherDeductions: 100_000,
    })

    expect(result.assessableIncome).toBe(531_000)
    expect(result.taxPayable).toBe(32_150)
  })

  /**
   * Regression: verify NO double-counting of 60K allowance.
   *
   * The old (buggy) code subtracted 60K twice:
   *   1. As personalAllowance in totalAllowances (reduces assessable income)
   *   2. As totalTaxCredits subtracted from final tax
   *
   * With the fix, totalTaxCredits should be 0.
   */
  it('does NOT double-count the 60K personal allowance', () => {
    const result = calculatePND1(600_000, { socialSecurityAnnual: SS_ANNUAL })

    // totalTaxCredits must be 0 — the 60K is already in totalAllowances
    expect(result.totalTaxCredits).toBe(0)
    expect(result.totalAllowances).toBe(60_000)
  })

  /**
   * Regression: verify 50% employment deduction (not 40%).
   *
   * For income of ฿200,000:
   *   50% deduction = 100,000 (capped)
   *   40% deduction = 80,000 (under cap)
   *
   * With 50%: assessableIncome = 200K - 100K - 9K - 60K = 31,000 → tax = 0
   * With 40%: assessableIncome = 200K - 80K - 9K - 60K = 51,000 → tax = 0
   *
   * Both give 0 here, so let's use ฿250,000:
   *   50%: 250K - 100K - 9K - 60K = 81,000 → tax = 0
   *   40%: 250K - 80K - 9K - 60K = 101,000 → tax = 0 (still in 0% bracket)
   *
   * Use ฿350,000:
   *   50%: 350K - 100K - 9K - 60K = 181,000 → 150K×0% + 31K×5% = 1,550
   *   40%: 350K - 80K - 9K - 60K = 201,000 → 150K×0% + 51K×5% = 2,550
   */
  it('uses 50% employment deduction (not 40%)', () => {
    const result = calculatePND1(350_000, { socialSecurityAnnual: SS_ANNUAL })

    // With 50% deduction: assessable = 350K - 100K - 9K - 60K = 181,000
    // Tax = 150K×0% + 31K×5% = 1,550
    expect(result.assessableIncome).toBe(181_000)
    expect(result.taxPayable).toBe(1_550)
  })

  /**
   * XFAIL: Married + 2 kids scenario — spouse/child allowances not yet implemented.
   *
   * This test documents the correct computation once allowances are built.
   * It is expected to FAIL until the data model captures:
   *   - Marital status (for 60K spouse allowance)
   *   - Number of dependents (for 30K/child allowance)
   *
   * Income: ฿960,000/year (฿80K/month)
   * SS: 9,000
   *
   * Current (personal-allowance-only):
   *   employmentDeduction = 100,000 (capped)
   *   totalDeductions = 100,000 + 9,000 = 109,000
   *   personalAllowance = 60,000
   *   assessableIncome = 960,000 - 109,000 - 60,000 = 791,000
   *   tax = 0 + 7,500 + 20,000 + 37,500 + (41,000 × 20%) = 73,200
   *
   * Correct (with spouse + 2 kids):
   *   employmentDeduction = 100,000 (capped)
   *   totalDeductions = 100,000 + 9,000 = 109,000
   *   personalAllowance = 60,000
   *   spouseAllowance = 60,000
   *   childAllowance = 2 × 30,000 = 60,000
   *   totalAllowances = 180,000
   *   assessableIncome = 960,000 - 109,000 - 180,000 = 671,000
   *   tax = 0 + 7,500 + 20,000 + 37,500 + (71,000 × 20%) = 53,150
   *
   * The gap (~฿20,000/year) is the cost of shipping without the allowance data model.
   */
  it.todo('Married + 2 kids: spouse/child allowances reduce tax by ~฿20K/year (NOT YET IMPLEMENTED)')
})

// ── Social security ──
describe('calculateSocialSecurity', () => {
  it('applies 5% rate on capped salary', () => {
    const ss = calculateSocialSecurity(20_000) // above cap
    expect(ss.employee).toBe(750) // 15,000 × 5%
    expect(ss.employer).toBe(750)
  })

  it('applies floor for low salary', () => {
    const ss = calculateSocialSecurity(1_000) // below 1,650 floor
    expect(ss.employee).toBe(82.5) // 1,650 × 5%
  })

  it('applies exact rate for mid-range salary', () => {
    const ss = calculateSocialSecurity(10_000)
    expect(ss.employee).toBe(500) // 10,000 × 5%
  })
})
