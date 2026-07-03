import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getRun } from '../../services/payroll/payrollRunService'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/shared/LoadingState'
import { PayslipViewer } from '../../components/payroll/PayslipViewer'

export function PayslipPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const [searchParams] = useSearchParams()
  const runId = searchParams.get('run')
  const company = useAuthStore(s => s.company)
  const navigate = useNavigate()

  // Fetch employee name
  const { data: employeeName } = useQuery({
    queryKey: ['employee-name', employeeId],
    queryFn: async () => {
      if (!employeeId) return 'Employee'
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', employeeId)
        .single()
      return data?.full_name ?? employeeId
    },
    enabled: !!employeeId,
  })

  // Fetch run data to get the employee's item
  const { data: runData, isLoading } = useQuery({
    queryKey: ['payslip-run', runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  })

  // Fetch payslip record if no runId
  const { data: payslipData, isLoading: payslipLoading } = useQuery({
    queryKey: ['payslip', employeeId, company?.id],
    queryFn: async () => {
      if (!employeeId || !company?.id) return null
      const { data } = await supabase
        .from('payslips')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      return data
    },
    enabled: !!employeeId && !!company?.id && !runId,
  })

  if (isLoading || payslipLoading) {
    return <LoadingState variant="cards" rows={2} message="Loading payslip..." />
  }

  // From run data
  if (runData && employeeId) {
    const item = runData.items.find(i => i.employee_id === employeeId)
    if (item) {
      return (
        <div className="space-y-4 max-w-2xl">
          <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <PayslipViewer
            item={item}
            employeeName={employeeName ?? employeeId}
            companyName={company?.name ?? 'Company'}
            onDownload={() => {
              // ponytail: PDF generation requires a lib like jsPDF or @react-pdf/renderer
              // For now, use browser print
              window.print()
            }}
          />
        </div>
      )
    }
  }

  // From payslip record (no runId)
  if (payslipData) {
    // Construct a PayrollRunItem-like object from payslip record
    const item = {
      id: payslipData.id,
      company_id: payslipData.company_id,
      run_id: payslipData.run_id ?? '',
      employee_id: payslipData.employee_id,
      base_salary: payslipData.base_salary ?? 0,
      overtime_pay: payslipData.overtime_pay ?? 0,
      bonus: payslipData.bonus ?? 0,
      other_earnings: payslipData.other_earnings ?? 0,
      social_security_employee: payslipData.social_security_employee ?? 0,
      social_security_employer: payslipData.social_security_employer ?? 0,
      Withholding_Tax: payslipData.withholding_tax ?? 0,
      other_deductions: payslipData.other_deductions ?? 0,
      net_pay: payslipData.net_pay ?? 0,
      status: payslipData.status ?? 'generated',
      created_at: payslipData.created_at ?? '',
      updated_at: payslipData.updated_at ?? '',
    }

    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <PayslipViewer
          item={item}
          employeeName={employeeName ?? employeeId}
          companyName={company?.name ?? 'Company'}
          onDownload={() => window.print()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>
        Back
      </Button>
      <div className="text-center py-12 text-on-surface-variant">
        <p className="text-lg font-medium mb-2">Payslip not found</p>
        <p className="text-sm">No payslip data available for this employee.</p>
      </div>
    </div>
  )
}

export default PayslipPage
