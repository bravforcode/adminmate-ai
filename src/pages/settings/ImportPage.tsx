import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { useAuthStore } from '../../stores/authStore'
import { importService, type ImportJob, type ImportError } from '../../services/importExport/importService'
import { parseCSV } from '../../utils/csvParser'
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/badge'
import { Spinner } from '../../components/ui/Spinner'
import { cn } from '../../lib/utils'

type EntityType = 'employees' | 'candidates' | 'jobs'

const ENTITY_FIELDS: Record<EntityType, { key: string; label: string; required?: boolean }[]> = {
  employees: [
    { key: 'full_name', label: 'Full Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
  ],
  candidates: [
    { key: 'full_name', label: 'Full Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'location', label: 'Location' },
    { key: 'current_position', label: 'Position' },
    { key: 'source', label: 'Source' },
  ],
  jobs: [
    { key: 'title', label: 'Title', required: true },
    { key: 'department', label: 'Department', required: true },
    { key: 'location', label: 'Location' },
    { key: 'employment_type', label: 'Employment Type' },
    { key: 'description', label: 'Description' },
  ],
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  mapping: 'secondary',
  validating: 'secondary',
  importing: 'default',
  completed: 'default',
  failed: 'destructive',
}

export function ImportPage() {
  const { t } = useTranslation(['common'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()

  const [entityType, setEntityType] = useState<EntityType>('employees')
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'done'>('upload')
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([])

  const { data: importHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['imports', company?.id],
    queryFn: () => company?.id ? importService.getCompanyImports(company.id) : Promise.resolve([]),
    enabled: !!company?.id,
  })

  const createJobMutation = useMutation({
    mutationFn: async (fileName: string) => {
      if (!company?.id || !profile?.id) throw new Error('Missing auth')
      const job = await importService.createImportJob(company.id, entityType, fileName, profile.id)
      return job
    },
  })

  const mapColumnsMutation = useMutation({
    mutationFn: async ({ jobId: id, mappings: m }: { jobId: string; mappings: Array<{ source_column: string; target_field: string }> }) => {
      return importService.mapColumns(id, m)
    },
  })

  const executeMutation = useMutation({
    mutationFn: async ({ jobId: id, rows }: { jobId: string; rows: Record<string, string>[] }) => {
      const result = await importService.executeImport(id, rows, false)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const data = parseCSV(text)
      if (data.length > 0) {
        setCsvData(data)
        setCsvHeaders(Object.keys(data[0]))
        const fields = ENTITY_FIELDS[entityType]
        const autoMap: Record<string, string> = {}
        for (const header of csvHeaders) {
          const matched = fields.find(f => f.key.toLowerCase() === header.toLowerCase())
          if (matched) autoMap[header] = matched.key
        }
        setMappings(autoMap)
        setStep('mapping')
      }
    }
    reader.readAsText(file)
  }, [entityType, csvHeaders])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  })

  const handleMappingChange = (source: string, target: string) => {
    setMappings(prev => ({ ...prev, [source]: target }))
  }

  const handleStartImport = async () => {
    if (!company?.id || !profile?.id) return

    const fileNames: Record<EntityType, string> = { employees: 'employees.csv', candidates: 'candidates.csv', jobs: 'jobs.csv' }

    const job = await createJobMutation.mutateAsync(fileNames[entityType])

    const mappingArray = Object.entries(mappings)
      .filter(([, target]) => target)
      .map(([source, target]) => ({ source_column: source, target_field: target }))

    await mapColumnsMutation.mutateAsync({ jobId: job.id, mappings: mappingArray })

    const result = await executeMutation.mutateAsync({ jobId: job.id, rows: csvData })

    if (result.errors.length > 0) {
      setValidationErrors(result.errors)
    }
    setStep('done')
  }

  const reset = () => {
    setStep('upload')
    setCsvData([])
    setCsvHeaders([])
    setMappings({})
    setValidationErrors([])
  }

  const fields = ENTITY_FIELDS[entityType]
  const previewRows = csvData.slice(0, 10)

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background dark:text-ink">{t('import_data.title')}</h1>
          <p className="text-body-md text-ink-variant dark:text-ink-variant mt-1">{t('import_data.subtitle')}</p>
        </div>
      </header>

      {step === 'upload' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('import_data.select_entity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {(['employees', 'candidates', 'jobs'] as EntityType[]).map(type => (
                  <Button
                    key={type}
                    variant={entityType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEntityType(type)}
                  >
                    {t(`import_data.entity.${type}`)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
              >
                <input {...getInputProps()} />
                <Upload size={48} className="mx-auto mb-4 text-ink-variant dark:text-ink-variant" />
                <p className="text-ink font-medium mb-1">{t('import_data.drag_drop')}</p>
                <p className="text-sm text-ink-variant dark:text-ink-variant">{t('import_data.accepted_formats')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon_md" onClick={reset} icon={<ArrowLeft size={18} />} />
            <h2 className="text-title-lg font-semibold text-ink dark:text-ink">{t('import_data.map_columns')}</h2>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center px-4 py-2 text-xs font-semibold text-ink-variant uppercase tracking-wider">
                  <span>{t('import_data.source_column')}</span>
                  <span />
                  <span>{t('import_data.target_field')}</span>
                </div>
                {csvHeaders.map(header => (
                  <div key={header} className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center bg-surface-sunken-lowest dark:bg-surface-sunken-lowest rounded-lg px-4 py-3">
                    <span className="text-sm text-ink font-medium">{header}</span>
                    <ArrowRight size={16} className="text-ink-variant" />
                    <select
                      value={mappings[header] ?? ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-surface text-ink text-sm"
                    >
                      <option value="">-- {t('import_data.skip')} --</option>
                      {fields.map(f => (
                        <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setStep('preview')} icon={<ArrowRight size={16} />} iconPosition="right">
              {t('import_data.preview_data')}
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon_md" onClick={() => setStep('mapping')} icon={<ArrowLeft size={18} />} />
            <h2 className="text-title-lg font-semibold text-ink dark:text-ink">{t('import_data.preview')}</h2>
            <Badge variant="secondary">{csvData.length} {t('import_data.rows')}</Badge>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border/50 dark:border-border/50">
                    <th className="px-4 py-3 text-left font-medium text-ink-variant">#</th>
                    {Object.entries(mappings).filter(([, t]) => t).map(([source]) => (
                      <th key={source} className="px-4 py-3 text-left font-medium text-ink-variant">{source}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-border/30 dark:border-border/30">
                      <td className="px-4 py-2 text-ink-variant">{i + 1}</td>
                      {Object.entries(mappings).filter(([, t]) => t).map(([source]) => (
                        <td key={source} className="px-4 py-2 text-ink">{row[source]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {csvData.length > 10 && (
            <p className="text-sm text-ink-variant text-center">
              {t('import_data.showing_first', { count: 10, total: csvData.length })}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={handleStartImport}
              loading={createJobMutation.isPending || mapColumnsMutation.isPending || executeMutation.isPending}
              icon={<Upload size={16} />}
            >
              {t('import_data.start_import')}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                {validationErrors.length === 0 ? (
                  <>
                    <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                    <h2 className="text-title-lg font-semibold text-ink mb-2">{t('import_data.success')}</h2>
                    <p className="text-ink-variant">{csvData.length} {t('import_data.rows_imported')}</p>
                  </>
                ) : (
                  <>
                    <AlertCircle size={48} className="mx-auto mb-4 text-yellow-500" />
                    <h2 className="text-title-lg font-semibold text-ink mb-2">{t('import_data.completed_with_errors')}</h2>
                    <p className="text-ink-variant">{validationErrors.length} {t('import_data.errors_found')}</p>
                    <div className="mt-4 max-h-48 overflow-y-auto text-left bg-surface-sunken-lowest rounded-lg p-3 space-y-1">
                      {validationErrors.slice(0, 20).map((err, i) => (
                        <p key={i} className="text-sm">
                          Row {err.row_number}: <span className="text-red-500">{err.error_message}</span>
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" onClick={reset} icon={<ArrowLeft size={16} />}>{t('import_data.import_another')}</Button>
        </div>
      )}

      <Card>
        <CardHeader className="border-b border-surface-container-high bg-surface-raised dark:bg-surface-sunken">
          <CardTitle className="text-lg">{t('import_data.history')}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border/50 dark:border-border/50">
                <th className="px-4 py-3 text-left font-medium text-ink-variant">{t('import_data.table.file')}</th>
                <th className="px-4 py-3 text-left font-medium text-ink-variant">{t('import_data.table.entity')}</th>
                <th className="px-4 py-3 text-left font-medium text-ink-variant">{t('import_data.table.rows')}</th>
                <th className="px-4 py-3 text-left font-medium text-ink-variant">{t('import_data.table.status')}</th>
                <th className="px-4 py-3 text-left font-medium text-ink-variant">{t('import_data.table.date')}</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr><td colSpan={5} className="py-8 text-center"><Spinner size={24} className="mx-auto" /></td></tr>
              ) : importHistory.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-ink-variant">{t('import_data.no_history')}</td></tr>
              ) : (
                importHistory.map((job: ImportJob) => (
                  <tr key={job.id} className="border-b border-border/30 dark:border-border/30 hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><FileText size={16} className="text-ink-variant" />{job.file_name}</div></td>
                    <td className="px-4 py-3 capitalize">{job.entity_type}</td>
                    <td className="px-4 py-3">{job.processed_rows}/{job.total_rows}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadgeVariant[job.status] ?? 'secondary'}>{job.status}</Badge></td>
                    <td className="px-4 py-3 text-ink-variant">{new Date(job.created_at).toLocaleDateString()}</td>
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

export default ImportPage
