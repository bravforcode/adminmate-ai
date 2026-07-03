import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import {
  createRun,
  calculateRun,
  approveRun,
  getRun,
} from '../../services/payroll/payrollRunService'
import {
  getCycles,
  createCycle,
  closeCycle,
  type PayrollCycle,
} from '../../services/payroll/payrollCycleService'
import {
  Play,
  Calculator,
  CheckCircle,
  XCircle,
  Download,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/shared/LoadingState'
import { PayrollTable } from '../../components/payroll/PayrollTable'
import { BankExport } from '../../components/payroll/BankExport'

export function PayrollRunPage() {
  const { runId } = useParams<{ runId: string }>()
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showNewCycle, setShowNewCycle] = useState(false)
  const [newCycle, setNewCycle] = useState({ name: '', period_start: '', period_end: '' })

  // Fetch cycles
  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['payroll-cycles', company?.id],
    queryFn: () => getCycles(company!.id),
    enabled: !!company?.id && !runId,
  })

  // Fetch run details (when viewing a specific run)
  const { data: runData, isLoading: runLoading } = useQuery({
    queryKey: ['payroll-run', runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  })

  // Create cycle mutation
  const createCycleMutation = useMutation({
    mutationFn: () => createCycle(newCycle),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles', company?.id] })
      toast.success(`Cycle "${data.name}" created`)
      setShowNewCycle(false)
      setNewCycle({ name: '', period_start: '', period_end: '' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Create run mutation
  const createRunMutation = useMutation({
    mutationFn: (cycleId: string) => createRun(cycleId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles', company?.id] })
      toast.success('Payroll run created')
      navigate(`/payroll/run/${data.id}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Calculate mutation
  const calculateMutation = useMutation({
    mutationFn: () => calculateRun(runId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', runId] })
      toast.success('Payroll calculated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => approveRun(runId!, profile?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', runId] })
      toast.success('Payroll approved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Close cycle mutation
  const closeCycleMutation = useMutation({
    mutationFn: (cycleId: string) => closeCycle(cycleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycles', company?.id] })
      toast.success('Cycle closed')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const statusColor = (s: string) => {
    switch (s) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'approved': return 'bg-blue-100 text-blue-700'
      case 'calculated': return 'bg-amber-100 text-amber-700'
      case 'calculating': return 'bg-yellow-100 text-yellow-700'
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // ── Run Detail View ──
  if (runId) {
    if (runLoading) return <LoadingState variant="cards" rows={3} message="Loading payroll run..." />
    if (!runData) return <div className="p-6 text-center text-on-surface-variant">Run not found.</div>

    const { run, items } = runData
    const warnings = (run as unknown as Record<string, unknown>).employees_needing_review as Array<{ employeeId: string; name: string; reason: string }> | undefined

    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/payroll')}>
            Back
          </Button>
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Payroll Run</h1>
            <p className="text-sm text-on-surface-variant">Run ID: {run.id}</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${statusColor(run.status)}`}>
            {run.status}
          </span>
        </div>

        {/* Allowance Gap Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">
                  {warnings.length} employee(s) have unapplied allowances
                </p>
                <ul className="text-xs text-amber-700 space-y-0.5">
                  {warnings.map(w => (
                    <li key={w.employeeId}>{w.name}: {w.reason}</li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 mt-2">
                  Withholding tax may be overstated. Review before approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-on-surface-variant">Total Gross</p>
              <p className="text-xl font-bold">{fmt(run.total_gross)} THB</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-on-surface-variant">Total Deductions</p>
              <p className="text-xl font-bold text-red-600">{fmt(run.total_deductions)} THB</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-on-surface-variant">Total Net</p>
              <p className="text-xl font-bold text-primary">{fmt(run.total_net)} THB</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardContent className="pt-4 flex flex-wrap gap-3">
            {run.status === 'draft' && (
              <Button
                variant="default"
                icon={<Calculator size={16} />}
                onClick={() => calculateMutation.mutate()}
                disabled={calculateMutation.isPending}
              >
                {calculateMutation.isPending ? 'Calculating...' : 'Calculate Payroll'}
              </Button>
            )}
            {run.status === 'calculated' && (
              <>
                <Button
                  variant="default"
                  icon={<CheckCircle size={16} />}
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Approving...' : 'Approve Run'}
                </Button>
                <Button
                  variant="outline"
                  icon={<XCircle size={16} />}
                  onClick={() => {
                    /* reject flow — requires service support */
                    toast.error('Reject flow not yet implemented')
                  }}
                >
                  Reject
                </Button>
              </>
            )}
            {run.status === 'approved' && (
              <Button
                variant="default"
                icon={<Download size={16} />}
                onClick={() => {
                  /* mark as paid */
                  toast.success('Mark as paid — service integration pending')
                }}
              >
                Mark as Paid
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <CardTitle>Employee Details ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <PayrollTable
              items={items}
              onViewPayslip={(empId) => navigate(`/payroll/payslip/${empId}?run=${runId}`)}
            />
          </CardContent>
        </Card>

        {/* Bank Export */}
        {run.status === 'approved' && (
          <BankExport items={items} companyName={company?.name ?? 'Company'} />
        )}
      </div>
    )
  }

  // ── Cycle Selection / Create Run View ──
  if (cyclesLoading) return <LoadingState variant="cards" rows={3} message="Loading cycles..." />

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Run Payroll</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Select a cycle or create a new one</p>
        </div>
        <Button variant="outline" onClick={() => setShowNewCycle(!showNewCycle)}>
          {showNewCycle ? 'Cancel' : 'New Cycle'}
        </Button>
      </div>

      {/* New Cycle Form */}
      {showNewCycle && (
        <Card>
          <CardHeader>
            <CardTitle>Create Payroll Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface-variant">Cycle Name</label>
                <input
                  type="text"
                  value={newCycle.name}
                  onChange={e => setNewCycle(c => ({ ...c, name: e.target.value }))}
                  placeholder="e.g. June 2024"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface-variant">Period Start</label>
                <input
                  type="date"
                  value={newCycle.period_start}
                  onChange={e => setNewCycle(c => ({ ...c, period_start: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-on-surface-variant">Period End</label>
                <input
                  type="date"
                  value={newCycle.period_end}
                  onChange={e => setNewCycle(c => ({ ...c, period_end: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="default"
                onClick={() => createCycleMutation.mutate()}
                disabled={!newCycle.name || !newCycle.period_start || !newCycle.period_end || createCycleMutation.isPending}
              >
                {createCycleMutation.isPending ? 'Creating...' : 'Create Cycle'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Cycles */}
      {cycles && cycles.length > 0 ? (
        <div className="space-y-3">
          {cycles.map((cycle: PayrollCycle) => (
            <Card key={cycle.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{cycle.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {cycle.period_start} — {cycle.period_end}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    cycle.status === 'active' ? 'bg-green-100 text-green-700' :
                    cycle.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {cycle.status}
                  </span>
                  {cycle.status !== 'closed' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        icon={<Play size={14} />}
                        onClick={() => createRunMutation.mutate(cycle.id)}
                        disabled={createRunMutation.isPending}
                      >
                        Run
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => closeCycleMutation.mutate(cycle.id)}
                        disabled={closeCycleMutation.isPending}
                      >
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-on-surface-variant">No payroll cycles yet. Create one to start.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PayrollRunPage
