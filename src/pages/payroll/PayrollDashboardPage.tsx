import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  FileText,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/shared/LoadingState'

export function PayrollDashboardPage() {
  const company = useAuthStore(s => s.company)
  const navigate = useNavigate()

  const { data: summary, isLoading } = useQuery({
    queryKey: ['payroll-dashboard', company?.id],
    queryFn: async () => {
      if (!company?.id) return null

      // Fetch recent runs
      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id, status, total_gross, total_deductions, total_net, created_at, cycle_id')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Fetch pending approvals
      const { data: pendingRuns } = await supabase
        .from('payroll_runs')
        .select('id, total_net, created_at')
        .eq('company_id', company.id)
        .eq('status', 'calculated')

      // Fetch active cycles
      const { data: activeCycles } = await supabase
        .from('payroll_cycles')
        .select('id, name, period_start, period_end, status')
        .eq('company_id', company.id)
        .eq('status', 'active')

      const totalPaid = (runs ?? [])
        .filter(r => r.status === 'paid')
        .reduce((s, r) => s + (r.total_net ?? 0), 0)

      const lastRun = runs?.[0]

      return {
        totalPaid,
        pendingCount: pendingRuns?.length ?? 0,
        pendingTotal: (pendingRuns ?? []).reduce((s, r) => s + (r.total_net ?? 0), 0),
        activeCycles: activeCycles ?? [],
        recentRuns: runs ?? [],
        lastRun,
      }
    },
    enabled: !!company?.id,
  })

  if (isLoading) {
    return <LoadingState variant="cards" rows={3} message="Loading payroll dashboard..." />
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const statusColor = (s: string) => {
    switch (s) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'approved': return 'bg-blue-100 text-blue-700'
      case 'calculated': return 'bg-amber-100 text-amber-700'
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">Payroll Dashboard</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Overview of payroll costs, approvals, and recent runs</p>
        </div>
        <Button variant="default" onClick={() => navigate('/payroll/run')}>
          Run Payroll
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Total Paid (YTD)</p>
                <p className="text-lg font-bold">{fmt(summary?.totalPaid ?? 0)} THB</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Pending Approvals</p>
                <p className="text-lg font-bold">{summary?.pendingCount ?? 0}</p>
                {summary?.pendingTotal ? (
                  <p className="text-xs text-on-surface-variant">{fmt(summary.pendingTotal)} THB</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Last Run Net</p>
                <p className="text-lg font-bold">
                  {summary?.lastRun ? fmt(summary.lastRun.total_net ?? 0) : '—'} THB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CheckCircle size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Active Cycles</p>
                <p className="text-lg font-bold">{summary?.activeCycles.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {summary?.pendingCount ? (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <AlertCircle size={20} className="text-amber-600" />
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-on-surface-variant mb-3">
              {summary.pendingCount} payroll run{summary.pendingCount > 1 ? 's' : ''} awaiting approval
              ({fmt(summary.pendingTotal)} THB total)
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/payroll/run')}>
              Review & Approve <ArrowRight size={14} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent Runs */}
      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <FileText size={20} className="text-primary" />
          <CardTitle>Recent Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.recentRuns.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-6">No payroll runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left py-2 px-3 text-on-surface-variant font-medium">Date</th>
                    <th className="text-left py-2 px-3 text-on-surface-variant font-medium">Status</th>
                    <th className="text-right py-2 px-3 text-on-surface-variant font-medium">Gross</th>
                    <th className="text-right py-2 px-3 text-on-surface-variant font-medium">Deductions</th>
                    <th className="text-right py-2 px-3 text-on-surface-variant font-medium">Net</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {summary?.recentRuns.map(run => (
                    <tr key={run.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low">
                      <td className="py-2 px-3 text-xs">{new Date(run.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(run.status)}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">{fmt(run.total_gross ?? 0)}</td>
                      <td className="py-2 px-3 text-right text-red-600">{fmt(run.total_deductions ?? 0)}</td>
                      <td className="py-2 px-3 text-right font-semibold">{fmt(run.total_net ?? 0)}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => navigate(`/payroll/run/${run.id}`)}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PayrollDashboardPage
