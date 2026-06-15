import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDocuments, useUpdateDocument } from '../hooks/useDocuments'
import { FileText, Search, Bell, FileX, PenLine, Clock } from 'lucide-react'
import { cn } from '../utils/cn'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { Button } from '../components/ui/Button'
import { RequestSignatureModal } from '../components/documents/RequestSignatureModal'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-container dark:bg-[#334155] text-on-surface-variant dark:text-[#94a3b8]',
  pending_signature: 'bg-yellow-50 dark:bg-[#451a03]/30 text-yellow-700 dark:text-[#fbbf24]',
  signed: 'bg-green-50 dark:bg-[#052e16]/30 text-green-700 dark:text-[#4ade80]',
  submitted: 'bg-blue-50 dark:bg-[#1e3a5f]/30 text-blue-700 dark:text-[#93c5fd]',
  approved: 'bg-teal-50 dark:bg-[#052e16]/30 text-teal-700 dark:text-[#4ade80]',
  rejected: 'bg-red-50 dark:bg-[#450a0a]/30 text-red-700 dark:text-[#f87171]',
  expired: 'bg-gray-50 dark:bg-[#1e293b] text-gray-500 dark:text-[#64748b]',
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
    pending: documents?.filter(d => ['draft', 'pending_signature'].includes(d.status)).length || 0,
    overdue: documents?.filter(d => d.due_date && new Date(d.due_date) < new Date() && !['signed', 'approved'].includes(d.status)).length || 0,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface dark:text-[#f1f5f9]">{t('title')}</h1>
        <p className="text-body-md text-on-surface-variant dark:text-[#94a3b8] mt-1">Track and manage employment documents across all countries</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-4">
          <p className="text-sm text-on-surface-variant dark:text-[#94a3b8]">{t('total_documents')}</p>
          <p className="text-2xl font-bold text-on-surface dark:text-[#f1f5f9] mt-1">{stats.total}</p>
        </div>
        <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-4">
          <p className="text-sm text-on-surface-variant dark:text-[#94a3b8]">{t('pending_action')}</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-[#fbbf24] mt-1">{stats.pending}</p>
        </div>
        <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-4">
          <p className="text-sm text-on-surface-variant dark:text-[#94a3b8]">{t('overdue')}</p>
          <p className="text-2xl font-bold text-error dark:text-[#f87171] mt-1">{stats.overdue}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-[#94a3b8] size-4" />
          <input
          value={searchInput}
          onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm"
            placeholder={t('search_placeholder')}
          />
        </div>
        <select
          value={typeFilter}
          onChange={handleTypeChange}
          className="w-full sm:w-auto px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm"
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
        <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] overflow-hidden">
          <div className="table-scroll">
            <table role="table" className="table-card-mobile w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-surface-container dark:bg-[#334155]/50 border-b border-outline-variant/50 dark:border-[#334155]/50">
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">Document</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">For</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">Type</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">Region</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">{t('signature_status')}</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">Due</th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map(doc => (
                  <tr key={doc.id} className="hover:bg-surface-container-high/50 dark:hover:bg-[#334155]/30 transition-colors duration-150 border-b border-outline-variant/50 dark:border-[#334155]/50">
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9]" data-label="Document">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-on-surface-variant dark:text-[#94a3b8] shrink-0" />
                        <span className="text-sm font-medium text-on-surface dark:text-[#f1f5f9]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9] text-on-surface-variant" data-label="For">{doc.candidates?.full_name || doc.user_profiles?.full_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9] text-on-surface-variant" data-label="Type">{doc.document_type?.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9]" data-label="Region"><span className="px-2 py-0.5 bg-surface-container-low dark:bg-[#1e3a5f] rounded text-xs dark:text-[#f1f5f9]">{doc.region}</span></td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9]" data-label="Status"><span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[doc.status] || '')}>{doc.status?.replace('_', ' ')}</span></td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9]" data-label={t('signature_status')}>
                      {doc.requires_signature ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 dark:bg-[#451a03]/30 text-yellow-700 dark:text-[#fbbf24]">
                          <Clock size={10} /> {t('signature_pending')}
                        </span>
                      ) : (
                        <span className="text-xs text-on-surface-variant/50 dark:text-[#64748b]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9] text-on-surface-variant" data-label="Due">{doc.due_date || '-'}</td>
                    <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9] text-right" data-label="Actions">
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
                          className="text-xs border border-outline-variant dark:border-[#334155] rounded px-2 py-1 bg-surface-container-lowest dark:bg-[#0f172a] dark:text-[#f1f5f9]"
                        >
                          <option value="draft">Draft</option>
                          <option value="pending_signature">Pending Signature</option>
                          <option value="signed">Signed</option>
                          <option value="submitted">Submitted</option>
                          <option value="approved">Approved</option>
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
