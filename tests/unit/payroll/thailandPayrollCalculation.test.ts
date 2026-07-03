/**
 * Comprehensive Thailand payroll calculation tests.
 *
 * Covers:
 * - Tax calculation (PND1, progressive brackets)
 * - Social security (floor, cap, rate)
 * - Overtime calculation
 * - Net salary computation
 * - Edge cases: 0 salary, max salary, multiple deductions
 * - Provincial tax
 * - Full payroll pipeline
 */

import { describe, it, expect } from 'vitest'
import {
  calculateWithholdingTax,
  calculateSocialSecurity,
  calculateProvincialTax,
  calculatePND1,
  calculateFullPayroll,
  TH_TAX_BRACKETS_2024,
  TH_SS_RULES,
  TH_PROVINCES,
} from '../../../src/services/payroll/thailandPayrollService'

// ── Tax Brackets Structure ──
describe('Thailand Tax Brackets 2024', () => {
  it('has exactly 8 brackets per Revenue Department', () => {
    expect(TH_TAX_BRACKETS_2024).toHaveLength(8)
  })

  it('brackets are contiguous with no gaps', () => {
    for (let i = 1; i < TH_TAX_BRACKETS_2024.length; i++) {
      expect(TH_TAX_BRACKETS_2024[i].min).toBe(TH_TAX_BRACKETS_2024[i - 1].max)
    }
  })

  it('first bracket starts at 0', () => {
    expect(TH_TAX_BRACKETS_2024[0].min).toBe(0)
  })

  it('last bracket has null max (open-ended)', () => {
    expect(TH_TAX_BRACKETS_2024[7].max).toBeNull()
  })

  it('all rates are non-negative integers', () => {
    for (const b of TH_TAX_BRACKETS_2024) {
      expect(b.rate).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(b.rate)).toBe(true)
    }
  })

  it('rates increase progressively', () => {
    for (let i = 1; i < TH_TAX_BRACKETS_2024.length; i++) {
      expect(TH_TAX_BRACKETS_2024[i].rate).toBeGreaterThanOrEqual(TH_TAX_BRACKETS_2024[i - 1].rate)
    }
  })
})

// ── Withholding Tax Calculation ──
describe('calculateWithholdingTax', () => {
  it('returns 0 for zero income', () => {
    expect(calculateWithholdingTax(0)).toBe(0)
  })

  it('returns 0 for income at 0% bracket boundary (150K)', () => {
    expect(calculateWithholdingTax(150_000)).toBe(0)
  })

  it('calculates correct tax at 5% bracket (300K)', () => {
    // 150K × 0% + 150K × 5% = 7,500
    expect(calculateWithholdingTax(300_000)).toBe(7_500)
  })

  it('calculates correct tax spanning multiple brackets (500K)', () => {
    // 150K×0% + 150K×5% + 200K×10% = 27,500
    expect(calculateWithholdingTax(500_000)).toBe(27_500)
  })

  it('calculates correct tax at 20% bracket (1M)', () => {
    expect(calculateWithholdingTax(1_000_000)).toBe(115_000)
  })

  it('calculates correct tax at 35% bracket (6M)', () => {
    // Through all brackets: 0 + 7.5K + 20K + 37.5K + 50K + 250K + 900K + 350K
    expect(calculateWithholdingTax(6_000_000)).toBe(1_615_000)
  })

  it('handles very high income (10M)', () => {
    // 1,265,000 + (10M - 5M) × 35% = 1,265,000 + 1,750,000 = 3,015,000
    expect(calculateWithholdingTax(10_000_000)).toBe(3_015_000)
  })

  it('produces exact satang (no floating-point drift)', () => {
    const tax = calculateWithholdingTax(431_000)
    expect(tax * 100 % 1).toBe(0)
  })
})

