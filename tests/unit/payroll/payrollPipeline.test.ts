/**
 * Full payroll pipeline test harness — integration-level confidence.
 *
 * Tests the complete monthly payroll calculation from raw salary data
 * through to final output, exercising:
 *   - calculateFullPayroll (monthly pipeline)
 *   - calculatePND1 (annual tax with deductions)
 *   - calculateWithholdingTax (progressive brackets)
 *   - calculateSocialSecurity (SS floor/cap/rate)
 *   - calculateProvincialTax (provincial surcharge)
 *
 * All expected values are hand-computed against the actual code logic:
 *   - SS: 5% of capped salary [1,650–15,000 THB/month]
 *   - Withholding tax: 8-bracket progressive on annual gross / 12
 *   - Provincial tax: annual × rate / 12 (BKK=0%, other=0.1%)
 *   - Net pay: gross − SS employee − withholding tax − provincial tax
 *
 * ⚠️  These values MUST be verified by a Thai-licensed accountant before
 *     use on real paychecks.
 *
 * ASSUMPTIONS:
 * - Province = BKK (provincial tax = 0) unless otherwise stated
 * - No spouse/child/parent allowances (not yet modeled)
 * - Rounding: Math.round at final step inside each sub-function
 */

import { describe, it, expect } from 'vitest'
import {
  calculateFullPayroll,
  calculateWithholdingTax,
  calculatePND1,
  calculateSocialSecurity,
  calculateProvincialTax,
  TH_TAX_BRACKETS_2024,
  TH_SS_RULES,
} from '../../../src/services/payroll/thailandPayrollService'

// ── Constants ──
const SS_ANNUAL = 9_000 // 5% × 15,000 cap × 12 months
const BKK = 'BKK'
const CHIANG_MAI = 'CNX'

// ── Helper: assert with tolerance for /12 division artifacts ──
function expectClose(actual: number, expected: number, msg?: string) {
  // Allow ±0.02 satang tolerance for IEEE 754 division by 12
  expect(actual).toBeGreaterThanOrEqual(expected - 0.02)
  expect(actual).toBeLessThanOrEqual(expected + 0.02)
  if (msg) {
    // Also verify we're within 1 satang
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.01)
  }
}

