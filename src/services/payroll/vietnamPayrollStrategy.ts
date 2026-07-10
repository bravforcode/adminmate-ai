import {
  type CountryPayrollStrategy,
  type PayrollRunItemInput,
  type PayrollCalculationResult,
  type PayrollContext,
  registerPayrollStrategy,
} from './countryPayrollStrategy'

/* ============================================================
   Vietnam Payroll Strategy
   PIT (Personal Income Tax) + BHXH + BHYT + BHTN
   Source: Law on Social Insurance 2014, Law on PIT 2007 (amended 2016),
           Decree 105/2020/ND-CP, Circular 06/2020/TT-BLĐTBXH
   ============================================================ */

// ── PIT Progressive Brackets (2024) ─────────────────────────
// Applied to monthly taxable income (after deductions)
// Tax rates per Law on PIT 2007, amended by Law 71/2019/QH14

const VN_PIT_MONTHLY_BRACKETS = [
  { min: 0,          max: 5_000_000,    rate: 5 },
  { min: 5_000_000,  max: 10_000_000,   rate: 10 },
  { min: 10_000_000, max: 18_000_000,   rate: 15 },
  { min: 18_000_000, max: 32_000_000,   rate: 20 },
  { min: 32_000_000, max: 52_000_000,   rate: 25 },
  { min: 52_000_000, max: 80_000_000,   rate: 30 },
  { min: 80_000_000, max: Infinity,     rate: 35 },
]

// ── Personal Deduction ──────────────────────────────────────
// Per Decree 105/2020/ND-CP

const VN_PERSONAL_DEDUCTION = 11_000_000 // VND/month (132,000,000/year)

// ── Dependent Deduction ─────────────────────────────────────

const VN_DEPENDENT_DEDUCTION = 4_400_000 // VND/month per dependent

// ── BHXH (Social Insurance) ─────────────────────────────────
// Per Decree 143/2018/ND-CP, Circular 06/2020/TT-BLĐTBXH

const VN_BHXH = {
  employeeRate: 8,   // 8% of gross salary
  employerRate: 17.5, // 17.5% of gross salary
  salaryCap: 29_800_000, // Cap at 29.8M VND (20× regional minimum wage)
}

// ── BHYT (Health Insurance) ─────────────────────────────────
// Per Decree 143/2018/ND-CP

const VN_BHYT = {
  employeeRate: 1.5, // 1.5% of gross salary
  employerRate: 3,   // 3% of gross salary
  // No salary cap for BHYT
}

// ── BHTN (Unemployment Insurance) ───────────────────────────
// Per Decree 143/2018/ND-CP, Law on Employment 2013

const VN_BHTN = {
  employeeRate: 1, // 1% of gross salary
  employerRate: 1, // 1% of gross salary
  salaryCap: 29_800_000, // Same cap as BHXH
}

// ── Implementation ──────────────────────────────────────────

function calculatePIT(taxableIncome: number): number {
  let tax = 0
  let remaining = taxableIncome

  for (const bracket of VN_PIT_MONTHLY_BRACKETS) {
    if (remaining <= 0) break
    const bracketSize = bracket.max - bracket.min
    const taxable = Math.min(remaining, bracketSize)
    tax += Math.round((taxable * bracket.rate) / 100)
    remaining -= taxable
  }

  return tax
}

function calculateBHXH(salary: number): { employee: number; employer: number } {
  const cappedSalary = Math.min(salary, VN_BHXH.salaryCap)
  return {
    employee: Math.round(cappedSalary * (VN_BHXH.employeeRate / 100)),
    employer: Math.round(cappedSalary * (VN_BHXH.employerRate / 100)),
  }
}

function calculateBHYT(salary: number): { employee: number; employer: number } {
  return {
    employee: Math.round(salary * (VN_BHYT.employeeRate / 100)),
    employer: Math.round(salary * (VN_BHYT.employerRate / 100)),
  }
}

function calculateBHTN(salary: number): { employee: number; employer: number } {
  const cappedSalary = Math.min(salary, VN_BHTN.salaryCap)
  return {
    employee: Math.round(cappedSalary * (VN_BHTN.employeeRate / 100)),
    employer: Math.round(cappedSalary * (VN_BHTN.employerRate / 100)),
  }
}

// ── Strategy Registration ───────────────────────────────────

const vietnamStrategy: CountryPayrollStrategy = {
  countryCode: 'VN',
  countryName: 'Vietnam',

  calculate(item: PayrollRunItemInput, context: PayrollContext): PayrollCalculationResult {
    const grossIncome = item.base_salary + item.overtime_pay + item.bonus + item.other_earnings

    // BHXH (Social Insurance)
    const bhxh = calculateBHXH(item.base_salary)

    // BHYT (Health Insurance)
    const bhyt = calculateBHYT(item.base_salary)

    // BHTN (Unemployment Insurance)
    const bhtn = calculateBHTN(item.base_salary)

    // Total social insurance contributions (employee portion)
    const socialSecurityEmployee = bhxh.employee + bhyt.employee + bhtn.employee

    // Total social insurance contributions (employer portion)
    const socialSecurityEmployer = bhxh.employer + bhyt.employer + bhtn.employer

    // PIT calculation
    // Taxable income = Gross - BHXH employee - BHYT employee - BHTN employee - Personal deduction - Dependent deductions
    const dependents = (context.config?.dependents as number) || 0
    const totalDeductions = socialSecurityEmployee + VN_PERSONAL_DEDUCTION + (dependents * VN_DEPENDENT_DEDUCTION)
    const taxableIncome = Math.max(0, grossIncome - totalDeductions)
    const pit = calculatePIT(taxableIncome)

    const totalDeductionsFinal = socialSecurityEmployee + pit + item.other_deductions
    const netPay = grossIncome - totalDeductionsFinal

    return {
      social_security_employee: socialSecurityEmployee,
      social_security_employer: socialSecurityEmployer,
      withholding_tax: pit,
      total_deductions: totalDeductionsFinal,
      net_pay: netPay,
      extras: {
        bhxh_employee: bhxh.employee,
        bhxh_employer: bhxh.employer,
        bhyt_employee: bhyt.employee,
        bhyt_employer: bhyt.employer,
        bhtn_employee: bhtn.employee,
        bhtn_employer: bhtn.employer,
        personal_deduction: VN_PERSONAL_DEDUCTION,
        dependent_deduction: dependents * VN_DEPENDENT_DEDUCTION,
        taxable_income: taxableIncome,
      },
    }
  },

  validateConfig(_config: Record<string, unknown>): void {
    // Vietnam: dependents count is optional (defaults to 0)
  },

  getRequiredTables(): string[] {
    return [
      'vn_pit_brackets',
      'vn_social_insurance_rules',
      'employee_tax_profiles',
    ]
  },
}

// Auto-register on import
registerPayrollStrategy(vietnamStrategy)

export { vietnamStrategy }
