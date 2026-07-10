import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { FileDown, TrendingUp, TrendingDown, Gauge, DollarSign, UserCheck, ListFilter, ExternalLink, FileX, Calendar, Clock, Zap } from 'lucide-react'
import { PIPELINE_STAGES } from '../utils/constants'
import { cn } from '../lib/utils'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { ReportScheduler, ScheduleList } from '../components/reports/ReportScheduler'
import { Button } from '../components/ui/Button'
import { InlineGate } from '../components/shared/SubscriptionGate'
import { reportService } from '../services/reportService'
import type { ReportType } from '../utils/reportGenerator'

const CHART_COLORS = ['#003d9a', '#455e91', '#00418a', '#737685', '#b2c5ff', '#aec6ff', '#dae2ff']

import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  subtitle: string
  value: string
  unit: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  trend: string
  trendUp: boolean
  trendBg: string
  trendColor: string
  progress?: number
}

function KPICard({ title, subtitle, value, unit, icon: Icon, iconBg, iconColor, trend, trendUp, trendBg, trendColor, progress }: KPICardProps) {
  const { t } = useTranslation()
  return (
    <div className="bg-surface rounded-xl p-6 border border-border shadow-sm hover:border-primary dark:hover:border-primary transition-colors duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
        <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full', trendBg, trendColor)}>
          {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trend}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-on-background mb-1">{title}</h3>
      <p className="text-sm text-ink-muted text-ink-muted mb-4">{subtitle}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary dark:text-primary-muted">{value}</span>
        <span className="text-sm text-ink-muted text-ink-muted">{unit}</span>
      </div>
      {typeof progress === 'number' && (
        <>
          <div className="w-full bg-surface-sunken rounded-full h-2.5 mt-4 mb-2">
            <div className="bg-tertiary h-2.5 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted text-ink-muted">{t('reports.completion', 'Completion')}</span>
            <span className="text-ink-faint font-bold">{progress}%</span>
          </div>
        </>
      )}
    </div>
  )
}

const now = new Date()
const currentYear = now.getFullYear()
const currentQuarter = Math.floor(now.getMonth() / 3) + 1
const PERIODS = [
  `Q${currentQuarter} ${currentYear}`,
  `Q${currentQuarter - 1 || 4} ${currentQuarter === 1 ? currentYear - 1 : currentYear}`,
  'YTD',
]

const REPORT_TYPE_OPTIONS: { value: ReportType; labelKey: string; icon: LucideIcon }[] = [
  { value: 'hiring_summary', labelKey: 'scheduling.type_hiring_summary', icon: UserCheck },
  { value: 'pipeline_analysis', labelKey: 'scheduling.type_pipeline_analysis', icon: Gauge },
  { value: 'time_to_hire', labelKey: 'scheduling.type_time_to_hire', icon: Clock },
  { value: 'source_effectiveness', labelKey: 'scheduling.type_source_effectiveness', icon: Zap },
  { value: 'onboarding_progress', labelKey: 'scheduling.type_onboarding_progress', icon: TrendingUp },
]