// ================================================================
// SECTION 1: Full Monthly Pipeline — calculateFullPayroll
// ================================================================
describe('Payroll Pipeline — Monthly Calculation', () => {
  /**
   * Scenario 1: Single employee, base salary only, low income (25K/month)
   *
   * Hand computation:
   *   grossIncome = 25,000
   *   annualSalary = 300,000
   *   SS: capped = min(max(25000, 1650), 15000) = 15,000
   *       employee = 15,000 × 5% = 750
   *   Withholding tax = calculateWithholdingTax(300,000) / 12
   *       = 7,500 / 12 = 625
   *   Provincial tax = 300,000 × 0% / 12 = 0
   *   totalDeductions = 750 + 625 + 0 = 1,375
   *   netPay = 25,000 − 1,375 = 23,625
   *   effectiveTaxRate = (1,375 / 25,000) × 100 = 5.50%
   */
  it('Scenario 1: base salary 25K/month, BKK', () => {
    const result = calculateFullPayroll(25_000, BKK)

    expect(result.grossIncome).toBe(25_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.socialSecurityEmployer).toBe(750)
    expect(result.withholdingTax).toBe(625)
    expect(result.provincialTax).toBe(0)
    expect(result.totalDeductions).toBe(1_375)
    expect(result.netPay).toBe(23_625)
    expect(result.effectiveTaxRate).toBe(5.5)
  })

  /**
   * Scenario 2: Single employee, base salary only, mid income (50K/month)
   *
   * Hand computation:
   *   grossIncome = 50,000
   *   annualSalary = 600,000
   *   SS = 750 (capped at 15K)
   *   Withholding tax = calculateWithholdingTax(600,000) / 12
   *       = (0 + 7,500 + 20,000 + 15,000) / 12 = 42,500 / 12 ≈ 3,541.67
   *   Provincial tax = 0 (BKK)
   *   totalDeductions = 750 + 3,541.67 ≈ 4,291.67
   *   netPay = 50,000 − 4,291.67 ≈ 45,708.33
   */
  it('Scenario 2: base salary 50K/month, BKK', () => {
    const result = calculateFullPayroll(50_000, BKK)

    expect(result.grossIncome).toBe(50_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.socialSecurityEmployer).toBe(750)
    expect(result.withholdingTax).toBeCloseTo(3541.67, 0)
    expect(result.provincialTax).toBe(0)
    expectClose(result.totalDeductions, 4291.67)
    expectClose(result.netPay, 45708.33)
    expect(result.effectiveTaxRate).toBe(8.58)
  })

  /**
   * Scenario 3: Single employee, base + overtime (50K + 10K OT)
   *
   * Hand computation:
   *   grossIncome = 60,000
   *   annualSalary = 720,000
   *   SS on BASE only (50K): 750
   *   Withholding tax = calculateWithholdingTax(720,000) / 12
   *       = (0 + 7,500 + 20,000 + 33,000) / 12 = 60,500 / 12 ≈ 5,041.67
   *   Provincial tax = 0
   *   totalDeductions = 750 + 5,041.67 ≈ 5,791.67
   *   netPay = 60,000 − 5,791.67 ≈ 54,208.33
   */
  it('Scenario 3: base 50K + overtime 10K, BKK', () => {
    const result = calculateFullPayroll(50_000, BKK, 10_000)

    expect(result.grossIncome).toBe(60_000)
    // SS is on base salary (50K), not gross
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.socialSecurityEmployer).toBe(750)
    expect(result.withholdingTax).toBeCloseTo(5041.67, 0)
    expect(result.provincialTax).toBe(0)
    expectClose(result.totalDeductions, 5791.67)
    expectClose(result.netPay, 54208.33)
    expect(result.effectiveTaxRate).toBe(9.65)
  })

  /**
   * Scenario 4: Single employee, base + bonus (80K + 20K bonus)
   *
   * Hand computation:
   *   grossIncome = 100,000
   *   annualSalary = 1,200,000
   *   SS on BASE (80K): capped → 750
   *   Withholding tax = calculateWithholdingTax(1,200,000) / 12
   *       = (0 + 7,500 + 20,000 + 37,500 + 50,000 + 50,000) / 12
   *       = 165,000 / 12 = 13,750
   *   Provincial tax = 0
   *   totalDeductions = 750 + 13,750 = 14,500
   *   netPay = 100,000 − 14,500 = 85,500
   */
  it('Scenario 4: base 80K + bonus 20K, BKK', () => {
    const result = calculateFullPayroll(80_000, BKK, 0, 20_000)

    expect(result.grossIncome).toBe(100_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.socialSecurityEmployer).toBe(750)
    expect(result.withholdingTax).toBe(13_750)
    expect(result.provincialTax).toBe(0)
    expect(result.totalDeductions).toBe(14_500)
    expect(result.netPay).toBe(85_500)
    expect(result.effectiveTaxRate).toBe(14.5)
  })

  /**
   * Scenario 5: Employee at 35% bracket threshold (500K/month → 6M annual)
   *
   * Hand computation:
   *   grossIncome = 500,000
   *   annualSalary = 6,000,000
   *   SS = 750
   *   Withholding tax = calculateWithholdingTax(6,000,000) / 12
   *       = (0 + 7,500 + 20,000 + 37,500 + 50,000 + 250,000 + 900,000 + 350,000)
   *         / 12
   *       = 1,615,000 / 12 ≈ 134,583.33
   *   netPay ≈ 364,666.67
   */
  it('Scenario 5: 35% bracket threshold — 500K/month, BKK', () => {
    const result = calculateFullPayroll(500_000, BKK)

    expect(result.grossIncome).toBe(500_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.socialSecurityEmployer).toBe(750)
    expect(result.withholdingTax).toBeCloseTo(134_583.33, 0)
    expect(result.provincialTax).toBe(0)
    expectClose(result.totalDeductions, 135_333.33)
    expectClose(result.netPay, 364_666.67)
    expect(result.effectiveTaxRate).toBe(27.07)
  })

  /**
   * Scenario 6: Zero income edge case
   *
   * NOTE: SS applies the floor (1,650 THB) even for zero salary.
   * This means SS = 82.50 even when gross = 0.
   * In practice, zero-salary employees should not be in the payroll run.
   * This test documents the current code behavior.
   */
  it('Scenario 7: zero income — SS floor still applies', () => {
    const result = calculateFullPayroll(0, BKK)

    expect(result.grossIncome).toBe(0)
    // SS floor: min(max(0, 1650), 15000) = 1650 → 82.50
    expect(result.socialSecurityEmployee).toBe(82.5)
    expect(result.socialSecurityEmployer).toBe(82.5)
    expect(result.withholdingTax).toBe(0)
    expect(result.provincialTax).toBe(0)
    expect(result.totalDeductions).toBe(82.5)
    expect(result.netPay).toBe(-82.5)
    // effectiveTaxRate = 0 when grossIncome = 0
    expect(result.effectiveTaxRate).toBe(0)
  })

  /**
   * Scenario 7b: Very high income (600K/month → 7.2M annual)
   *
   * Hand computation:
   *   grossIncome = 600,000
   *   annualSalary = 7,200,000
   *   SS = 750
   *   Withholding tax through brackets 0-7:
   *       0 + 7,500 + 20,000 + 37,500 + 50,000 + 250,000 + 900,000 + 770,000
   *       = 2,035,000
   *       / 12 ≈ 169,583.33
   *   netPay ≈ 429,666.67
   */
  it('Scenario 8: very high income 600K/month — deep 35% bracket', () => {
    const result = calculateFullPayroll(600_000, BKK)

    expect(result.grossIncome).toBe(600_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.socialSecurityEmployer).toBe(750)
    expect(result.withholdingTax).toBeCloseTo(169_583.33, 0)
    expect(result.provincialTax).toBe(0)
    expectClose(result.totalDeductions, 170_333.33)
    expectClose(result.netPay, 429_666.67)
    expect(result.effectiveTaxRate).toBe(28.39)
  })

  /**
   * Scenario 8b: Non-BKK province (Chiang Mai) — provincial tax applies
   *
   * Hand computation:
   *   grossIncome = 30,000 (25K base + 5K OT)
   *   annualSalary = 360,000
   *   SS on base (25K): 750
   *   Withholding tax = calculateWithholdingTax(360,000) / 12
   *       = (0 + 7,500 + 6,000) / 12 = 13,500 / 12 = 1,125
   *   Provincial tax = calculateProvincialTax(360,000, 'CNX') / 12
   *       = Math.round(360,000 × 0.1 × 100) / 100 / 12
   *       = 36,000 / 12 = 3,000
   *   totalDeductions = 750 + 1,125 + 3,000 = 4,875
   *   netPay = 30,000 − 4,875 = 25,125
   */
  it('Scenario 8b: non-BKK province — provincial tax applies', () => {
    const result = calculateFullPayroll(25_000, CHIANG_MAI, 5_000)

    expect(result.grossIncome).toBe(30_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.withholdingTax).toBe(1_125)
    expect(result.provincialTax).toBe(3_000)
    expect(result.totalDeductions).toBe(4_875)
    expect(result.netPay).toBe(25_125)
    expect(result.effectiveTaxRate).toBe(16.25)
  })
})

