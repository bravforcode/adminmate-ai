import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { exportService, type ExportJob } from '../../services/importExport/exportService'
import { Download, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/badge'
import { Spinner } from '../../components/ui/Spinner'

type EntityType = 'employees' | 'candidates' | 'jobs'

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  generating: 'default',
  completed: 'default',
  failed: 'destructive',
}

export function ExportPage() {
  const { t } = useTranslation(['common'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()

  const [entityType, setEntityType] = useState<EntityType>('employees')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [exporting, setExporting] = useState(false)

  const { data: exportHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['exports', company?.id],
    queryFn: () => company?.id ? exportService.getCompanyExports(company.id) : Promise.resolve([]),
    enabled: !!company?.id,
  })

  const handleExport = async () => {
    if (!company?.id || !profile?.id) return
    setExporting(true)
    try {
      const filters: Record<string, unknown> = {}
      if (dateFrom || dateTo) {
        filters.created_at = { ...(dateFrom && { min: dateFrom }), ...(dateTo && { max: dateTo }) }
      }
      if (statusFilter) filters.status = statusFilter

      const job = await exportService.createExportJob(company.id, entityType, filters, profile.id)
      await exportService.executeExport(job.id)
      queryClient.invalidateQueries({ queryKey: ['exports'] })
    } finally {
      setExporting(false)
    }
  }

  const handleDownload = (url: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background text-ink">{t('export_data.title')}</h1>
          <p className="text-body-md text-ink-muted text-ink-muted mt-1">{t('export_data.subtitle')}</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('export_data.configure')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-ink text-ink">{t('export_data.entity_type')}</label>
            <div className="flex gap-3">
              {(['employees', 'candidates', 'jobs'] as EntityType[]).map(type => (
                <Button
                  key={type}
                  variant={entityType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEntityType(type)}
                >
                  {t(`export_data.entity.${type}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-ink text-ink">{t('export_data.date_from')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-ink text-ink">{t('export_data.date_to')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-ink text-ink">{t('export_data.status')}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">{t('export_data.all')}</option>
                <option value="active">{t('export_data.active')}</option>
                <option value="inactive">{t('export_data.inactive')}</option>
                <option value="pending">{t('export_data.pending')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              loading={exporting}
              icon={<Download size={16} />}
            >
              {exporting ? t('export_data.exporting') : t('export_data.export')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-surface-container-high bg-surface-raised bg-surface-sunken">
          <CardTitle className="text-lg">{t('export_data.history')}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border/50 border-border/50">
                <th className="px-4 py-3 text-left font-medium text-ink-muted">{t('export_data.table.entity')}</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted">{t('export_data.table.status')}</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted">{t('export_data.table.date')}</th>
                <th className="px-4 py-3 text-left font-medium text-ink-muted">{t('export_data.table.download')}</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr><td colSpan={4} className="py-8 text-center"><Spinner size={24} className="mx-auto" /></td></tr>
              ) : exportHistory.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-ink-muted">{t('export_data.no_history')}</td></tr>
              ) : (
                exportHistory.map((job: ExportJob) => (
                  <tr key={job.id} className="border-b border-border/30 border-border/30 hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-4 py-3 capitalize">{job.entity_type}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadgeVariant[job.status] ?? 'secondary'}>{job.status}</Badge></td>
                    <td className="px-4 py-3 text-ink-muted">{new Date(job.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {job.status === 'completed' && job.file_url ? (
                        <Button variant="ghost" size="icon_sm" onClick={() => handleDownload(job.file_url!)} icon={<Download size={16} />}>
                        </Button>
                      ) : job.status === 'generating' ? (
                        <Loader2 size={16} className="animate-spin text-primary" />
                      ) : job.status === 'completed' ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default ExportPage
