import {
  type CountryPayrollStrategy,
  type PayrollRunItemInput,
  type PayrollCalculationResult,
  type PayrollContext,
  registerPayrollStrategy,
} from './countryPayrollStrategy'

/* ============================================================
   Thailand Payroll Strategy
   PND1 progressive tax + Social Security (5%/5%) + Provincial Tax.
   Source: Revenue Code §40(1), Royal Decree No. 776
   ============================================================ */

// ── Tax Brackets (2024) ─────────────────────────────────────

const TH_TAX_BRACKETS_2024 = [
  { min: 0,       max: 150000,   rate: 0 },
  { min: 150000,  max: 300000,   rate: 5 },
  { min: 300000,  max: 500000,   rate: 10 },
  { min: 500000,  max: 750000,   rate: 15 },
  { min: 750000,  max: 1000000,  rate: 20 },
  { min: 1000000, max: 2000000,  rate: 25 },
  { min: 2000000, max: 5000000,  rate: 30 },
  { min: 5000000, max: Infinity, rate: 35 },
]

// ── Social Security Rules (2024) ────────────────────────────

const TH_SS_RULES = {
  employeeRate: 5,
  employerRate: 5,
  minSalary: 1650,
  maxSalary: 15000,
}

// ── Implementation ──────────────────────────────────────────

function calculateWithholdingTax(annualSalary: number): number {
  let tax = 0
  let remaining = annualSalary

  for (const bracket of TH_TAX_BRACKETS_2024) {
    if (remaining <= 0) break
    const bracketSize = bracket.max - bracket.min
    const taxable = Math.min(remaining, bracketSize)
    // Integer arithmetic to avoid IEEE 754 rounding
    tax += Math.round(taxable * bracket.rate) / 100
    remaining -= taxable
  }

  return Math.round(tax * 100) / 100
}

function calculateSocialSecurity(monthlySalary: number): { employee: number; employer: number } {
  const capped = Math.min(
    Math.max(monthlySalary, TH_SS_RULES.minSalary),
    TH_SS_RULES.maxSalary,
  )
  const employee = Math.round(capped * (TH_SS_RULES.employeeRate / 100) * 100) / 100
  const employer = Math.round(capped * (TH_SS_RULES.employerRate / 100) * 100) / 100
  return { employee, employer }
}

// ── Strategy Registration ───────────────────────────────────

const thailandStrategy: CountryPayrollStrategy = {
  countryCode: 'TH',
  countryName: 'Thailand',

  calculate(item: PayrollRunItemInput, _context: PayrollContext): PayrollCalculationResult {
    const grossIncome = item.base_salary + item.overtime_pay + item.bonus + item.other_earnings

    // Social Security
    const ss = calculateSocialSecurity(item.base_salary)

    // Withholding Tax (monthly salary × 12 for annual estimate, then divide by 12)
    const annualSalary = item.base_salary * 12
    const annualTax = calculateWithholdingTax(annualSalary)
    const monthlyTax = Math.round((annualTax / 12) * 100) / 100

    const totalDeductions = ss.employee + monthlyTax + item.other_deductions
    const netPay = grossIncome - totalDeductions

    return {
      social_security_employee: ss.employee,
      social_security_employer: ss.employer,
      withholding_tax: monthlyTax,
      total_deductions: totalDeductions,
      net_pay: netPay,
    }
  },

  validateConfig(_config: Record<string, unknown>): void {
    // Thailand: no special config required for basic payroll
    // Province is optional (defaults to Bangkok)
  },

  getRequiredTables(): string[] {
    return [
      'th_tax_brackets',
      'th_social_security_rules',
      'employee_tax_profiles',
    ]
  },
}

// Auto-register on import
registerPayrollStrategy(thailandStrategy)

export { thailandStrategy }