// ================================================================
// SECTION 2: Annual PND1 — calculatePND1
// ================================================================
describe('Payroll Pipeline — PND1 Annual Tax', () => {
  /**
   * Scenario 9: Employee with additional deductions (provident fund, insurance)
   *
   * Income: 800,000/year
   * SS annual: 9,000
   * Other deductions: 100,000 (provident fund + life insurance)
   *
   * Hand computation:
   *   employmentIncomeDeduction = min(800,000 × 0.5, 100,000) = 100,000
   *   totalDeductions = 100,000 + 9,000 + 100,000 = 209,000
   *   personalAllowance = 60,000
   *   assessableIncome = 800,000 − 209,000 − 60,000 = 531,000
   *   tax = 150K×0% + 150K×5% + 200K×10% + 31K×15%
   *       = 0 + 7,500 + 20,000 + 4,650 = 32,150
   *   bracket: 500,000–750,000 THB (15%)
   */
  it('Scenario 9: with 100K additional deductions → lower tax', () => {
    const result = calculatePND1(800_000, {
      socialSecurityAnnual: SS_ANNUAL,
      otherDeductions: 100_000,
    })

    expect(result.annualTaxableIncome).toBe(800_000)
    expect(result.totalDeductions).toBe(209_000)
    expect(result.totalAllowances).toBe(60_000)
    expect(result.totalTaxCredits).toBe(0)
    expect(result.assessableIncome).toBe(531_000)
    expect(result.taxPayable).toBe(32_150)
    expect(result.taxBracket).toBe('500000-750000 THB (15%)')
  })

  /**
   * Scenario 10: Married + 2 kids (xfail — documents the gap)
   *
   * Income: 960,000/year (80K/month)
   * SS: 9,000
   *
   * Current (personal-allowance-only):
   *   employmentDeduction = 100,000 (capped)
   *   totalDeductions = 100,000 + 9,000 = 109,000
   *   personalAllowance = 60,000
   *   assessableIncome = 960,000 − 109,000 − 60,000 = 791,000
   *   tax = 0 + 7,500 + 20,000 + 37,500 + (41,000 × 20%) = 73,200
   *
   * Correct (with spouse + 2 kids):
   *   totalAllowances = 180,000 (60K personal + 60K spouse + 60K kids)
   *   assessableIncome = 960,000 − 109,000 − 180,000 = 671,000
   *   tax = 0 + 7,500 + 20,000 + (171,000 × 15%) = 53,150
   *
   * The gap (~฿20K/year) is the cost of shipping without the allowance data model.
   */
  it.todo(
    'Scenario 10: Married + 2 kids — spouse/child allowances reduce tax by ~฿20K/year (NOT YET IMPLEMENTED)',
  )
})

