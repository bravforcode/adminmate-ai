import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Download, Printer } from 'lucide-react'
import type { PayrollRunItem } from '../../services/payroll/payrollRunService'

interface PayslipViewerProps {
  item: PayrollRunItem
  employeeName?: string
  companyName?: string
  periodLabel?: string
  onDownload?: () => void
}

export function PayslipViewer({
  item,
  employeeName = 'Employee',
  companyName = 'Company',
  periodLabel = '',
  onDownload,
}: PayslipViewerProps) {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handlePrint = () => {
    window.print()
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="border-b border-outline-variant">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{companyName}</CardTitle>
            <p className="text-sm text-on-surface-variant mt-1">Payslip {periodLabel && `— ${periodLabel}`}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" icon={<Printer size={14} />} onClick={handlePrint}>
              Print
            </Button>
            {onDownload && (
              <Button variant="default" size="sm" icon={<Download size={14} />} onClick={onDownload}>
                PDF
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-on-surface-variant">Employee:</span>
            <span className="ml-2 font-medium">{employeeName}</span>
          </div>
          <div>
            <span className="text-on-surface-variant">Employee ID:</span>
            <span className="ml-2 font-mono text-xs">{item.employee_id}</span>
          </div>
          <div>
            <span className="text-on-surface-variant">Status:</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
              item.status === 'approved' ? 'bg-green-100 text-green-700' :
              item.status === 'calculated' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {item.status}
            </span>
          </div>
        </div>

        <div className="border-t border-outline-variant" />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-on-surface">Earnings</h4>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Base Salary</span>
            <span>{fmt(item.base_salary)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Overtime Pay</span>
            <span>{fmt(item.overtime_pay)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Bonus</span>
            <span>{fmt(item.bonus)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Other Earnings</span>
            <span>{fmt(item.other_earnings)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-outline-variant pt-2">
            <span>Gross Income</span>
            <span>{fmt(item.base_salary + item.overtime_pay + item.bonus + item.other_earnings)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-on-surface">Deductions</h4>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Social Security (Employee)</span>
            <span className="text-red-600">-{fmt(item.social_security_employee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Withholding Tax</span>
            <span className="text-red-600">-{fmt(item.Withholding_Tax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Other Deductions</span>
            <span className="text-red-600">-{fmt(item.other_deductions)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-outline-variant pt-2">
            <span>Total Deductions</span>
            <span className="text-red-600">
              -{fmt(item.social_security_employee + item.Withholding_Tax + item.other_deductions)}
            </span>
          </div>
        </div>

        <div className="border-t-2 border-primary" />

        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-on-surface">Net Pay</span>
          <span className="text-2xl font-bold text-primary">{fmt(item.net_pay)} THB</span>
        </div>

        <div className="border-t border-outline-variant pt-2">
          <p className="text-xs text-on-surface-variant">
            Employer SS Contribution: {fmt(item.social_security_employee)} THB (matched)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
