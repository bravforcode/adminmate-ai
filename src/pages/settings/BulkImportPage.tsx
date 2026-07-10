import { useState, useCallback, useRef } from 'react'
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { parseCSV, toCSV, downloadCSV, validateCSV, type ValidationRule } from '../../utils/csvParser'
import { bulkImportService, type ImportResult, type ImportError } from '../../services/bulkImportService'
import { useAuthStore } from '../../stores/authStore'
import { SubscriptionGate } from '../../components/shared/SubscriptionGate'

type ImportType = 'candidates' | 'jobs'

const CANDIDATE_SCHEMA: Record<string, ValidationRule> = {
  full_name: { required: true, label: 'Full Name' },
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, label: 'Email' },
  phone: { label: 'Phone' },
  location: { label: 'Location' },
  current_position: { label: 'Position' },
  source: { label: 'Source' },
  years_experience: { pattern: /^\d*$/, label: 'Years Experience' },
}

const JOB_SCHEMA: Record<string, ValidationRule> = {
  title: { required: true, label: 'Job Title' },
  department: { required: true, label: 'Department' },
  location: { label: 'Location' },
  employment_type: { label: 'Employment Type' },
  status: { label: 'Status' },
  salary_min: { pattern: /^\d*$/, label: 'Salary Min' },
  salary_max: { pattern: /^\d*$/, label: 'Salary Max' },
  headcount: { pattern: /^\d*$/, label: 'Headcount' },
  skills_required: { label: 'Skills Required' },
  description: { label: 'Description' },
}

const CANDIDATE_HEADERS = ['full_name', 'email', 'phone', 'location', 'current_position', 'source', 'years_experience']
const JOB_HEADERS = ['title', 'department', 'location', 'employment_type', 'status', 'salary_min', 'salary_max', 'headcount', 'skills_required', 'description']

function generateTemplate(type: ImportType): string {
  const headers = type === 'candidates' ? CANDIDATE_HEADERS : JOB_HEADERS
  const sampleRow = type === 'candidates'
    ? { full_name: 'John Doe', email: 'john@example.com', phone: '+66-81-234-5678', location: 'Bangkok', current_position: 'Software Engineer', source: 'LinkedIn', years_experience: '5' }
    : { title: 'Software Engineer', department: 'Engineering', location: 'Bangkok', employment_type: 'Full time', status: 'Active', salary_min: '50000', salary_max: '80000', headcount: '2', skills_required: 'React, TypeScript', description: 'Build amazing things' }
  return toCSV([sampleRow], headers)
}