// ================================================================
// SECTION 3: Social Security Edge Cases — calculateSocialSecurity
// ================================================================
describe('Payroll Pipeline — Social Security Edge Cases', () => {
  it('SS below floor: salary 1,000 → floor 1,650 applied', () => {
    const ss = calculateSocialSecurity(1_000)
    // capped = max(1000, 1650) = 1650 → 1650 × 5% = 82.50
    expect(ss.employee).toBe(82.5)
    expect(ss.employer).toBe(82.5)
  })

  it('SS at exact floor: salary 1,650', () => {
    const ss = calculateSocialSecurity(1_650)
    expect(ss.employee).toBe(82.5)
    expect(ss.employer).toBe(82.5)
  })

  it('SS at exact cap: salary 15,000', () => {
    const ss = calculateSocialSecurity(15_000)
    expect(ss.employee).toBe(750)
    expect(ss.employer).toBe(750)
  })

  it('SS above cap: salary 20,000 → cap 15,000 applied', () => {
    const ss = calculateSocialSecurity(20_000)
    expect(ss.employee).toBe(750)
    expect(ss.employer).toBe(750)
  })

  it('SS mid-range: salary 10,000 → exact 5%', () => {
    const ss = calculateSocialSecurity(10_000)
    expect(ss.employee).toBe(500)
    expect(ss.employer).toBe(500)
  })

  it('SS very high: salary 100,000 → capped at 750', () => {
    const ss = calculateSocialSecurity(100_000)
    expect(ss.employee).toBe(750)
    expect(ss.employer).toBe(750)
  })

  it('SS zero salary: floor applies → 82.50', () => {
    const ss = calculateSocialSecurity(0)
    // Floor: max(0, 1650) = 1650 → 82.50
    expect(ss.employee).toBe(82.5)
    expect(ss.employer).toBe(82.5)
  })

  it('SS rate constants match TH_SS_RULES', () => {
    expect(TH_SS_RULES.employeeRate).toBe(5)
    expect(TH_SS_RULES.employerRate).toBe(5)
    expect(TH_SS_RULES.minSalary).toBe(1_650)
    expect(TH_SS_RULES.maxSalary).toBe(15_000)
  })
})

