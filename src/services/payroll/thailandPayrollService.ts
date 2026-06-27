import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

// Correct Thai PIT progressive brackets (Revenue Department of Thailand, 2024)
// Source: Revenue Code §40(1), Royal Decree No. 776
// Ranges are half-open: [min, max) — income at exactly max is taxed at this bracket's rate.
export const TH_TAX_BRACKETS_2024 = [
  { min: 0,          max: 150000,   rate: 0 },   // 0 – 150,000:          0%
  { min: 150000,     max: 300000,   rate: 5 },   // 150,000 – 300,000:    5%
  { min: 300000,     max: 500000,   rate: 10 },  // 300,000 – 500,000:   10%
  { min: 500000,     max: 750000,   rate: 15 },  // 500,000 – 750,000:   15%
  { min: 750000,     max: 1000000,  rate: 20 },  // 750,000 – 1,000,000: 20%
  { min: 1000000,    max: 2000000,  rate: 25 },  // 1,000,000 – 2,000,000: 25%
  { min: 2000000,    max: 5000000,  rate: 30 },  // 2,000,000 – 5,000,000: 30%
  { min: 5000000,    max: null,     rate: 35 },  // Above 5,000,000:      35%
]

export const TH_SS_RULES = {
  employeeRate: 5,
  employerRate: 5,
  minSalary: 1650,
  maxSalary: 15000,
  year: 2024,
}

export const TH_PROVINCIAL_TAX_RATES = {
  bangkok: 0,
  metropolis: 0,
  default: 0.1,
}

export interface PayrollCalculation {
  grossIncome: number
  socialSecurityEmployee: number
  socialSecurityEmployer: number
  withholdingTax: number
  provincialTax: number
  totalDeductions: number
  netPay: number
  effectiveTaxRate: number
}

export interface PND1Data {
  annualTaxableIncome: number
  totalDeductions: number
  totalAllowances: number
  totalTaxCredits: number
  assessableIncome: number
  taxPayable: number
  taxBracket: string
}

export interface Province {
  code: string
  name: string
  nameTh: string
}

export const TH_PROVINCES: Province[] = [
  { code: 'BKK', name: 'Bangkok', nameTh: 'กรุงเทพมหานคร' },
  { code: 'CRG', name: 'Chiang Rai', nameTh: 'เชียงราย' },
  { code: 'CNX', name: 'Chiang Mai', nameTh: 'เชียงใหม่' },
  { code: 'HKT', name: 'Phuket', nameTh: 'ภูเก็ต' },
  { code: 'KBY', name: 'Krabi', nameTh: 'กระบี่' },
  { code: 'NNS', name: 'Nonthaburi', nameTh: 'นนทบุรี' },
  { code: 'PKN', name: 'Pathum Thani', nameTh: 'ปทุมธานี' },
  { code: 'SKN', name: 'Samut Prakan', nameTh: 'สมุทรปราการ' },
]

export function calculateWithholdingTax(annualSalary: number): number {
  let tax = 0
  let remaining = annualSalary

  for (const bracket of TH_TAX_BRACKETS_2024) {
    if (remaining <= 0) break
    const bracketSize = (bracket.max ?? Infinity) - bracket.min
    const taxable = Math.min(remaining, bracketSize)
    // Use integer arithmetic to avoid floating-point errors:
    // taxable * rate is exact (both integers), then /100 gives exact satang.
    // vs. taxable * (rate / 100) which introduces IEEE 754 rounding.
    tax += Math.round(taxable * bracket.rate) / 100
    remaining -= taxable
  }

  return Math.round(tax * 100) / 100
}

export function calculateSocialSecurity(monthlySalary: number): { employee: number; employer: number } {
  const capped = Math.min(
    Math.max(monthlySalary, TH_SS_RULES.minSalary),
    TH_SS_RULES.maxSalary,
  )
  const employee = Math.round(capped * (TH_SS_RULES.employeeRate / 100) * 100) / 100
  const employer = Math.round(capped * (TH_SS_RULES.employerRate / 100) * 100) / 100
  return { employee, employer }
}

export function calculateProvincialTax(annualSalary: number, provinceCode: string): number {
  const isBangkok = ['BKK'].includes(provinceCode)
  const rate = isBangkok
    ? TH_PROVINCIAL_TAX_RATES.bangkok
    : TH_PROVINCIAL_TAX_RATES.default
  return Math.round(annualSalary * rate * 100) / 100
}

