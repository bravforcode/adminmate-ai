import { supabase } from '../../lib/supabase'

export const TH_TAX_BRACKETS_2024 = [
  { min: 0, max: 150000, rate: 0 },
  { min: 150001, max: 1800000, rate: 5 },
  { min: 1800001, max: 3600000, rate: 10 },
  { min: 3600001, max: 5400000, rate: 15 },
  { min: 5400001, max: 7200000, rate: 20 },
  { min: 7200001, max: 9600000, rate: 25 },
  { min: 9600001, max: 12000000, rate: 30 },
  { min: 12000001, max: null, rate: 35 },
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
    const bracketSize = (bracket.max ?? Infinity) - bracket.min + 1
    const taxable = Math.min(remaining, bracketSize)
    tax += taxable * (bracket.rate / 100)
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

export function calculatePND1(annualTaxableIncome: number): PND1Data {
  const totalDeductions = annualTaxableIncome * 0.4
  const totalAllowances = annualTaxableIncome * 0.1
  const assessableIncome = annualTaxableIncome - totalDeductions - totalAllowances
  const taxPayable = calculateWithholdingTax(Math.max(0, assessableIncome))

  const bracket = TH_TAX_BRACKETS_2024.find(
    b => annualTaxableIncome >= b.min && (b.max === null || annualTaxableIncome <= b.max),
  )

  return {
    annualTaxableIncome,
    totalDeductions,
    totalAllowances,
    totalTaxCredits: 60000,
    assessableIncome: Math.max(0, assessableIncome),
    taxPayable,
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
