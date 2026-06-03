import { useState } from 'react'
import { useDocuments, useUpdateDocument } from '../hooks/useDocuments'
import { FileText, Search, CheckCircle, AlertCircle, Clock, Bell } from 'lucide-react'
import { cn } from '../utils/cn'
import toast from 'react-hot-toast'

const STATUS_ICONS: Record<string, any> = { signed: CheckCircle, rejected: AlertCircle }
const STATUS_COLORS: Record<string, string> = { draft: 'bg-surface-container text-on-surface-variant', pending_signature: 'bg-yellow-50 text-yellow-700', signed: 'bg-green-50 text-green-700', submitted: 'bg-blue-50 text-blue-700', approved: 'bg-teal-50 text-teal-700', rejected: 'bg-red-50 text-red-700', expired: 'bg-gray-50 text-gray-500' }

const DOC_TYPES = ['employment_contract', 'nda', 'tax_pnd1', 'tax_pnd50', 'social_security', 'health_insurance', 'bpjs_tk', 'bpjs_kes', 'work_permit', 'visa', 'company_policy', 'handbook', 'warning_letter', 'termination_letter']

export function DocumentsPage() {
  const { data: documents, isLoading } = useDocuments()
  const updateDoc = useUpdateDocument()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = documents?.filter(d => {
    if (search && !d.name?.toLowerCase().includes(search.toLowerCase()) && !d.candidates?.full_name?.toLowerCase().includes(search.toLowerCase()) && !d.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && d.document_type !== typeFilter) return false
    return true
  })

  const stats = { total: documents?.length || 0, pending: documents?.filter(d => ['draft', 'pending_signature'].includes(d.status)).length || 0, overdue: documents?.filter(d => d.due_date && new Date(d.due_date) < new Date() && !['signed', 'approved'].includes(d.status)).length || 0 }

  const handleReminder = async (docId: string) => {
    try {
      const { supabase } = await import('../lib/supabase')
      await supabase.functions.invoke('send-document-reminders', { body: { docId } })
      toast.success('Reminder sent')
    } catch { toast.error('Failed to send reminder') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">Documents</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Track and manage employment documents across all countries</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <p className="text-sm text-on-surface-variant">Total Documents</p>
          <p className="text-2xl font-bold text-on-surface mt-1">{stats.total}</p>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <p className="text-sm text-on-surface-variant">Pending Action</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-4">
          <p className="text-sm text-on-surface-variant">Overdue</p>
          <p className="text-2xl font-bold text-error mt-1">{stats.overdue}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm" placeholder="Search documents..." />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm">
          <option value="">All Types</option>
          {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-on-surface-variant">Loading...</div> : (
        <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Document</th>
                  <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">For</th>
                  <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Type</th>
                  <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Region</th>
                  <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Due</th>
                  <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered?.map(doc => (
                  <tr key={doc.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-on-surface-variant" />
                        <span className="text-sm font-medium text-on-surface">{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface-variant">{doc.candidates?.full_name || doc.user_profiles?.full_name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-on-surface-variant">{doc.document_type?.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 bg-surface-container-low rounded text-xs">{doc.region}</span></td>
                    <td className="py-3 px-4"><span className={cn('px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[doc.status] || '')}>{doc.status?.replace('_', ' ')}</span></td>
                    <td className="py-3 px-4 text-sm text-on-surface-variant">{doc.due_date || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.reminder_enabled && (
                          <button onClick={() => handleReminder(doc.id)} className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary" title="Send Reminder"><Bell size={14} /></button>
                        )}
                        <select value="" onChange={e => { if (!e.target.value) return; updateDoc.mutate({ id: doc.id, data: { status: e.target.value } }) }}
                          className="text-xs border border-outline-variant rounded px-2 py-1 bg-surface-container-lowest">
                          <option value="">Update status</option>
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
          {filtered?.length === 0 && <div className="text-center py-12 text-on-surface-variant">No documents found</div>}
        </div>
      )}
    </div>
  )
}

export default DocumentsPage
