import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDocuments, useUpdateDocument } from '../hooks/useDocuments'
import { FileText, Search, Bell, FileX, PenLine, Clock } from 'lucide-react'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { Button } from '../components/ui/Button'
import { RequestSignatureModal } from '../components/documents/RequestSignatureModal'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-sunken text-ink-variant dark:text-ink-variant',
  pending_signature: 'bg-yellow-50 dark:bg-warning-container/30 text-yellow-700 dark:text-warning',
  signed: 'bg-green-50 dark:bg-success-container/30 text-green-700 dark:text-success',
  submitted: 'bg-blue-50 dark:bg-primary-container/30 text-blue-700 dark:text-primary-muted',
  approved: 'bg-teal-50 dark:bg-success-container/30 text-teal-700 dark:text-success',
  rejected: 'bg-red-50 dark:bg-error-container/30 text-red-700 dark:text-error',
  expired: 'bg-gray-50 text-gray-500 dark:text-outline-variant',
}

const DOC_TYPES = ['employment_contract', 'nda', 'tax_pnd1', 'tax_pnd50', 'social_security', 'health_insurance', 'bpjs_tk', 'bpjs_kes', 'work_permit', 'visa', 'company_policy', 'handbook', 'warning_letter', 'termination_letter']

export function DocumentsPage() {
  const { t } = useTranslation(['documents', 'common'])
  const { data: documents, isLoading, isError, error, refetch } = useDocuments()
  const updateDoc = useUpdateDocument()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sigModalDocId, setSigModalDocId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const filtered = useMemo(() => documents?.filter(d => {
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.candidates?.full_name?.toLowerCase().includes(search.toLowerCase()) && !d.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && d.document_type !== typeFilter) return false
    return true
  }), [documents, search, typeFilter])

  const stats = useMemo(() => ({
    total: documents?.length || 0,
    pending: documents?.filter(d => ['draft', 'pending_signature'].includes(d.status ?? '')).length || 0,
    overdue: documents?.filter(d => d.due_date && new Date(d.due_date) < new Date() && !['signed', 'approved'].includes(d.status ?? '')).length || 0,
  }), [documents])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value), [])
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value), [])

  const handleReminder = async (docId: string) => {
    try {
      const { supabase } = await import('../lib/supabase')
      await supabase.functions.invoke('send-document-reminders', { body: { docId } })
      toast.success(t('reminder_sent'))
    } catch (err) {
      if (import.meta.env.DEV) console.error('[DocumentsPage] Reminder failed:', err)
      toast.error(t('common:errors.save_failed'))
    }
  }

  const getStatusLabel = useCallback((status?: string | null) => {
    if (!status) return '-'
    return t(`status_${status}`, { defaultValue: status.replace(/_/g, ' ') })
  }, [t])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-ink dark:text-ink">{t('title')}</h1>
        <p className="text-body-md text-ink-variant dark:text-ink-variant mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-sm text-ink-variant dark:text-ink-variant">{t('total_documents')}</p>
          <p className="text-2xl font-bold text-ink mt-1">{stats.total}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-sm text-ink-variant dark:text-ink-variant">{t('pending_action')}</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-warning mt-1">{stats.pending}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4">
          <p className="text-sm text-ink-variant dark:text-ink-variant">{t('overdue')}</p>
          <p className="text-2xl font-bold text-error dark:text-error mt-1">{stats.overdue}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant dark:text-ink-variant size-4" />
          <input
          value={searchInput}
          onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm"
            placeholder={t('search_placeholder')}
          />
        </div>
        <select
          value={typeFilter}
          onChange={handleTypeChange}
          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm"
        >
          <option value="">{t('all_types')}</option>
          {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {isError ? (
        <ErrorState
          title={t('common:errors.load_failed')}
          message={(error as Error)?.message || ''}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <LoadingState variant="table" rows={5} message={t('common:loading')} />
      ) : filtered && filtered.length === 0 ? (
        search || typeFilter ? (
          <EmptyState
            icon={FileX}
            title={t('no_results')}
            description={t('common:empty.no_data')}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title={t('empty_title')}
            description={t('empty_description')}
          />
        )
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="table-scroll">
            <table role="table" className="table-card-mobile w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-surface-sunken dark:bg-surface-sunken/50 border-b border-border/50 dark:border-border/50">
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant dark:text-ink-variant">{t('title')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant dark:text-ink-variant">{t('for')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant dark:text-ink-variant">{t('type')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant dark:text-ink-variant">{t('region')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant dark:text-ink-variant">{t('status', { ns: 'common' })}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant dark:text-ink-variant">{t('signature_status')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant dark:text-ink-variant">{t('due')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-variant dark:text-ink-variant text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map(doc => (
                  <tr key={doc.id} className="hover:bg-surface-sunken/50 dark:hover:bg-surface-sunken/30 transition-colors duration-150 border-b border-border/50 dark:border-border/50">
                    <td className="py-3 px-4 text-sm text-ink dark:text-ink" data-label={t('title')}>
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-ink-variant dark:text-ink-variant shrink-0" />
                        <span className="text-sm font-medium text-ink dark:text-ink">{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-ink text-ink-variant" data-label={t('for')}>{doc.candidates?.full_name || doc.user_profiles?.full_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-ink text-ink-variant" data-label={t('type')}>{doc.document_type?.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-sm text-ink dark:text-ink" data-label={t('region')}><span className="px-2 py-0.5 bg-surface-sunken rounded text-xs dark:text-ink">{doc.region}</span></td>
                    <td className="py-3 px-4 text-sm text-ink dark:text-ink" data-label={t('status', { ns: 'common' })}><span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[doc.status ?? ''] || '')}>{getStatusLabel(doc.status)}</span></td>
                    <td className="py-3 px-4 text-sm text-ink dark:text-ink" data-label={t('signature_status')}>
                      {doc.requires_signature ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 dark:bg-warning-container/30 text-yellow-700 dark:text-warning">
                          <Clock size={10} /> {t('signature_pending')}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-variant/50 dark:text-outline-variant">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-ink text-ink-variant" data-label={t('due')}>{doc.due_date || '-'}</td>
                    <td className="py-3 px-4 text-sm text-ink text-right" data-label={t('actions')}>
                      <div className="flex items-center justify-end gap-2">
                        {doc.reminder_enabled && (
                          <Button
                            variant="ghost"
                            size="icon_sm"
                            onClick={() => handleReminder(doc.id)}
                            title={t('send_reminder')}
                            icon={<Bell size={14} />}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon_sm"
                          onClick={() => setSigModalDocId(doc.id)}
                          title={t('request_signature')}
                          icon={<PenLine size={14} />}
                        />
                        <select
                          value={doc.status || 'draft'}
                          onChange={e => updateDoc.mutate({ id: doc.id, data: { status: e.target.value } })}
                          className="text-xs border border-border rounded px-2 py-1 bg-surface-sunken-lowest dark:bg-surface-sunken-lowest dark:text-ink"
                        >
                            <option value="draft">{t('status_draft')}</option>
                            <option value="pending_signature">{t('status_pending_signature')}</option>
                            <option value="signed">{t('status_signed')}</option>
                            <option value="submitted">{t('status_submitted')}</option>
                            <option value="approved">{t('status_approved')}</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RequestSignatureModal
        documentId={sigModalDocId ?? ''}
        onClose={() => setSigModalDocId(null)}
        open={!!sigModalDocId}
      />
    </div>
  )
}

export default DocumentsPage
