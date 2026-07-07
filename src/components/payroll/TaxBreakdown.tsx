import { TH_TAX_BRACKETS_2024, TH_SS_RULES } from '../../services/payroll/thailandPayrollService'

interface TaxBreakdownProps {
  annualIncome: number
  socialSecurityAnnual?: number
  otherDeductions?: number
}

export function TaxBreakdown({ annualIncome, socialSecurityAnnual = 0, otherDeductions = 0 }: TaxBreakdownProps) {
  const employmentDeduction = Math.min(annualIncome * 0.5, 100_000)
  const personalAllowance = 60_000
  const totalDeductions = employmentDeduction + socialSecurityAnnual + otherDeductions
  const assessableIncome = Math.max(0, annualIncome - totalDeductions - personalAllowance)

  // Progressive tax calculation
  let remaining = assessableIncome
  let totalTax = 0
  const bracketDetails: Array<{
    label: string
    rate: number
    taxable: number
    tax: number
  }> = []

  for (const bracket of TH_TAX_BRACKETS_2024) {
    if (remaining <= 0) break
    const bracketSize = (bracket.max ?? Infinity) - bracket.min
    const taxable = Math.min(remaining, bracketSize)
    const tax = Math.round(taxable * bracket.rate) / 100
    totalTax += tax
    remaining -= taxable

    if (taxable > 0) {
      bracketDetails.push({
        label: `${bracket.min.toLocaleString()} – ${bracket.max ? bracket.max.toLocaleString() : '∞'}`,
        rate: bracket.rate,
        taxable,
        tax,
      })
    }
  }

  totalTax = Math.round(totalTax * 100) / 100

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-on-surface mb-2">Income &amp; Deductions</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Annual Gross Income</span>
            <span>{fmt(annualIncome)} THB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Employment Deduction (50%, max 100K)</span>
            <span className="text-red-600">-{fmt(employmentDeduction)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Social Security (annual)</span>
            <span className="text-red-600">-{fmt(socialSecurityAnnual)}</span>
          </div>
          {otherDeductions > 0 && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Other Deductions</span>
              <span className="text-red-600">-{fmt(otherDeductions)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Personal Allowance</span>
            <span className="text-red-600">-{fmt(personalAllowance)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-outline-variant pt-1">
            <span>Assessable Income</span>
            <span>{fmt(assessableIncome)} THB</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-on-surface mb-2">Progressive Tax Brackets</h4>
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="text-left py-1.5 px-2 font-medium">Bracket (THB)</th>
                <th className="text-right py-1.5 px-2 font-medium">Rate</th>
                <th className="text-right py-1.5 px-2 font-medium">Taxable</th>
                <th className="text-right py-1.5 px-2 font-medium">Tax</th>
              </tr>
            </thead>
            <tbody>
              {bracketDetails.map((b, i) => (
                <tr key={i} className="border-b border-outline-variant last:border-0">
                  <td className="py-1.5 px-2">{b.label}</td>
                  <td className="py-1.5 px-2 text-right">{b.rate}%</td>
                  <td className="py-1.5 px-2 text-right">{fmt(b.taxable)}</td>
                  <td className="py-1.5 px-2 text-right font-medium">{fmt(b.tax)}</td>
                </tr>
              ))}
              {bracketDetails.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-on-surface-variant">
                    No taxable income in any bracket
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/20">
        <span className="text-sm font-bold text-on-surface">Total Annual Tax</span>
        <span className="text-lg font-bold text-primary">{fmt(totalTax)} THB</span>
      </div>

      <p className="text-xs text-on-surface-variant">
        Social Security: {TH_SS_RULES.employeeRate}% employee + {TH_SS_RULES.employerRate}% employer,
        capped at {TH_SS_RULES.maxSalary.toLocaleString()} THB/month
        (max contribution: {(TH_SS_RULES.maxSalary * TH_SS_RULES.employeeRate / 100).toLocaleString()} THB/month)
      </p>
    </div>
  )
}