export function calculatePND1(
  annualTaxableIncome: number,
  options?: {
    socialSecurityAnnual?: number   // actual SS from employee_tax_profiles
    otherDeductions?: number        // provident fund, life insurance, donations, etc.
  },
): PND1Data {
  // ── Thai PND1 Statutory Deductions (Revenue Code §40) ──

  // Employment income deduction (ค่าใช้จ่าย): 50% of income, capped at 100,000 THB
  // (50% rate per Revenue Department reform effective 1 Jan 2017)
  const employmentIncomeDeduction = Math.min(annualTaxableIncome * 0.5, 100000)

  // Social security contribution: actual amount passed in, default 0
  const socialSecurity = options?.socialSecurityAnnual ?? 0

  // Other deductions from employee_tax_profiles (provident fund, life insurance,
  // donations, mortgage interest, etc.) — each capped per Revenue Department rules
  const otherDeductions = options?.otherDeductions ?? 0

  // Total deductions = employment income deduction + SS + other
  const totalDeductions = employmentIncomeDeduction + socialSecurity + otherDeductions

  // Personal allowance (ค่าลดหย่อนส่วนตัว): 60,000 THB standard
  const personalAllowance = 60000
  const totalAllowances = personalAllowance

  // Net assessable income after deductions and allowances
  const assessableIncome = Math.max(0, annualTaxableIncome - totalDeductions - totalAllowances)

  // Progressive tax on net assessable income
  const taxPayable = calculateWithholdingTax(assessableIncome)

  // NOTE: The 60,000 THB personal allowance (ค่าลดหย่อนส่วนตัว) is already
  // subtracted from assessableIncome above via totalAllowances. Do NOT also
  // subtract it as a "tax credit" — that would double-count the same 60K.
  // The Thai tax system has no separate post-calculation credit for PIT;
  // the personal allowance reduces the tax base, not the tax itself.
  const totalTaxCredits = 0

  const bracket = TH_TAX_BRACKETS_2024.find(
    b => assessableIncome >= b.min && (b.max === null || assessableIncome <= b.max),
  )

  return {
    annualTaxableIncome,
    totalDeductions,
    totalAllowances,
    totalTaxCredits,
    assessableIncome,
    taxPayable: Math.max(0, taxPayable),
    taxBracket: bracket ? `${bracket.min}-${bracket.max ?? '∞'} THB (${bracket.rate}%)` : 'N/A',
  }
}

export function calculateFullPayroll(
  monthlySalary: number,
  provinceCode: string,
  overtimePay: number = 0,
  bonus: number = 0,
): PayrollCalculation {
  const grossIncome = monthlySalary + overtimePay + bonus
  const annualSalary = grossIncome * 12

  const ss = calculateSocialSecurity(monthlySalary)
  const withholdingTax = calculateWithholdingTax(annualSalary) / 12
  const provincialTax = calculateProvincialTax(annualSalary, provinceCode) / 12

  const totalDeductions = ss.employee + withholdingTax + provincialTax
  const netPay = grossIncome - totalDeductions
  const effectiveTaxRate = grossIncome > 0 ? (totalDeductions / grossIncome) * 100 : 0

  return {
    grossIncome,
    socialSecurityEmployee: ss.employee,
    socialSecurityEmployer: ss.employer,
    withholdingTax,
    provincialTax,
    totalDeductions,
    netPay,
    effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
  }
}

export async function getCompanyPayrollConfig(companyId: string) {
  const { data, error } = await supabase
    .from('payroll_configs')
    .select('*')
    .eq('company_id', companyId)
    .eq('country_code', 'TH')
    .single()

  if (error || !data) return null
  return data
}

export async function upsertCompanyPayrollConfig(
  companyId: string,
  config: {
    pay_period?: string
    pay_day?: number
    province?: string
    cycle_type?: string
  },
) {
  // ── RBAC: Verify payroll write permission ──
  const canWrite = await hasPermission('payroll', 'write')
  if (!canWrite) throw new Error('Requires payroll_write permission')

  // ── Verify companyId matches the authenticated user's company ──
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('No company associated with user')
  if (profile.company_id !== companyId) {
    throw new Error('Cannot modify payroll config for another company')
  }

  const { data, error } = await supabase
    .from('payroll_configs')
    .upsert(
      {
        company_id: companyId,
        country_code: 'TH',
        ...config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,country_code' },
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to save payroll config: ${error.message}`)
  return data
}
