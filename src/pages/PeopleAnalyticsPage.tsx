import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import {
  Users, UserPlus, UserMinus, TrendingDown, TrendingUp,
  BarChart3, PieChart, Clock, DollarSign, Calendar,
  Briefcase, Target, Award, AlertTriangle,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/badge'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../components/ui/select'

interface Employee {
  id: string
  department: string | null
  hire_date: string | null
  termination_date: string | null
  status: string | null
  gender: string | null
  date_of_birth: string | null
  salary: number | null
  contract_type: string | null
}

interface Application {
  id: string
  status: string | null
  source: string | null
  created_at: string
  updated_at: string
  company_id: string
}

interface LeaveRecord {
  id: string
  leave_type: string | null
  start_date: string
  end_date: string
  status: string | null
}

const BAR_COLORS = ['bg-primary', 'bg-tertiary', 'bg-secondary', 'bg-outline', 'bg-surface-dim', 'bg-error', 'bg-tertiary-fixed']
const GENDER_COLORS: Record<string, string> = { Male: 'bg-primary', Female: 'bg-tertiary', Other: 'bg-secondary', Unspecified: 'bg-outline' }

const now = new Date()
const PERIODS = [
  { value: 'ytd', label: 'YTD' },
  { value: 'q1', label: `Q1 ${now.getFullYear()}` },
  { value: 'q2', label: `Q2 ${now.getFullYear()}` },
  { value: 'q3', label: `Q3 ${now.getFullYear()}` },
  { value: 'q4', label: `Q4 ${now.getFullYear()}` },
]

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date()
  if (period === 'ytd') {
    return { start: new Date(now.getFullYear(), 0, 1).toISOString(), end: now.toISOString() }
  }
  const q = parseInt(period.charAt(1))
  const startMonth = (q - 1) * 3
  return {
    start: new Date(now.getFullYear(), startMonth, 1).toISOString(),
    end: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59).toISOString(),
  }
}