// ── Social Security ──
describe('calculateSocialSecurity', () => {
  it('applies 5% rate on mid-range salary', () => {
    const ss = calculateSocialSecurity(10_000)
    expect(ss.employee).toBe(500)
    expect(ss.employer).toBe(500)
  })

  it('caps at max salary (15,000)', () => {
    const ss = calculateSocialSecurity(20_000)
    expect(ss.employee).toBe(750) // 15,000 × 5%
    expect(ss.employer).toBe(750)
  })

  it('applies floor for salary below minimum (1,650)', () => {
    const ss = calculateSocialSecurity(1_000)
    expect(ss.employee).toBe(82.5) // 1,650 × 5%
    expect(ss.employer).toBe(82.5)
  })

  it('handles zero salary (floor applies)', () => {
    const ss = calculateSocialSecurity(0)
    expect(ss.employee).toBe(82.5)
    expect(ss.employer).toBe(82.5)
  })

  it('handles exact floor salary (1,650)', () => {
    const ss = calculateSocialSecurity(1_650)
    expect(ss.employee).toBe(82.5)
    expect(ss.employer).toBe(82.5)
  })

  it('handles exact cap salary (15,000)', () => {
    const ss = calculateSocialSecurity(15_000)
    expect(ss.employee).toBe(750)
    expect(ss.employer).toBe(750)
  })

  it('employee and employer pay equal amounts', () => {
    const salaries = [0, 1_000, 5_000, 10_000, 15_000, 50_000]
    for (const salary of salaries) {
      const ss = calculateSocialSecurity(salary)
      expect(ss.employee).toBe(ss.employer)
    }
  })

  it('max contribution per month is 750 THB', () => {
    const maxContribution = TH_SS_RULES.maxSalary * (TH_SS_RULES.employeeRate / 100)
    expect(maxContribution).toBe(750)
  })

  it('constants match expected values', () => {
    expect(TH_SS_RULES.employeeRate).toBe(5)
    expect(TH_SS_RULES.employerRate).toBe(5)
    expect(TH_SS_RULES.minSalary).toBe(1_650)
    expect(TH_SS_RULES.maxSalary).toBe(15_000)
  })
})

// ── Provincial Tax ──
describe('calculateProvincialTax', () => {
  it('returns 0 for Bangkok', () => {
    expect(calculateProvincialTax(600_000, 'BKK')).toBe(0)
  })

  it('returns 10% for non-Bangkok provinces', () => {
    const tax = calculateProvincialTax(600_000, 'CNX')
    expect(tax).toBe(60_000) // 600,000 × 10%
  })

  it('returns 0 for zero income', () => {
    expect(calculateProvincialTax(0, 'CNX')).toBe(0)
  })

  it('all provinces are defined', () => {
    expect(TH_PROVINCES.length).toBeGreaterThanOrEqual(5)
    for (const p of TH_PROVINCES) {
      expect(p.code).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.nameTh).toBeTruthy()
    }
  })
})

