import {
  type CountryPayrollStrategy,
  type PayrollRunItemInput,
  type PayrollCalculationResult,
  type PayrollContext,
  registerPayrollStrategy,
} from './countryPayrollStrategy'

/* ============================================================
   Indonesia Payroll Strategy
   PPh21 TER (PMK 168/2023) + BPJS Ketenagakerjaan + BPJS Kesehatan + Tapera
   Source: PMK 168/2023, PP 58/2023, Perpres 75/2024
   ============================================================ */

// ── PPh21 TER Monthly Brackets (PMK 168/2023) ──────────────
// TER stands for Tarif Efektif Rata-rata (Effective Average Rate)
// Applied to monthly gross income for withholding purposes

const ID_PPH21_TER_MONTHLY = [
  { min: 0,          max: 5_000_000,    rate: 0,    nonTaxable: 54_000_000 },
  { min: 5_000_000,  max: 6_827_200,    rate: 0.25, nonTaxable: 54_000_000 },
  { min: 6_827_200,  max: 9_252_400,    rate: 2.75, nonTaxable: 54_000_000 },
  { min: 9_252_400,  max: 11_953_500,   rate: 4.25, nonTaxable: 54_000_000 },
  { min: 11_953_500, max: 14_894_200,   rate: 5.75, nonTaxable: 54_000_000 },
  { min: 14_894_200, max: 17_853_600,   rate: 7.25, nonTaxable: 54_000_000 },
  { min: 17_853_600, max: 20_744_300,   rate: 8.25, nonTaxable: 54_000_000 },
  { min: 20_744_300, max: 23_757_600,   rate: 9.75, nonTaxable: 54_000_000 },
  { min: 23_757_600, max: 26_875_000,   rate: 11.25, nonTaxable: 54_000_000 },
  { min: 26_875_000, max: 30_260_000,   rate: 12.25, nonTaxable: 54_000_000 },
  { min: 30_260_000, max: 33_912_500,   rate: 13.25, nonTaxable: 54_000_000 },
  { min: 33_912_500, max: 37_850_000,   rate: 14.25, nonTaxable: 54_000_000 },
  { min: 37_850_000, max: 42_112_500,   rate: 15.75, nonTaxable: 54_000_000 },
  { min: 42_112_500, max: 46_750_000,   rate: 17.25, nonTaxable: 54_000_000 },
  { min: 46_750_000, max: 51_875_000,   rate: 18.25, nonTaxable: 54_000_000 },
  { min: 51_875_000, max: 57_500_000,   rate: 19.25, nonTaxable: 54_000_000 },
  { min: 57_500_000, max: 63_750_000,   rate: 20.25, nonTaxable: 54_000_000 },
  { min: 63_750_000, max: 70_750_000,   rate: 21.25, nonTaxable: 54_000_000 },
  { min: 70_750_000, max: 78_750_000,   rate: 22.25, nonTaxable: 54_000_000 },
  { min: 78_750_000, max: 88_250_000,   rate: 23.25, nonTaxable: 54_000_000 },
  { min: 88_250_000, max: 97_750_000,   rate: 24.25, nonTaxable: 54_000_000 },
  { min: 97_750_000, max: 107_250_000,  rate: 25.25, nonTaxable: 54_000_000 },
  { min: 107_250_000, max: 116_750_000, rate: 26.25, nonTaxable: 54_000_000 },
  { min: 116_750_000, max: 127_500_000, rate: 27.25, nonTaxable: 54_000_000 },
  { min: 127_500_000, max: 137_250_000, rate: 28.25, nonTaxable: 54_000_000 },
  { min: 137_250_000, max: 147_000_000, rate: 29.25, nonTaxable: 54_000_000 },
  { min: 147_000_000, max: 157_500_000, rate: 30.25, nonTaxable: 54_000_000 },
  { min: 157_500_000, max: 167_250_000, rate: 31.25, nonTaxable: 54_000_000 },
  { min: 167_250_000, max: 177_750_000, rate: 32.25, nonTaxable: 54_000_000 },
  { min: 177_750_000, max: 188_500_000, rate: 33.25, nonTaxable: 54_000_000 },
  { min: 188_500_000, max: 199_000_000, rate: 34.25, nonTaxable: 54_000_000 },
  { min: 199_000_000, max: Infinity,    rate: 35.00, nonTaxable: 54_000_000 },
]

// ── BPJS Ketenagakerjaan (Employment Social Security) ───────
// Per PP 44/2015, Perpres 75/2024

const ID_BPJS_TK = {
  // JHT (Jaminan Hari Tua) — Old Age Security
  jht: { employeeRate: 2, employerRate: 3.7 },
  // JKK (Jaminan Kecelakaan Kerja) — Work Accident Security
  jkk: { employerRate: 0.24 }, // Low-risk rate, varies by risk level
  // JKM (Jaminan Kematian) — Death Security
  jkm: { employerRate: 0.3 },
  // JP (Jaminan Pensiun) — Pension Security
  jp: { employeeRate: 1, employerRate: 2 },
  // Salary cap for JP: Rp 12,229,400 (2024)
  jpSalaryCap: 12_229_400,
}

// ── BPJS Kesehatan (Health Insurance) ───────────────────────
// Per PP 51/2024