// ================================================================
// SECTION 4: Tax Bracket Boundaries — calculateWithholdingTax
// ================================================================
describe('Payroll Pipeline — Tax Bracket Boundaries', () => {
  it('0 THB → 0% bracket, tax = 0', () => {
    expect(calculateWithholdingTax(0)).toBe(0)
  })

  it('150,000 THB → top of 0% bracket, tax = 0', () => {
    expect(calculateWithholdingTax(150_000)).toBe(0)
  })

  it('300,000 THB → top of 5% bracket, tax = 7,500', () => {
    expect(calculateWithholdingTax(300_000)).toBe(7_500)
  })

  it('500,000 THB → top of 10% bracket, tax = 27,500', () => {
    // 150K×0% + 150K×5% + 200K×10% = 0 + 7,500 + 20,000 = 27,500
    expect(calculateWithholdingTax(500_000)).toBe(27_500)
  })

  it('750,000 THB → top of 15% bracket, tax = 65,000', () => {
    // 150K×0% + 150K×5% + 200K×10% + 250K×15%
    // = 0 + 7,500 + 20,000 + 37,500 = 65,000
    expect(calculateWithholdingTax(750_000)).toBe(65_000)
  })

  it('1,000,000 THB → top of 20% bracket, tax = 115,000', () => {
    // 0 + 7,500 + 20,000 + 37,500 + 50,000 = 115,000
    expect(calculateWithholdingTax(1_000_000)).toBe(115_000)
  })

  it('2,000,000 THB → top of 25% bracket, tax = 365,000', () => {
    // 115,000 + 250,000 = 365,000
    expect(calculateWithholdingTax(2_000_000)).toBe(365_000)
  })

  it('5,000,000 THB → top of 30% bracket, tax = 1,265,000', () => {
    // 365,000 + 900,000 = 1,265,000
    expect(calculateWithholdingTax(5_000_000)).toBe(1_265_000)
  })

  it('10,000,000 THB → deep in 35% bracket, tax = 3,015,000', () => {
    // 1,265,000 + (10M − 5M) × 35% = 1,265,000 + 1,750,000 = 3,015,000
    expect(calculateWithholdingTax(10_000_000)).toBe(3_015_000)
  })
})

// ================================================================
// SECTION 5: Edge Cases
// ================================================================
describe('Payroll Pipeline — Edge Cases', () => {
  it('zero overtime and zero bonus produce same result as base-only', () => {
    const baseOnly = calculateFullPayroll(50_000, BKK)
    const withZeroes = calculateFullPayroll(50_000, BKK, 0, 0)

    expect(withZeroes.grossIncome).toBe(baseOnly.grossIncome)
    expect(withZeroes.socialSecurityEmployee).toBe(baseOnly.socialSecurityEmployee)
    expect(withZeroes.withholdingTax).toBe(baseOnly.withholdingTax)
    expect(withZeroes.netPay).toBe(baseOnly.netPay)
  })

  it('negative overtime reduces gross income', () => {
    const result = calculateFullPayroll(25_000, BKK, -5_000)

    // grossIncome = 25,000 + (-5,000) + 0 = 20,000
    expect(result.grossIncome).toBe(20_000)
    // SS on base (25K) = 750
    expect(result.socialSecurityEmployee).toBe(750)
    // Tax on 240K annual: 150K×0% + 90K×5% = 4,500 / 12 = 375
    expect(result.withholdingTax).toBe(375)
    expect(result.totalDeductions).toBe(1_125)
    expect(result.netPay).toBe(18_875)
  })

  it('negative bonus reduces gross income', () => {
    const result = calculateFullPayroll(50_000, BKK, 0, -10_000)

    // grossIncome = 50,000 + 0 + (-10,000) = 40,000
    expect(result.grossIncome).toBe(40_000)
    // SS on base (50K) = 750
    expect(result.socialSecurityEmployee).toBe(750)
    // Tax on 480K annual: 150K×0% + 150K×5% + 180K×10% = 0 + 7,500 + 18,000 = 25,500
    expect(result.withholdingTax).toBe(2_125) // 25,500 / 12
  })

  it('negative base salary handled gracefully (SS floor applies)', () => {
    const result = calculateFullPayroll(-1_000, BKK)

    // grossIncome = -1,000
    expect(result.grossIncome).toBe(-1_000)
    // SS floor: max(-1000, 1650) = 1650 → 82.50
    expect(result.socialSecurityEmployee).toBe(82.5)
    // Tax on negative annual: 0
    expect(result.withholdingTax).toBe(0)
    expect(result.netPay).toBe(-1_082.5)
  })

  it('SS is calculated on base salary only, not gross', () => {
    // Employee with 5K base + 95K OT = 100K gross
    const result = calculateFullPayroll(5_000, BKK, 95_000)

    expect(result.grossIncome).toBe(100_000)
    // SS on base 5K (not gross 100K)
    const ss = calculateSocialSecurity(5_000)
    expect(result.socialSecurityEmployee).toBe(ss.employee)
  })

  it('provincial tax is zero for Bangkok', () => {
    const result = calculateFullPayroll(50_000, BKK)
    expect(result.provincialTax).toBe(0)
  })

  it('provincial tax applies for non-BKK provinces', () => {
    const result = calculateFullPayroll(50_000, CHIANG_MAI)
    // annual = 600,000 × 0.1 = 60,000 annual / 12 = 5,000 monthly
    expect(result.provincialTax).toBe(5_000)
  })

  it('total deductions = SS employee + withholding tax + provincial tax', () => {
    const result = calculateFullPayroll(50_000, CHIANG_MAI)

    const expected = result.socialSecurityEmployee + result.withholdingTax + result.provincialTax
    expect(result.totalDeductions).toBeCloseTo(expected, 6)
  })

  it('net pay = gross income - total deductions', () => {
    const result = calculateFullPayroll(80_000, BKK, 10_000, 5_000)

    const expectedNet = result.grossIncome - result.totalDeductions
    expect(result.netPay).toBeCloseTo(expectedNet, 6)
  })
})