// ── PND1 Annual Tax ──
describe('calculatePND1', () => {
  const SS_ANNUAL = 9_000 // 5% × 15,000 × 12

  it('returns 0 tax for zero income', () => {
    const result = calculatePND1(0, { socialSecurityAnnual: 0 })
    expect(result.assessableIncome).toBe(0)
    expect(result.taxPayable).toBe(0)
    expect(result.totalDeductions).toBe(0)
  })

  it('returns 0 tax for low income (300K)', () => {
    const result = calculatePND1(300_000, { socialSecurityAnnual: SS_ANNUAL })
    // employmentDeduction = min(150K, 100K) = 100K
    // totalDeductions = 100K + 9K = 109K
    // assessableIncome = 300K - 109K - 60K = 131K → 0% bracket
    expect(result.assessableIncome).toBe(131_000)
    expect(result.taxPayable).toBe(0)
  })

  it('calculates correct tax for mid income (600K)', () => {
    const result = calculatePND1(600_000, { socialSecurityAnnual: SS_ANNUAL })
    // assessableIncome = 600K - 109K - 60K = 431K
    // tax = 150K×0% + 150K×5% + 131K×10% = 20,600
    expect(result.assessableIncome).toBe(431_000)
    expect(result.taxPayable).toBe(20_600)
  })

  it('calculates correct tax for high income (1.2M)', () => {
    const result = calculatePND1(1_200_000, { socialSecurityAnnual: SS_ANNUAL })
    expect(result.assessableIncome).toBe(1_031_000)
    expect(result.taxPayable).toBe(122_750)
  })

  it('calculates correct tax for very high income (6M)', () => {
    const result = calculatePND1(6_000_000, { socialSecurityAnnual: SS_ANNUAL })
    expect(result.assessableIncome).toBe(5_831_000)
    expect(result.taxPayable).toBe(1_555_850)
  })

  it('applies 50% employment deduction (capped at 100K)', () => {
    const result = calculatePND1(500_000, { socialSecurityAnnual: SS_ANNUAL })
    // employmentDeduction = min(250K, 100K) = 100K
    expect(result.totalDeductions).toBe(109_000) // 100K + 9K
  })

  it('applies sub-cap employment deduction for low income', () => {
    const result = calculatePND1(180_000, { socialSecurityAnnual: SS_ANNUAL })
    // employmentDeduction = min(90K, 100K) = 90K (under cap)
    expect(result.totalDeductions).toBe(99_000) // 90K + 9K
  })

  it('applies personal allowance (60K)', () => {
    const result = calculatePND1(600_000, { socialSecurityAnnual: SS_ANNUAL })
    expect(result.totalAllowances).toBe(60_000)
  })

  it('does NOT double-count personal allowance', () => {
    const result = calculatePND1(600_000, { socialSecurityAnnual: SS_ANNUAL })
    expect(result.totalTaxCredits).toBe(0)
    expect(result.totalAllowances).toBe(60_000)
  })

  it('reduces tax with additional deductions', () => {
    const withoutDeductions = calculatePND1(800_000, { socialSecurityAnnual: SS_ANNUAL })
    const withDeductions = calculatePND1(800_000, {
      socialSecurityAnnual: SS_ANNUAL,
      otherDeductions: 100_000,
    })
    expect(withDeductions.taxPayable).toBeLessThan(withoutDeductions.taxPayable)
    expect(withDeductions.taxPayable).toBe(32_150)
  })

  it('returns valid tax bracket string', () => {
    const result = calculatePND1(600_000, { socialSecurityAnnual: SS_ANNUAL })
    expect(result.taxBracket).toContain('THB')
    expect(result.taxBracket).toContain('%')
  })
})

