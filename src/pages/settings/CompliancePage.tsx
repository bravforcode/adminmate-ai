import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Shield, CheckCircle, AlertTriangle, Clock, FileDown } from 'lucide-react'
import { DataDeletionRequest } from '../../types/models'

import toast from 'react-hot-toast'

const COUNTRY_CHECKS = {
  TH: [
    { id: 'pdpa_consent', label: 'PDPA Consent active', required: true },
    { id: 'dpo', label: 'DPO contact configured', required: false },
    { id: 'retention_policy', label: 'Data retention policy set', required: true },
    { id: 'breach_procedure', label: 'Data breach procedure ready', required: true },
  ],
  VN: [
    { id: 'consent', label: 'Consent before collection', required: true },
    { id: 'cross_border', label: 'Cross-border transfer assessment', required: true },
    { id: 'security', label: 'Technical security measures', required: true },
  ],
  ID: [
    { id: 'consent', label: 'Explicit consent obtained', required: true },
    { id: 'breach', label: '14-day breach notification procedure', required: true },
    { id: 'retention', label: 'Data retention limits defined', required: true },
  ],
}

export function CompliancePage() {
  const company = useAuthStore(s => s.company)
  const country = company?.country || 'TH'
  const checks = COUNTRY_CHECKS[country as keyof typeof COUNTRY_CHECKS] || COUNTRY_CHECKS.TH

  useQuery({
    queryKey: ['compliance', 'consents', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('pdpa_consents').select('*', { count: 'exact', head: true }).eq('company_id', company?.id)
      return data
    },
    enabled: !!company?.id,
  })

  const { data: deletionRequests } = useQuery({
    queryKey: ['compliance', 'deletions', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('data_deletion_requests').select('*').eq('company_id', company?.id).order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!company?.id,
  })

  const handleDeletion = async (requestId: string, action: 'approved' | 'rejected') => {
    if (action === 'approved') {
      const req = deletionRequests?.find((r: DataDeletionRequest) => r.id === requestId)
      if (req) await supabase.rpc('anonymize_candidate_data', { p_email: req.requester_email, p_company_id: company?.id })
    }
    await supabase.from('data_deletion_requests').update({ status: action === 'approved' ? 'completed' : 'rejected', completed_at: new Date().toISOString() }).eq('id', requestId)
    toast.success(`Request ${action}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">Compliance</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Data protection & regulatory compliance for {country}</p>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <div className="flex items-center gap-2 mb-4"><Shield size={20} className="text-primary" /><h3 className="font-semibold">{country} Compliance Checklist</h3></div>
        <div className="space-y-2">
          {checks.map(check => (
            <div key={check.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container-low">
              <span className="text-sm">{check.label}</span>
              {check.required ? <AlertTriangle size={16} className="text-yellow-600" /> : <CheckCircle size={16} className="text-green-600" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <div className="flex items-center gap-2 mb-4"><FileDown size={20} className="text-primary" /><h3 className="font-semibold">Data Subject Requests</h3></div>
        {deletionRequests?.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No pending data subject requests</p>
        ) : (
          <div className="space-y-2">
            {deletionRequests?.map((req: DataDeletionRequest) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant">
                <div>
                  <p className="text-sm font-medium">{req.requester_email}</p>
                  <p className="text-xs text-on-surface-variant">{req.request_type} · {req.created_at ? new Date(req.created_at).toLocaleDateString() : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDeletion(req.id, 'approved')} className="px-3 py-1 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100">Approve</button>
                  <button onClick={() => handleDeletion(req.id, 'rejected')} className="px-3 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <div className="flex items-center gap-2 mb-4"><Clock size={20} className="text-primary" /><h3 className="font-semibold">Data Retention</h3></div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-outline-variant"><span className="text-on-surface-variant">CV Data</span><span>2 years after application</span></div>
          <div className="flex justify-between py-2 border-b border-outline-variant"><span className="text-on-surface-variant">Employee Data</span><span>7 years after termination</span></div>
          <div className="flex justify-between py-2"><span className="text-on-surface-variant">Chat History</span><span>1 year</span></div>
        </div>
      </div>
    </div>
  )
}

export default CompliancePage