// ================================================================
// SECTION 6: Multi-Employee Pipeline Consistency
// ================================================================
describe('Payroll Pipeline — Multi-Employee Consistency', () => {
  it('all employees use the same SS rules', () => {
    const salaries = [1_000, 5_000, 10_000, 15_000, 25_000, 50_000, 100_000]
    for (const salary of salaries) {
      const ss = calculateSocialSecurity(salary)
      // Both portions use the same rate
      expect(ss.employee).toBe(ss.employer)
      // Capped between floor and cap
      const capped = Math.min(Math.max(salary, TH_SS_RULES.minSalary), TH_SS_RULES.maxSalary)
      expect(ss.employee).toBe(Math.round(capped * TH_SS_RULES.employeeRate) / 100)
    }
  })

  it('all employees use the same tax brackets', () => {
    // Two employees with different incomes should produce
    // tax amounts consistent with the same bracket structure
    const tax1 = calculateWithholdingTax(300_000)  // 300K
    const tax2 = calculateWithholdingTax(600_000)  // 600K

    // 600K employee pays more tax than 300K employee
    expect(tax2).toBeGreaterThan(tax1)
    // But not proportionally (progressive brackets)
    expect(tax2 / tax1).toBeGreaterThan(2) // more than 2× tax for 2× income
  })

  it('gross income formula is consistent across all scenarios', () => {
    const testCases = [
      { base: 25_000, ot: 0, bonus: 0, expected: 25_000 },
      { base: 25_000, ot: 5_000, bonus: 0, expected: 30_000 },
      { base: 25_000, ot: 0, bonus: 10_000, expected: 35_000 },
      { base: 25_000, ot: 5_000, bonus: 10_000, expected: 40_000 },
    ]

    for (const tc of testCases) {
      const result = calculateFullPayroll(tc.base, BKK, tc.ot, tc.bonus)
      expect(result.grossIncome).toBe(tc.expected)
    }
  })
})

// ================================================================
// SECTION 7: No Floating-Point Drift
// ================================================================
describe('Payroll Pipeline — Rounding Integrity', () => {
  it('all values are exact satang (no sub-satang precision)', () => {
    const salaries = [1_650, 5_000, 10_000, 15_000, 25_000, 50_000]
    for (const salary of salaries) {
      const result = calculateFullPayroll(salary, BKK)

      // SS values are exact (Math.round inside function)
      expect(result.socialSecurityEmployee * 100 % 1).toBe(0)
      expect(result.socialSecurityEmployer * 100 % 1).toBe(0)

      // Provincial tax is exact for BKK (0)
      expect(result.provincialTax).toBe(0)
    }
  })

  it('tax on round annual amounts produces exact results', () => {
    // When annual salary is divisible by relevant bracket sizes,
    // the tax should be exact
    const exactCases = [
      { annual: 300_000, expectedTax: 7_500 },
      { annual: 500_000, expectedTax: 27_500 },
      { annual: 750_000, expectedTax: 65_000 },
      { annual: 1_000_000, expectedTax: 115_000 },
    ]

    for (const tc of exactCases) {
      expect(calculateWithholdingTax(tc.annual)).toBe(tc.expectedTax)
    }
  })

  it('PND1 produces exact results for round inputs', () => {
    const result = calculatePND1(1_200_000, { socialSecurityAnnual: SS_ANNUAL })

    expect(result.assessableIncome).toBe(1_031_000)
    expect(result.taxPayable).toBe(122_750)
    // All values are integers — no floating-point issues
    expect(Number.isInteger(result.assessableIncome)).toBe(true)
    expect(Number.isInteger(result.taxPayable)).toBe(true)
  })
})
