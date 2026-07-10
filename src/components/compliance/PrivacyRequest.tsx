import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import { Trash2, Download, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface PrivacyRequest {
  id: string
  request_type: string
  status: string
  requested_at: string
  completed_at: string | null
  notes: string | null
}

export function PrivacyRequest() {
  const { t } = useTranslation('common')
  const { profile, company } = useAuthStore()
  const queryClient = useQueryClient()
  const [requestType, setRequestType] = useState<'access' | 'erasure' | 'portability'>('access')

  const { data: requests, isLoading } = useQuery<PrivacyRequest[]>({
    queryKey: ['privacy-requests', company?.id, profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('privacy_requests')
        .select('*')
        .eq('company_id', company?.id)
        .eq('employee_id', profile?.id)
        .order('requested_at', { ascending: false })
      return (data || []) as PrivacyRequest[]
    },
    enabled: !!company?.id && !!profile?.id,
  })

  const createRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('privacy_requests').insert({
        company_id: company?.id,
        employee_id: profile?.id,
        request_type: requestType,
        status: 'pending',
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('pdpa.request_created') || 'Privacy request submitted')
      queryClient.invalidateQueries({ queryKey: ['privacy-requests'] })
    },
    onError: () => {
      toast.error(t('pdpa.request_error') || 'Failed to submit request')
    },
  })

  const exportData = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { company_id: company?.id, user_id: profile?.id },
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `privacy-export-${profile?.id?.slice(0, 8)}.json`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success(t('pdpa.export_success') || 'Data exported')
    },
  })

  const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <Clock size={16} className="text-yellow-600" />,
    in_progress: <Loader2 size={16} className="text-blue-600 animate-spin" />,
    completed: <CheckCircle size={16} className="text-green-600" />,
    rejected: <XCircle size={16} className="text-red-600" />,
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => exportData.mutate()}
          disabled={exportData.isPending}
          className="flex items-center gap-2 p-4 bg-surface rounded-xl border border-border hover:bg-surface-sunken transition-colors disabled:opacity-50"
        >
          <Download size={20} className="text-primary" />
          <div className="text-left">
            <p className="text-sm font-medium text-ink">{t('pdpa.export_title') || 'Export My Data'}</p>
            <p className="text-xs text-ink-variant">{t('pdpa.export_desc_short') || 'Download your data as JSON'}</p>
          </div>
          {exportData.isPending && <Loader2 size={16} className="animate-spin ml-auto" />}
        </button>
        <button
          onClick={() => { setRequestType('erasure'); createRequest.mutate() }}
          disabled={createRequest.isPending}
          className="flex items-center gap-2 p-4 bg-surface rounded-xl border border-error/30 hover:bg-error/5 transition-colors disabled:opacity-50"
        >
          <Trash2 size={20} className="text-error" />
          <div className="text-left">
            <p className="text-sm font-medium text-ink">{t('pdpa.delete_title') || 'Request Data Deletion'}</p>
            <p className="text-xs text-ink-variant">{t('pdpa.delete_desc_short') || 'Anonymize your personal data'}</p>
          </div>
          {createRequest.isPending && <Loader2 size={16} className="animate-spin ml-auto" />}
        </button>
      </div>

      {/* Request History */}
      <div>
        <h4 className="text-sm font-semibold text-ink mb-3">{t('pdpa.request_history') || 'Request History'}</h4>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 bg-surface-sunken rounded-lg animate-shimmer" />)}</div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-sunken border border-border">
                <div className="flex items-center gap-3">
                  {STATUS_ICONS[req.status] || <Clock size={16} />}
                  <div>
                    <p className="text-sm font-medium text-ink capitalize">{req.request_type}</p>
                    <p className="text-xs text-ink-variant">{new Date(req.requested_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  req.status === 'completed' ? 'bg-green-100 text-green-700' :
                  req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{req.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-variant text-center py-4">{t('pdpa.no_requests') || 'No privacy requests yet.'}</p>
        )}
      </div>
    </div>
  )
}