const ID_BPJS_KES = {
  employeeRate: 1, // 1% of salary
  employerRate: 4, // 4% of salary
  // No salary cap for BPJS Kesehatan
}

// ── Tapera (Tabungan Perumahan Rakyat) ──────────────────────
// Per PP 58/2023 — 3% employee contribution (2.5% savings + 0.5% iuran)

const ID_TAPERA = {
  employeeRate: 3, // 3% of salary
  salaryCap: 12_000_000, // Cap at Rp 12,000,000
}

// ── Implementation ──────────────────────────────────────────

function calculatePPh21TER(monthlyGross: number): number {
  for (const bracket of ID_PPH21_TER_MONTHLY) {
    if (monthlyGross >= bracket.min && monthlyGross < bracket.max) {
      // PPh21 TER = (monthlyGross × rate) / 100
      // The nonTaxable amount is already factored into the bracket rates
      return Math.round((monthlyGross * bracket.rate) / 100)
    }
  }
  // Fallback to highest bracket
  const lastBracket = ID_PPH21_TER_MONTHLY[ID_PPH21_TER_MONTHLY.length - 1]
  return Math.round((monthlyGross * lastBracket.rate) / 100)
}

function calculateBPJSTK(salary: number): {
  jhtEmployee: number
  jhtEmployer: number
  jkk: number
  jkm: number
  jpEmployee: number
  jpEmployer: number
} {
  const jhtEmployee = Math.round(salary * (ID_BPJS_TK.jht.employeeRate / 100))
  const jhtEmployer = Math.round(salary * (ID_BPJS_TK.jht.employerRate / 100))
  const jkk = Math.round(salary * (ID_BPJS_TK.jkk.employerRate / 100))
  const jkm = Math.round(salary * (ID_BPJS_TK.jkm.employerRate / 100))

  // JP has a salary cap
  const jpSalary = Math.min(salary, ID_BPJS_TK.jpSalaryCap)
  const jpEmployee = Math.round(jpSalary * (ID_BPJS_TK.jp.employeeRate / 100))
  const jpEmployer = Math.round(jpSalary * (ID_BPJS_TK.jp.employerRate / 100))

  return { jhtEmployee, jhtEmployer, jkk, jkm, jpEmployee, jpEmployer }
}

function calculateBPJSKes(salary: number): { employee: number; employer: number } {
  return {
    employee: Math.round(salary * (ID_BPJS_KES.employeeRate / 100)),
    employer: Math.round(salary * (ID_BPJS_KES.employerRate / 100)),
  }
}

function calculateTapera(salary: number): number {
  const cappedSalary = Math.min(salary, ID_TAPERA.salaryCap)
  return Math.round(cappedSalary * (ID_TAPERA.employeeRate / 100))
}

// ── Strategy Registration ───────────────────────────────────

const indonesiaStrategy: CountryPayrollStrategy = {
  countryCode: 'ID',
  countryName: 'Indonesia',

  calculate(item: PayrollRunItemInput, _context: PayrollContext): PayrollCalculationResult {
    const grossIncome = item.base_salary + item.overtime_pay + item.bonus + item.other_earnings

    // PPh21 TER withholding
    const pph21 = calculatePPh21TER(grossIncome)

    // BPJS Ketenagakerjaan
    const bpjsTK = calculateBPJSTK(item.base_salary)

    // BPJS Kesehatan
    const bpjsKes = calculateBPJSKes(item.base_salary)

    // Tapera
    const tapera = calculateTapera(item.base_salary)

    // Total employee deductions
    const socialSecurityEmployee = bpjsTK.jhtEmployee + bpjsTK.jpEmployee + bpjsKes.employee + tapera

    // Total employer contributions (not deducted from employee, but tracked)
    const socialSecurityEmployer = bpjsTK.jhtEmployer + bpjsTK.jkk + bpjsTK.jkm + bpjsTK.jpEmployer + bpjsKes.employer

    const totalDeductions = socialSecurityEmployee + pph21 + item.other_deductions
    const netPay = grossIncome - totalDeductions

    return {
      social_security_employee: socialSecurityEmployee,
      social_security_employer: socialSecurityEmployer,
      withholding_tax: pph21,
      total_deductions: totalDeductions,
      net_pay: netPay,
      extras: {
        bpjs_jht_employee: bpjsTK.jhtEmployee,
        bpjs_jht_employer: bpjsTK.jhtEmployer,
        bpjs_jkk: bpjsTK.jkk,
        bpjs_jkm: bpjsTK.jkm,
        bpjs_jp_employee: bpjsTK.jpEmployee,
        bpjs_jp_employer: bpjsTK.jpEmployer,
        bpjs_kes_employee: bpjsKes.employee,
        bpjs_kes_employer: bpjsKes.employer,
        tapera,
        pph21_ter: pph21,
      },
    }
  },

  validateConfig(_config: Record<string, unknown>): void {
    // Indonesia: no special config required for basic payroll
    // JKK rate varies by risk level (low/medium/high) — defaults to low
  },

  getRequiredTables(): string[] {
    return [
      'id_pph21_ter_brackets',
      'id_bpjs_tk_rules',
      'id_bpjs_kes_rules',
      'id_tapera_rules',
    ]
  },
}

// Auto-register on import
registerPayrollStrategy(indonesiaStrategy)

export { indonesiaStrategy }