function KPICard({ title, value, subtitle, icon: Icon, iconBg, iconColor, trend, trendUp }: {
  title: string; value: string | number; subtitle?: string; icon: typeof Users; iconBg: string; iconColor: string; trend?: string; trendUp?: boolean
}) {
  return (
    <Card className="p-6 hover:border-primary transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
        {trend && (
          <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
            {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-on-surface">{value}</h3>
      <p className="text-sm text-on-surface-variant mt-1">{title}</p>
      {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
    </Card>
  )
}

function BarChartCSS({ data, maxValue }: { data: { label: string; value: number; color?: string }[]; maxValue: number }) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant w-24 truncate">{item.label}</span>
          <div className="flex-1 bg-surface-container-high rounded-full h-5 overflow-hidden">
            <div
              className={cn('h-5 rounded-full transition-all', item.color || BAR_COLORS[i % BAR_COLORS.length])}
              style={{ width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-xs font-semibold text-on-surface w-10 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function HorizontalBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((item, i) => (
        <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-on-surface">{item.value}</span>
          <div className="w-full flex justify-center">
            <div
              className={cn('w-8 rounded-t-md transition-all', item.color || BAR_COLORS[i % BAR_COLORS.length])}
              style={{ height: `${(item.value / max) * 100}%`, minHeight: item.value > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[10px] text-on-surface-variant truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function DonutBar({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-3">
        {data.map((item) => (
          <div
            key={item.label}
            className={cn('h-full transition-all', item.color)}
            style={{ width: total > 0 ? `${(item.value / total) * 100}%` : '0%' }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className={cn('w-2.5 h-2.5 rounded-full', item.color)} />
            {item.label} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
          </div>
        ))}
      </div>
    </div>
  )
}

export function PeopleAnalyticsPage() {
  const { t } = useTranslation(['reports', 'common'])
  const company = useAuthStore(s => s.company)
  const [period, setPeriod] = useState('ytd')
  const { start: dateStart, end: dateEnd } = useMemo(() => getDateRange(period), [period])

  const { data: employees, isLoading: empLoading, isError: empError, refetch: refetchEmp } = useQuery({
    queryKey: ['pa', 'employees', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('employees')
        .select('id, department, hire_date, termination_date, status, gender, date_of_birth, salary, contract_type')
        .eq('company_id', company.id)
      return data || []
    },
    enabled: !!company?.id,
  })

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['pa', 'applications', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('applications')
        .select('id, status, source, created_at, updated_at, company_id')
        .eq('company_id', company.id)
        .gte('created_at', dateStart).lte('created_at', dateEnd)
      return data || []
    },
    enabled: !!company?.id,
  })

  const { data: leaveRecords } = useQuery({
    queryKey: ['pa', 'leave', company?.id, period],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('leave_requests')
        .select('id, leave_type, start_date, end_date, status')
        .eq('company_id', company.id)
        .gte('start_date', dateStart).lte('start_date', dateEnd)
      return data || []
    },
    enabled: !!company?.id,
  })

  const metrics = useMemo(() => {
    if (!employees) return null
    const active = employees.filter((e: Employee) => e.status !== 'terminated')
    const terminated = employees.filter((e: Employee) => e.status === 'terminated')
    const newHires = employees.filter((e: Employee) => {
      if (!e.hire_date) return false
      const hd = new Date(e.hire_date)
      return hd >= new Date(dateStart) && hd <= new Date(dateEnd)
    })
    const turnoverRate = active.length > 0 ? ((terminated.length / (active.length + terminated.length)) * 100).toFixed(1) : '0.0'

    // Demographics
    const genderMap: Record<string, number> = {}
    const deptMap: Record<string, number> = {}
    const ageBuckets: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 }
    active.forEach((e: Employee) => {
      const g = e.gender || 'Unspecified'
      genderMap[g] = (genderMap[g] || 0) + 1
      const d = e.department || 'Unassigned'
      deptMap[d] = (deptMap[d] || 0) + 1
      if (e.date_of_birth) {
        const age = Math.floor((Date.now() - new Date(e.date_of_birth).getTime()) / 31557600000)
        if (age < 26) ageBuckets['18-25']++
        else if (age < 36) ageBuckets['26-35']++
        else if (age < 46) ageBuckets['36-45']++
        else if (age < 56) ageBuckets['46-55']++
        else ageBuckets['56+']++
      }
    })

    // Turnover by department
    const deptTermMap: Record<string, { total: number; terminated: number }> = {}
    employees.forEach((e: Employee) => {
      const d = e.department || 'Unassigned'
      if (!deptTermMap[d]) deptTermMap[d] = { total: 0, terminated: 0 }
      deptTermMap[d].total++
      if (e.status === 'terminated') deptTermMap[d].terminated++
    })

    // Compensation
    const salaries = active.filter((e: Employee) => (e.salary ?? 0) > 0).map((e: Employee) => e.salary as number).sort((a: number, b: number) => a - b)
    const medianSalary = salaries.length > 0 ? salaries[Math.floor(salaries.length / 2)] : 0
    const avgSalary = salaries.length > 0 ? Math.round(salaries.reduce((a: number, b: number) => a + b, 0) / salaries.length) : 0
    const salaryBands: Record<string, number> = { '<30k': 0, '30-50k': 0, '50-75k': 0, '75-100k': 0, '100k+': 0 }
    salaries.forEach((s: number) => {
      if (s < 30000) salaryBands['<30k']++
      else if (s < 50000) salaryBands['30-50k']++
      else if (s < 75000) salaryBands['50-75k']++
      else if (s < 100000) salaryBands['75-100k']++
      else salaryBands['100k+']++
    })

    // Hiring pipeline
    const hired = applications?.filter((a: Application) => a.status === 'hired') || []
    const rejected = applications?.filter((a: Application) => a.status === 'rejected') || []
    const avgDaysToHire = hired.length > 0
      ? Math.round(hired.reduce((sum: number, a: Application) => sum + (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 86400000, 0) / hired.length)
      : 0
    const acceptanceRate = applications?.length ? ((hired.length / applications.length) * 100).toFixed(1) : '0.0'
    const sourceMap: Record<string, number> = {}
    applications?.forEach((a: Application) => {
      const s = a.source || 'Other'
      sourceMap[s] = (sourceMap[s] || 0) + 1
    })

    // Absence
    const approvedLeaves = leaveRecords?.filter((l: LeaveRecord) => l.status === 'approved') || []
    const sickLeaves = approvedLeaves.filter((l: LeaveRecord) => l.leave_type === 'sick')
    const absenceRate = active.length > 0 ? ((approvedLeaves.length / (active.length * 260)) * 100).toFixed(1) : '0.0'

    return {
      totalEmployees: employees.length,
      activeCount: active.length,
      newHires: newHires.length,
      departures: terminated.length,
      turnoverRate,
      genderMap,
      deptMap,
      ageBuckets,
      deptTermMap,
      medianSalary,
      avgSalary,
      salaryBands,
      totalSalaries: salaries.length,
      totalApps: applications?.length || 0,
      hiredCount: hired.length,
      rejectedCount: rejected.length,
      avgDaysToHire,
      acceptanceRate,
      sourceMap,
      approvedLeaves: approvedLeaves.length,
      sickLeaves: sickLeaves.length,
      absenceRate,
    }
  }, [employees, applications, leaveRecords, dateStart, dateEnd])

  const isLoading = empLoading || appsLoading
  const hasError = empError

  if (hasError) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('people_analytics.title', 'People Analytics')}</h1>
        </header>
        <ErrorState title={t('common:errors.load_failed')} onRetry={refetchEmp} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('people_analytics.title', 'People Analytics')}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{t('people_analytics.subtitle', 'Workforce metrics and insights')}</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {isLoading ? (
        <LoadingState variant="cards" rows={4} message={t('common:loading')} />
      ) : !metrics ? (
        <EmptyState icon={Users} title={t('people_analytics.empty', 'No employee data')} description={t('people_analytics.empty_desc', 'Add employees to see analytics')} />
      ) : (
        <>
          {/* Headcount Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title={t('pa.total_employees', 'Total Employees')} value={metrics.totalEmployees} icon={Users} iconBg="bg-primary/10" iconColor="text-primary" />
            <KPICard title={t('pa.new_hires', 'New Hires')} value={metrics.newHires} subtitle={t('pa.this_period', 'This period')} icon={UserPlus} iconBg="bg-green-50" iconColor="text-green-600" trend={`${metrics.newHires}`} trendUp={metrics.newHires > 0} />
            <KPICard title={t('pa.departures', 'Departures')} value={metrics.departures} icon={UserMinus} iconBg="bg-red-50" iconColor="text-red-600" />
            <KPICard title={t('pa.turnover_rate', 'Turnover Rate')} value={`${metrics.turnoverRate}%`} icon={TrendingDown} iconBg="bg-orange-50" iconColor="text-orange-600" trend={parseFloat(metrics.turnoverRate) > 15 ? 'High' : 'Normal'} trendUp={parseFloat(metrics.turnoverRate) <= 15} />
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><PieChart size={18} /> {t('pa.gender_dist', 'Gender Distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutBar
                  total={metrics.activeCount}
                  data={Object.entries(metrics.genderMap).map(([label, value]) => ({
                    label, value, color: GENDER_COLORS[label] || 'bg-outline',
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><BarChart3 size={18} /> {t('pa.age_dist', 'Age Distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={Object.entries(metrics.ageBuckets).map(([label, value]) => ({ label, value }))} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Briefcase size={18} /> {t('pa.dept_breakdown', 'Department Breakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartCSS
                  maxValue={Math.max(...Object.values(metrics.deptMap), 1)}
                  data={Object.entries(metrics.deptMap)
                    .sort(([, a], [, b]) => b - a)
                    .map(([label, value]) => ({ label, value }))}
                />
              </CardContent>
            </Card>
          </div>

          {/* Turnover Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle size={18} /> {t('pa.turnover_analysis', 'Turnover by Department')}</CardTitle>
              <CardDescription>{t('pa.turnover_desc', 'Retention rate per department')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(metrics.deptTermMap).map(([dept, data]) => {
                  const retentionRate = data.total > 0 ? (((data.total - data.terminated) / data.total) * 100).toFixed(1) : '100.0'
                  return (
                    <div key={dept} className="p-4 rounded-lg border border-outline-variant bg-surface-container-low">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-on-surface">{dept}</span>
                        <Badge variant={parseFloat(retentionRate) >= 90 ? 'default' : 'destructive'}>
                          {retentionRate}% retained
                        </Badge>
                      </div>
                      <div className="w-full bg-surface-container-high rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${retentionRate}%` }} />
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">{data.total} total · {data.terminated} left</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Hiring Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Clock size={18} /> {t('pa.hiring_pipeline', 'Hiring Pipeline')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-surface-container-low text-center">
                    <p className="text-2xl font-bold text-on-surface">{metrics.avgDaysToHire}</p>
                    <p className="text-xs text-on-surface-variant">{t('pa.avg_days_hire', 'Avg Days to Hire')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low text-center">
                    <p className="text-2xl font-bold text-on-surface">{metrics.acceptanceRate}%</p>
                    <p className="text-xs text-on-surface-variant">{t('pa.offer_acceptance', 'Offer Acceptance')}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-on-surface-variant">Total Applications</span><span className="font-semibold">{metrics.totalApps}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Hired</span><span className="font-semibold text-green-600">{metrics.hiredCount}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Rejected</span><span className="font-semibold text-red-600">{metrics.rejectedCount}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Target size={18} /> {t('pa.source_effectiveness', 'Source Effectiveness')}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartCSS
                  maxValue={Math.max(...Object.values(metrics.sourceMap), 1)}
                  data={Object.entries(metrics.sourceMap)
                    .sort(([, a], [, b]) => b - a)
                    .map(([label, value]) => ({ label, value }))}
                />
              </CardContent>
            </Card>
          </div>

          {/* Compensation Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><DollarSign size={18} /> {t('pa.compensation', 'Compensation Overview')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-surface-container-low text-center">
                    <p className="text-2xl font-bold text-on-surface">${metrics.avgSalary.toLocaleString()}</p>
                    <p className="text-xs text-on-surface-variant">{t('pa.avg_salary', 'Avg Salary')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low text-center">
                    <p className="text-2xl font-bold text-on-surface">${metrics.medianSalary.toLocaleString()}</p>
                    <p className="text-xs text-on-surface-variant">{t('pa.median_salary', 'Median Salary')}</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant mb-2">Based on {metrics.totalSalaries} employees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Award size={18} /> {t('pa.salary_bands', 'Salary Distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={Object.entries(metrics.salaryBands).map(([label, value]) => ({ label, value }))} />
              </CardContent>
            </Card>
          </div>

          {/* Absence Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Calendar size={18} /> {t('pa.absence', 'Absence Analytics')}</CardTitle>
              <CardDescription>{t('pa.absence_desc', 'Leave utilization and trends')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-outline-variant bg-surface-container-low text-center">
                  <p className="text-2xl font-bold text-on-surface">{metrics.absenceRate}%</p>
                  <p className="text-xs text-on-surface-variant">{t('pa.absence_rate', 'Absence Rate')}</p>
                </div>
                <div className="p-4 rounded-lg border border-outline-variant bg-surface-container-low text-center">
                  <p className="text-2xl font-bold text-on-surface">{metrics.approvedLeaves}</p>
                  <p className="text-xs text-on-surface-variant">{t('pa.approved_leaves', 'Approved Leaves')}</p>
                </div>
                <div className="p-4 rounded-lg border border-outline-variant bg-surface-container-low text-center">
                  <p className="text-2xl font-bold text-orange-600">{metrics.sickLeaves}</p>
                  <p className="text-xs text-on-surface-variant">{t('pa.sick_leaves', 'Sick Leaves')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default PeopleAnalyticsPage
