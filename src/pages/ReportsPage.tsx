import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { FileDown, TrendingUp, TrendingDown, Gauge, DollarSign, UserCheck, ListFilter, ExternalLink } from 'lucide-react'
import { PIPELINE_STAGES } from '../utils/constants'
import { cn } from '../utils/cn'

const CHART_COLORS = ['#003d9a', '#455e91', '#00418a', '#737685', '#b2c5ff', '#aec6ff', '#dae2ff']

interface KPICardProps {
  title: string
  subtitle: string
  value: string
  unit: string
  icon: any
  iconBg: string
  iconColor: string
  trend: string
  trendUp: boolean
  trendBg: string
  trendColor: string
  progress?: number
}

function KPICard({ title, subtitle, value, unit, icon: Icon, iconBg, iconColor, trend, trendUp, trendBg, trendColor, progress }: KPICardProps) {
  return (
    <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm hover:border-primary transition-colors duration-300">
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
      <p className="text-sm text-on-surface-variant mb-4">{subtitle}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary">{value}</span>
        <span className="text-sm text-on-surface-variant">{unit}</span>
      </div>
      {typeof progress === 'number' && (
        <>
          <div className="w-full bg-surface-container-high rounded-full h-2.5 mt-4 mb-2">
            <div className="bg-tertiary h-2.5 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Completion</span>
            <span className="text-tertiary font-bold">{progress}%</span>
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

const formatNumber = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)

export function ReportsPage() {
  const { t } = useTranslation(['reports', 'common'])
  const navigate = useNavigate()
  const company = useAuthStore(s => s.company)
  const [activePeriod, setActivePeriod] = useState(PERIODS[0])

  const { data: pipeline } = useQuery({
    queryKey: ['reports', 'pipeline', company?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_pipeline_counts', { p_company_id: company?.id })
      return data || {}
    },
    enabled: !!company?.id,
  })

  const { data: kpis } = useQuery({
    queryKey: ['reports', 'kpis', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const [hiredApps, totalApps, totalChecklists, completedChecklists] = await Promise.all([
        supabase.from('applications').select('id, created_at, updated_at', { count: 'exact' }).eq('company_id', company.id).eq('status', 'hired'),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
        supabase.from('onboarding_checklists').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
        supabase.from('onboarding_checklists').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'completed'),
      ])
      const hired = hiredApps.data || []
      const avgDays = hired.length > 0
        ? Math.round(hired.reduce((sum: number, app: any) => {
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

  const pipelineData = PIPELINE_STAGES.map(s => ({
    name: t(s.labelKey, { ns: 'recruitment', defaultValue: s.labelKey }),
    value: (pipeline as any)?.[s.id] || 0,
  }))

  const avgDays = kpis?.avgDaysToHire || 0
  const costPerHire = kpis?.hiredCount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Math.round((kpis.totalApps * 150) / Math.max(kpis.hiredCount, 1)))
    : '$0'
  const completionRate = kpis?.totalChecklists ? Math.round((kpis.completedChecklists / kpis.totalChecklists) * 100) : 0

  const sourceBreakdown = candidates?.reduce((acc: Record<string, number>, c: any) => {
    const source = c.source || 'Other'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const totalSources = Object.values(sourceBreakdown).reduce((a: number, b: number) => a + b, 0)
  const sourceColors = ['bg-primary', 'bg-tertiary', 'bg-secondary', 'bg-outline', 'bg-surface-dim']
  const sourceEntries = Object.entries(sourceBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const handleExportCSV = () => {
    const headers = ['Stage', 'Count']
    const rows = pipelineData.map((d: any) => `${d.name},${d.value}`)
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pipeline-report-${activePeriod.replace(/\s/g, '-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('title')}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-surface rounded-full p-1 border border-outline-variant shadow-sm">
          {PERIODS.map(period => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-semibold transition-colors',
                activePeriod === period ? 'bg-surface-container-low text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
              )}
            >
              {period}
            </button>
          ))}
          <div className="w-px h-4 bg-outline-variant mx-1" />
          <button className="flex items-center gap-1 px-3 py-2 text-on-surface-variant hover:text-primary transition-colors">
            <ListFilter size={16} />
            <span className="text-xs font-semibold hidden md:inline">{t('filters', { ns: 'common' })}</span>
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title={t('kpi.recruitment_efficiency')}
          subtitle={t('kpi.recruitment_efficiency_sub')}
          value={avgDays ? String(avgDays) : '-'}
          unit={t('kpi.days')}
          icon={Gauge}
          iconBg="bg-primary-fixed"
          iconColor="text-primary"
          trend={kpis?.hiredCount ? `${kpis.hiredCount} hired` : 'No data'}
          trendUp
          trendBg="bg-surface-container-low"
          trendColor="text-primary"
        />
        <KPICard
          title={t('kpi.cost_per_hire')}
          subtitle={t('kpi.cost_per_hire_sub')}
          value={costPerHire}
          unit={t('kpi.avg')}
          icon={DollarSign}
          iconBg="bg-error-container"
          iconColor="text-error"
          trend={`${kpis?.hiredCount || 0} hires`}
          trendUp={false}
          trendBg="bg-error-container"
          trendColor="text-error"
        />
        <KPICard
          title={t('kpi.onboarding_success')}
          subtitle={t('kpi.onboarding_success_sub')}
          value={kpis?.totalChecklists ? `${completionRate}%` : '-'}
          unit={t('kpi.completion')}
          icon={UserCheck}
          iconBg="bg-tertiary-fixed"
          iconColor="text-tertiary"
          trend={kpis?.totalChecklists ? `${kpis.completedChecklists}/${kpis.totalChecklists}` : 'No data'}
          trendUp
          trendBg="bg-surface-container-low"
          trendColor="text-tertiary"
          progress={completionRate || 0}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface rounded-xl p-6 border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-on-background">{t('chart.pipeline_title')}</h3>
              <p className="text-sm text-on-surface-variant">{t('chart.pipeline_subtitle')}</p>
            </div>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-sm hover:bg-surface-container-low transition-colors">
              <FileDown size={16} /> {t('export_csv', { ns: 'common', defaultValue: 'Export CSV' })}
            </button>
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

        <div className="lg:col-span-4 bg-surface rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-on-background mb-1">{t('breakdown.title')}</h3>
          <p className="text-sm text-on-surface-variant mb-6">{t('breakdown.subtitle')}</p>
          <div className="flex-1 flex flex-col justify-center gap-5">
            {totalSources > 0 ? sourceEntries.map(([label, count], i) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className="text-on-background flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', sourceColors[i % sourceColors.length])} />
                    {label}
                  </span>
                  <span className="font-bold text-on-surface">{Math.round((count / totalSources) * 100)}%</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-1.5">
                  <div className={cn('h-1.5 rounded-full', sourceColors[i % sourceColors.length])} style={{ width: `${(count / totalSources) * 100}%` }} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-on-surface-variant text-center">No candidate source data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Generated Reports Table */}
      <div className="bg-surface rounded-xl p-6 border border-outline-variant shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-on-background">{t('table.title')}</h3>
            <p className="text-sm text-on-surface-variant">{t('table.subtitle')}</p>
          </div>
          <button onClick={() => navigate('/documents')} className="text-xs font-semibold text-primary hover:underline">{t('view_all')}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                <th className="pb-3 font-semibold">{t('table.report_name')}</th>
                <th className="pb-3 font-semibold">{t('table.category')}</th>
                <th className="pb-3 font-semibold">{t('table.date')}</th>
                <th className="pb-3 font-semibold text-right">{t('table.action')}</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-background">
              {documents && documents.length > 0 ? documents.map((doc: any) => (
                <tr key={doc.id} className="border-b border-surface-container hover:bg-surface-container-low transition-colors group cursor-pointer">
                  <td className="py-3 flex items-center gap-2">
                    <ExternalLink size={16} className="text-outline" />
                    {doc.candidates?.full_name || 'Document'} — {doc.document_type?.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3">
                    <span className="bg-surface-container px-2 py-1 rounded text-xs">{doc.document_type?.split('_')[0] || 'General'}</span>
                  </td>
                  <td className="py-3 text-on-surface-variant">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}</td>
                  <td className="py-3 text-right">
                    <ExternalLink size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity inline-block" />
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-8 text-center text-on-surface-variant">No documents found. Create an offer to generate documents.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