export function BulkImportPage() {
  const { t } = useTranslation(['common', 'recruitment'])
  const companyId = useAuthStore(s => s.profile?.company_id)
  const fileRef = useRef<HTMLInputElement>(null)

  const [importType, setImportType] = useState<ImportType>('candidates')
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const data = parseCSV(text)
      setParsedData(data)
      setValidationErrors([])
      setImportResult(null)
      setStep('preview')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }, [handleFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleValidate = useCallback(() => {
    const schema = importType === 'candidates' ? CANDIDATE_SCHEMA : JOB_SCHEMA
    const errors = validateCSV(parsedData, schema)
    setValidationErrors(errors)
  }, [parsedData, importType])

  const handleImport = useCallback(async () => {
    if (!companyId) return
    setIsImporting(true)
    try {
      const result = importType === 'candidates'
        ? await bulkImportService.importCandidates(parsedData, companyId)
        : await bulkImportService.importJobs(parsedData, companyId)
      setImportResult(result)
      setStep('result')
    } finally {
      setIsImporting(false)
    }
  }, [parsedData, importType, companyId])

  const handleDownloadTemplate = useCallback(() => {
    const csv = generateTemplate(importType)
    downloadCSV(csv, `${importType}_template.csv`)
  }, [importType])

  const handleExportData = useCallback(() => {
    if (parsedData.length === 0) return
    const csv = toCSV(parsedData)
    downloadCSV(csv, `${importType}_export.csv`)
  }, [parsedData, importType])

  const reset = useCallback(() => {
    setParsedData([])
    setValidationErrors([])
    setImportResult(null)
    setStep('upload')
  }, [])

  const previewRows = parsedData.slice(0, 10)
  const headers = parsedData.length > 0 ? Object.keys(parsedData[0]) : []

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-ink dark:text-ink">{t('bulk_import.title')}</h1>
          <p className="text-body-md text-ink-variant dark:text-ink-variant mt-1">{t('bulk_import.subtitle')}</p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border text-ink rounded-lg text-sm font-medium hover:bg-surface-sunken dark:hover:bg-surface-sunken transition-colors"
        >
          <Download size={16} /> {t('bulk_import.download_template')}
        </button>
      </div>

      {step === 'upload' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl border border-border p-6">
            <label className="block text-sm font-medium mb-3 text-ink dark:text-ink">{t('bulk_import.import_type')}</label>
            <div className="flex gap-3">
              {(['candidates', 'jobs'] as ImportType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setImportType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    importType === type
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-sunken dark:bg-surface-sunken-lowest text-ink-variant dark:text-ink-variant hover:bg-surface-sunken dark:hover:bg-surface-sunken'
                  }`}
                >
                  {t(`bulk_import.type_${type}`)}
                </button>
              ))}
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="bg-surface rounded-xl border-2 border-dashed border-border p-12 text-center hover:border-primary dark:hover:border-primary transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={48} className="mx-auto mb-4 text-ink-variant dark:text-ink-variant" />
            <p className="text-ink font-medium mb-1">{t('bulk_import.drag_drop')}</p>
            <p className="text-sm text-ink-variant dark:text-ink-variant">{t('bulk_import.or_click')}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title-lg font-semibold text-ink dark:text-ink">
              {t('bulk_import.preview')} ({parsedData.length} {t('bulk_import.rows')})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-surface-sunken dark:hover:bg-surface-sunken"
              >
                <X size={14} /> {t('common:cancel')}
              </button>
              {parsedData.length > 0 && (
                <button
                  onClick={handleExportData}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-surface-sunken dark:hover:bg-surface-sunken"
                >
                  <Download size={14} /> {t('common:export_csv')}
                </button>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-border">
                  <th className="px-4 py-3 text-left font-medium text-ink-variant dark:text-ink-variant">#</th>
                  {headers.map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-ink-variant dark:text-ink-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 dark:border-border/50">
                    <td className="px-4 py-2 text-ink-variant dark:text-ink-variant">{i + 1}</td>
                    {headers.map(h => (
                      <td key={h} className="px-4 py-2 text-ink dark:text-ink">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parsedData.length > 10 && (
            <p className="text-sm text-ink-variant dark:text-ink-variant text-center">
              {t('bulk_import.showing_first', { count: 10, total: parsedData.length })}
            </p>
          )}

          {validationErrors.length > 0 && (
            <div className="bg-error-container/15 dark:bg-error-container/20 rounded-xl border border-error/30 dark:border-error/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-error dark:text-error" />
                <h3 className="font-medium text-error dark:text-error">{t('bulk_import.validation_errors')}</h3>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {validationErrors.slice(0, 20).map((err, i) => (
                  <p key={i} className="text-sm text-ink dark:text-ink">
                    Row {err.row}: <span className="text-error dark:text-error">{err.field}</span> — {err.message}
                  </p>
                ))}
                {validationErrors.length > 20 && (
                  <p className="text-sm text-ink-variant dark:text-ink-variant">
                    ...and {validationErrors.length - 20} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleValidate}
              className="px-4 py-2 border border-border text-ink rounded-lg text-sm font-medium hover:bg-surface-sunken dark:hover:bg-surface-sunken"
            >
              {t('bulk_import.validate')}
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || (validationErrors.length > 0)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isImporting ? t('bulk_import.importing') : t('bulk_import.import')}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && importResult && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              {importResult.errors.length === 0 ? (
                <CheckCircle2 size={32} className="text-success dark:text-success" />
              ) : (
                <AlertCircle size={32} className="text-warning dark:text-warning" />
              )}
              <div>
                <h2 className="text-title-lg font-semibold text-ink dark:text-ink">{t('bulk_import.results')}</h2>
                <p className="text-sm text-ink-variant dark:text-ink-variant">
                  {t('bulk_import.results_summary', { success: importResult.success, total: parsedData.length })}
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-ink mb-2">{t('bulk_import.failed_rows')}</h3>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-surface-sunken dark:bg-surface-sunken-lowest rounded-lg p-3">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-sm text-ink dark:text-ink">
                      Row {err.row}: <span className="text-error dark:text-error">{err.field}</span> — {err.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90"
          >
            {t('bulk_import.import_another')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function BulkImportPageWrapper() {
  return (
    <SubscriptionGate feature="bulkImport">
      <BulkImportPage />
    </SubscriptionGate>
  )
}