export function ReportsPage() {
  const { t } = useTranslation(['reports', 'common'])
  const navigate = useNavigate()
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()
  const [activePeriod, setActivePeriod] = useState(PERIODS[0])
  const [showScheduler, setShowScheduler] = useState(false)
  const [generatingType, setGeneratingType] = useState<ReportType | null>(null)

  const getDateRange = (period: string) => {
    const now = new Date()
    if (period.startsWith('Q')) {
      const q = parseInt(period.charAt(1))
      const year = parseInt(period.slice(3))
      const startMonth = (q - 1) * 3
      const start = new Date(year, startMonth, 1)
      const end = new Date(year, startMonth + 3, 0, 23, 59, 59)
      return { start: start.toISOString(), end: end.toISOString() }
    }
    const start = new Date(now.getFullYear(), 0, 1)
    return { start: start.toISOString(), end: now.toISOString() }
  }

  const { start: dateStart, end: dateEnd } = getDateRange(activePeriod)

  const { data: pipeline, isLoading: pipelineLoading, isError: pipelineError, refetch: refetchPipeline } = useQuery({
    queryKey: ['reports', 'pipeline', company?.id, activePeriod],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_pipeline_counts', { p_company_id: company?.id })
      return data || {}
    },
    enabled: !!company?.id,
  })

  const { data: kpis, isLoading: kpisLoading, isError: kpisError, refetch: refetchKpis } = useQuery({
    queryKey: ['reports', 'kpis', company?.id, activePeriod],
    queryFn: async () => {
      if (!company?.id) return null
      const [hiredApps, totalApps, totalChecklists, completedChecklists] = await Promise.all([
        supabase.from('applications').select('id, created_at, updated_at', { count: 'exact' }).eq('company_id', company.id).eq('status', 'hired').gte('created_at', dateStart).lte('created_at', dateEnd),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', dateStart).lte('created_at', dateEnd),
        supabase.from('onboarding_checklists').select('id', { count: 'exact', head: true }).eq('company_id', company.id).gte('created_at', dateStart).lte('created_at', dateEnd),
        supabase.from('onboarding_checklists').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'completed').gte('created_at', dateStart).lte('created_at', dateEnd),
      ])
      const hired = hiredApps.data || []
      const avgDays = hired.length > 0
        ? Math.round(hired.reduce((sum: number, app: { created_at: string; updated_at: string }) => {
            const created = new Date(app.created_at).getTime()
            const updated = new Date(app.updated_at).getTime()
            return sum + (updated - created) / (1000 * 60 * 60 * 24)
          }, 0) / hired.length)
        : 0
      return {
        hiredCount: hiredApps.count || 0,
        totalApps: totalApps.count || 0,
        totalChecklists: totalChecklists.count || 0,
        completedChecklists: completedChecklists.count || 0,
        avgDaysToHire: avgDays,
      }
    },
    enabled: !!company?.id,
  })

  const { data: documents } = useQuery({
    queryKey: ['reports', 'documents', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('documents').select('*, candidates(full_name)').eq('company_id', company.id).order('created_at', { ascending: false }).limit(10)
      return data || []
    },
    enabled: !!company?.id,
  })

  const { data: candidates } = useQuery({
    queryKey: ['reports', 'candidates', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('candidates').select('source').eq('company_id', company.id)
      return data || []
    },
    enabled: !!company?.id,
  })

  const { data: generatedReports = [] } = useQuery({
    queryKey: ['generatedReports', company?.id],
    queryFn: () => company?.id ? reportService.getGeneratedReports(company.id, 5) : [],
    enabled: !!company?.id,
  })

  const generateNowMutation = useMutation({
    mutationFn: (reportType: ReportType) => {
      if (!company?.id) throw new Error('No company')
      const range = getDateRange(activePeriod)
      return reportService.generateReport(company.id, reportType, range, profile?.id)
    },
    onMutate: (reportType) => setGeneratingType(reportType),
    onSettled: () => setGeneratingType(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generatedReports'] })
    },
  })

  const pipelineData = useMemo(() => PIPELINE_STAGES.map(s => ({
    name: t(s.labelKey, { ns: 'recruitment', defaultValue: s.labelKey }),
    value: (pipeline as Record<string, number>)?.[s.id] || 0,
  })), [pipeline, t])

  const avgDays = kpis?.avgDaysToHire || 0
  const costPerHire = kpis?.hiredCount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Math.round((kpis.totalApps * 150) / Math.max(kpis.hiredCount, 1)))
    : '$0'
  const completionRate = kpis?.totalChecklists ? Math.round((kpis.completedChecklists / kpis.totalChecklists) * 100) : 0

  const sourceBreakdown = useMemo(() => candidates?.reduce((acc: Record<string, number>, c: { source?: string }) => {
    const source = c.source || 'Other'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}, [candidates])

  const totalSources = useMemo(() => Object.values(sourceBreakdown).reduce((a: number, b: number) => a + b, 0), [sourceBreakdown])
  const sourceColors = ['bg-primary', 'bg-tertiary', 'bg-secondary', 'bg-outline', 'bg-surface-sunken']
  const sourceEntries = useMemo(() => Object.entries(sourceBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5), [sourceBreakdown])

  const handlePeriodChange = useCallback((period: string) => setActivePeriod(period), [])

  const handleExportCSV = () => {
    const headers = ['Stage', 'Count']
    const rows = pipelineData.map((d: { name: string; value: number }) => `${d.name},${d.value}`)
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pipeline-report-${activePeriod.replace(/\s/g, '-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const handleGenerateNow = (reportType: ReportType) => {
    generateNowMutation.mutate(reportType)
  }

  const isInitialLoading = (pipelineLoading || kpisLoading) && !pipeline && !kpis
  const hasError = pipelineError || kpisError

  if (hasError) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('title')}</h1>
            <p className="text-body-md text-ink-muted mt-1">{t('subtitle')}</p>
          </div>
        </header>
        <ErrorState
          title={t('common:errors.load_failed')}
          onRetry={() => { refetchPipeline(); refetchKpis() }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showScheduler && <ReportScheduler onClose={() => setShowScheduler(false)} />}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background text-ink">{t('title')}</h1>
          <p className="text-body-md text-ink-muted text-ink-muted mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <InlineGate feature="customReports">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowScheduler(true)}
              icon={<Calendar size={16} />}
            >
              {t('scheduling.schedule_report')}
            </Button>
          </InlineGate>
          <div className="flex items-center gap-1 bg-surface rounded-full p-1 border border-border shadow-sm">
            {PERIODS.map(period => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-semibold transition-colors',
                  activePeriod === period ? 'bg-surface-sunken text-primary dark:text-primary-muted' : 'text-ink-muted text-ink-muted hover:bg-surface-sunken dark:hover:bg-surface-sunken'
                )}
              >
                {period}
              </button>
            ))}
            <div className="w-px h-4 bg-outline-variant mx-1" />
            <Button variant="ghost" size="sm" icon={<ListFilter size={16} />}>{t('filters', { ns: 'common' })}</Button>
          </div>
        </div>
      </header>

      <ScheduleList onGenerateNow={handleGenerateNow} generatingType={generatingType} />

      <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-on-background text-ink">{t('scheduling.generate_now_title')}</h3>
          <p className="text-sm text-ink-muted text-ink-muted">{t('scheduling.generate_now_sub')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleGenerateNow(opt.value)}
              disabled={generatingType === opt.value}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary dark:hover:border-primary hover:bg-surface-sunken dark:hover:bg-surface-sunken transition-all group disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <opt.icon size={18} className="text-primary group-hover:text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-on-background text-ink">{t(opt.labelKey)}</p>
                <p className="text-xs text-ink-muted text-ink-muted">
                  {generatingType === opt.value ? t('scheduling.generating') : t('scheduling.click_to_generate')}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {generatedReports.length > 0 && (
        <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-on-background text-ink">{t('scheduling.recent_reports')}</h3>
              <p className="text-sm text-ink-muted text-ink-muted">{t('scheduling.recent_reports_sub')}</p>
            </div>
          </div>
          <div className="space-y-2">
            {generatedReports.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-surface-container last:border-0">
                <div className="flex items-center gap-3">
                  <FileDown size={16} className="text-outline dark:text-outline-variant" />
                  <div>
                    <p className="text-sm font-medium text-on-background text-ink">{r.title}</p>
                    <p className="text-xs text-ink-muted text-ink-muted">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <Button variant="link" size="xs" onClick={() => reportService.downloadReport(r, 'html')}>{t('scheduling.download')}</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isInitialLoading ? (
        <LoadingState variant="cards" rows={3} message={t('common:loading')} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title={t('kpi.recruitment_efficiency')}
              subtitle={t('kpi.recruitment_efficiency_sub')}
              value={avgDays ? String(avgDays) : '-'}
              unit={t('kpi.days')}
              icon={Gauge}
              iconBg="bg-primary-fixed"
              iconColor="text-primary"
              trend={kpis?.hiredCount ? t('kpi.hired', { count: kpis.hiredCount }) : t('kpi.no_data')}
              trendUp
              trendBg="bg-surface-sunken"
              trendColor="text-primary"
            />
            <KPICard
              title={t('kpi.cost_per_hire')}
              subtitle={t('kpi.cost_per_hire_sub')}
              value={costPerHire}
              unit={t('kpi.avg')}
              icon={DollarSign}
              iconBg="bg-destructive-subtle"
              iconColor="text-destructive"
              trend={t('kpi.hires', { count: kpis?.hiredCount || 0 })}
              trendUp={false}
              trendBg="bg-destructive-subtle"
              trendColor="text-destructive"
            />
            <KPICard
              title={t('kpi.onboarding_success')}
              subtitle={t('kpi.onboarding_success_sub')}
              value={kpis?.totalChecklists ? `${completionRate}%` : '-'}
              unit={t('kpi.completion')}
              icon={UserCheck}
              iconBg="bg-tertiary-fixed"
              iconColor="text-ink-faint"
              trend={kpis?.totalChecklists ? `${kpis.completedChecklists}/${kpis.totalChecklists}` : t('kpi.no_data')}
              trendUp
              trendBg="bg-surface-sunken"
              trendColor="text-ink-faint"
              progress={completionRate || 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-surface rounded-xl p-6 border border-border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-on-background text-ink">{t('chart.pipeline_title')}</h3>
                  <p className="text-sm text-ink-muted text-ink-muted">{t('chart.pipeline_subtitle')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV} icon={<FileDown size={16} />}>
                  {t('export_csv', { ns: 'common', defaultValue: 'Export CSV' })}
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pipelineData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {pipelineData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-4 bg-surface rounded-xl p-6 border border-border shadow-sm flex flex-col">
              <h3 className="text-lg font-semibold text-on-background mb-1">{t('breakdown.title')}</h3>
              <p className="text-sm text-ink-muted text-ink-muted mb-6">{t('breakdown.subtitle')}</p>
              <div className="flex-1 flex flex-col justify-center gap-5">
                {totalSources > 0 ? sourceEntries.map(([label, count], i) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className="text-on-background flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', sourceColors[i % sourceColors.length])} />
                        {label}
                      </span>
                      <span className="font-bold text-ink text-ink">{Math.round((count / totalSources) * 100)}%</span>
                    </div>
                    <div className="w-full bg-surface-sunken rounded-full h-1.5">
                      <div className={cn('h-1.5 rounded-full', sourceColors[i % sourceColors.length])} style={{ width: `${(count / totalSources) * 100}%` }} />
                    </div>
                  </div>
                )                ) : (
                  <p className="text-sm text-ink-muted text-ink-muted text-center">{t('no_data')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-6 border border-border shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-on-background text-ink">{t('table.title')}</h3>
                <p className="text-sm text-ink-muted text-ink-muted">{t('table.subtitle')}</p>
              </div>
              <Button variant="link" size="xs" onClick={() => navigate('/documents')}>{t('view_all')}</Button>
            </div>
            <div className="table-responsive overflow-x-auto -mx-6 px-6">
              <table role="table" className="w-full text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-surface-sunken bg-surface-sunken/50 border-b border-border/50 border-border/50">
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-ink-muted">{t('table.report_name')}</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-ink-muted">{t('table.category')}</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-ink-muted">{t('table.date')}</th>
                    <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-ink-muted text-right">{t('table.action')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-ink text-ink">
                  {documents && documents.length > 0 ? documents.map((doc: { id: string; document_type?: string; created_at?: string; candidates?: { full_name?: string } }) => (
                    <tr key={doc.id} className="border-b border-border/50 border-border/50 hover:bg-surface-sunken/50 dark:hover:bg-surface-sunken/30 transition-colors duration-150 group cursor-pointer">
                      <td className="py-3 px-4 text-sm text-ink flex items-center gap-2">
                        <ExternalLink size={16} className="text-outline dark:text-outline-variant" />
                        {doc.candidates?.full_name || 'Document'} — {doc.document_type?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-sm text-ink text-ink">
                        <span className="bg-surface-sunken px-2 py-1 rounded text-xs text-ink">{doc.document_type?.split('_')[0] || 'General'}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-ink text-ink-muted">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4 text-sm text-ink text-right">
                        <ExternalLink size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-block" />
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <EmptyState
                          icon={FileX}
                          title={t('empty.reports_title')}
                          description={t('empty.reports_description')}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ReportsPage