// ── Full Payroll Pipeline ──
describe('calculateFullPayroll', () => {
  it('calculates correct net pay for 25K/month, BKK', () => {
    const result = calculateFullPayroll(25_000, 'BKK')
    expect(result.grossIncome).toBe(25_000)
    expect(result.socialSecurityEmployee).toBe(750) // capped at 15K
    expect(result.socialSecurityEmployer).toBe(750)
    expect(result.withholdingTax).toBe(625) // 7,500 / 12
    expect(result.provincialTax).toBe(0) // BKK
    expect(result.totalDeductions).toBe(1_375)
    expect(result.netPay).toBe(23_625)
  })

  it('calculates correct net pay for 50K/month, BKK', () => {
    const result = calculateFullPayroll(50_000, 'BKK')
    expect(result.grossIncome).toBe(50_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.withholdingTax).toBeCloseTo(3_541.67, 0)
    expect(result.netPay).toBeCloseTo(45_708.33, 0)
  })

  it('includes overtime pay in gross income', () => {
    const result = calculateFullPayroll(50_000, 'BKK', 10_000)
    expect(result.grossIncome).toBe(60_000)
    // SS is on base salary (50K), not gross
    expect(result.socialSecurityEmployee).toBe(750)
  })

  it('includes bonus in gross income', () => {
    const result = calculateFullPayroll(80_000, 'BKK', 0, 20_000)
    expect(result.grossIncome).toBe(100_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.withholdingTax).toBe(13_750)
  })

  it('handles zero salary (SS floor applies)', () => {
    const result = calculateFullPayroll(0, 'BKK')
    expect(result.grossIncome).toBe(0)
    expect(result.socialSecurityEmployee).toBe(82.5) // floor
    expect(result.withholdingTax).toBe(0)
    expect(result.netPay).toBe(-82.5) // negative due to SS floor
  })

  it('handles very high salary (500K/month)', () => {
    const result = calculateFullPayroll(500_000, 'BKK')
    expect(result.grossIncome).toBe(500_000)
    expect(result.socialSecurityEmployee).toBe(750)
    expect(result.withholdingTax).toBeCloseTo(134_583.33, 0)
  })

  it('applies provincial tax for non-BKK provinces', () => {
    const bkk = calculateFullPayroll(50_000, 'BKK')
    const cnx = calculateFullPayroll(50_000, 'CNX')
    expect(bkk.provincialTax).toBe(0)
    expect(cnx.provincialTax).toBe(5_000) // 600K × 0.1% / 12
  })

  it('effective tax rate is correct', () => {
    const result = calculateFullPayroll(50_000, 'BKK')
    const expectedRate = (result.totalDeductions / result.grossIncome) * 100
    expect(result.effectiveTaxRate).toBeCloseTo(expectedRate, 1)
  })

  it('total deductions = SS + withholding + provincial', () => {
    const result = calculateFullPayroll(50_000, 'CNX', 10_000, 5_000)
    const expected = result.socialSecurityEmployee + result.withholdingTax + result.provincialTax
    expect(result.totalDeductions).toBeCloseTo(expected, 4)
  })

  it('net pay = gross - total deductions', () => {
    const result = calculateFullPayroll(80_000, 'BKK', 10_000, 5_000)
    expect(result.netPay).toBeCloseTo(result.grossIncome - result.totalDeductions, 4)
  })

  it('handles negative overtime (reduces gross)', () => {
    const result = calculateFullPayroll(25_000, 'BKK', -5_000)
    expect(result.grossIncome).toBe(20_000)
  })

  it('SS is calculated on base salary only, not gross', () => {
    const result = calculateFullPayroll(5_000, 'BKK', 95_000)
    expect(result.grossIncome).toBe(100_000)
    // SS on base 5K: capped = max(5000, 1650) = 5000 → 250
    expect(result.socialSecurityEmployee).toBe(250)
  })
})

// ── Edge Cases ──
describe('Edge Cases', () => {
  it('max salary bracket produces correct tax', () => {
    const tax = calculateWithholdingTax(50_000_000) // 50M
    // 1,265,000 + (50M - 5M) × 35% = 1,265,000 + 15,750,000 = 17,015,000
    expect(tax).toBe(17_015_000)
  })

  it('SS with extremely high salary is capped', () => {
    const ss = calculateSocialSecurity(1_000_000)
    expect(ss.employee).toBe(750) // still capped at 15K
    expect(ss.employer).toBe(750)
  })

  it('PND1 with zero deductions and zero income', () => {
    const result = calculatePND1(0, { socialSecurityAnnual: 0, otherDeductions: 0 })
    expect(result.assessableIncome).toBe(0)
    expect(result.taxPayable).toBe(0)
  })

  it('full payroll with all zero inputs', () => {
    const result = calculateFullPayroll(0, 'BKK', 0, 0)
    expect(result.grossIncome).toBe(0)
    expect(result.socialSecurityEmployee).toBe(82.5) // floor
    expect(result.withholdingTax).toBe(0)
  })

  it('provincial tax for all defined provinces', () => {
    for (const province of TH_PROVINCES) {
      const tax = calculateProvincialTax(1_000_000, province.code)
      if (province.code === 'BKK') {
        expect(tax).toBe(0)
      } else {
        expect(tax).toBe(100_000) // 1M × 10%
      }
    }
  })

  it('no floating-point drift across multiple calculations', () => {
    const salaries = [1_650, 5_000, 10_000, 15_000, 25_000, 50_000]
    for (const salary of salaries) {
      const result = calculateFullPayroll(salary, 'BKK')
      expect(result.socialSecurityEmployee * 100 % 1).toBe(0)
      expect(result.socialSecurityEmployer * 100 % 1).toBe(0)
    }
  })
})
