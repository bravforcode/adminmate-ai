import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { pdpaService, type DataCategory, type ConsentRecord } from '../../services/pdpaService'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { Download, Trash2, Shield, Clock, Database, FileJson, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function PDPAPage() {
  const { t } = useTranslation('common')
  const { profile, company } = useAuthStore()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const userId = profile?.id || ''
  const companyId = company?.id || ''

  const { data: categories, isLoading: categoriesLoading } = useQuery<DataCategory[]>({
    queryKey: ['pdpa', 'categories', userId],
    queryFn: () => pdpaService.getDataCategories(userId, companyId),
    enabled: !!userId && !!companyId,
  })

  const { data: consentHistory, isLoading: consentsLoading } = useQuery<ConsentRecord[]>({
    queryKey: ['pdpa', 'consents', companyId],
    queryFn: () => pdpaService.getConsentHistory(userId, companyId),
    enabled: !!userId && !!companyId,
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { company_id: companyId, user_id: userId },
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    onSuccess: (data) => {
      pdpaService.downloadJSON(data)
      toast.success(t('pdpa.export_success') || 'Data exported successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Export failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('delete-user-data', {
        body: { company_id: companyId, user_id: userId },
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    onSuccess: () => {
      toast.success(t('pdpa.delete_success') || 'Account data anonymized')
      queryClient.invalidateQueries({ queryKey: ['pdpa'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Deletion failed')
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: async (consentId: string) => {
      await pdpaService.withdrawConsent(consentId)
    },
    onSuccess: () => {
      toast.success(t('pdpa.withdraw_success') || 'Consent withdrawn successfully')
      queryClient.invalidateQueries({ queryKey: ['pdpa', 'consents'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to withdraw consent')
    },
  })

  const downloadReceipt = (consent: ConsentRecord) => {
    const receipt = {
      receipt_type: 'pdpa_consent_receipt',
      consent_id: consent.id,
      consent_type: consent.consent_type,
      purposes: consent.purposes,
      consent_given: consent.consent_given,
      form_version: consent.consent_form_version,
      date: consent.created_at,
      data_subject: consent.data_subject_email || profile?.email,
      company: company?.name,
    }
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `consent-receipt-${consent.id.slice(0, 8)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-headline-md font-bold text-ink">{t('pdpa.page_title') || 'Privacy & Data'}</h1>
        <p className="text-body-md text-ink-variant mt-1">{t('pdpa.page_subtitle') || 'Manage your personal data, exports, and consent history under PDPA / GDPR.'}</p>
      </div>

      {/* Data Export */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download size={20} className="text-primary" />
          <h3 className="text-title-lg font-semibold text-ink">{t('pdpa.export_title') || 'Export My Data'}</h3>
        </div>
        <p className="text-sm text-ink-variant mb-4">
          {t('pdpa.export_desc') || 'Download a complete copy of your personal data in JSON format. This includes your profile, applications, documents, and consent records.'}
        </p>
        <button
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-sm"
        >
          <FileJson size={16} />
          {exportMutation.isPending ? (t('pdpa.exporting') || 'Exporting...') : (t('pdpa.export_button') || 'Export My Data')}
        </button>
      </div>

      {/* Data Deletion */}
      <div className="bg-surface rounded-xl border border-error/30 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={20} className="text-error" />
          <h3 className="text-title-lg font-semibold text-ink">{t('pdpa.delete_title') || 'Delete My Account'}</h3>
        </div>
        <p className="text-sm text-ink-variant mb-4">
          {t('pdpa.delete_desc') || 'Anonymize your personal data. PII fields will be replaced with anonymized values. Non-PII business records (application history, audit logs) will be retained for operational continuity.'}
        </p>
        <div className="bg-error-container/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-error mt-0.5 flex-shrink-0" />
            <p className="text-xs text-ink-variant">{t('pdpa.delete_warning') || 'This action is irreversible. Your name, email, phone, and other personal identifiers will be permanently anonymized.'}</p>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg font-medium hover:opacity-90 text-sm"
        >
          <Trash2 size={16} />
          {t('pdpa.delete_button') || 'Delete My Account'}
        </button>
      </div>

      {/* Data Categories */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={20} className="text-primary" />
          <h3 className="text-title-lg font-semibold text-ink">{t('pdpa.categories_title') || 'Data Categories'}</h3>
        </div>
        <p className="text-sm text-ink-variant mb-4">
          {t('pdpa.categories_desc') || 'Overview of data categories stored about you.'}
        </p>
        {categoriesLoading ? (
          <div className="space-y-2 skeleton-stagger">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-sunken rounded-lg animate-shimmer" />)}</div>
        ) : (
          <div className="space-y-2">
            {categories?.map(cat => (
              <div key={cat.table_name} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === cat.table_name ? null : cat.table_name)}
                  className="w-full flex items-center justify-between p-3 hover:bg-surface-sunken transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">{cat.category}</span>
                    <span className="text-xs bg-surface-sunken px-2 py-0.5 rounded text-ink-variant">{cat.record_count} records</span>
                  </div>
                  {expandedCategory === cat.table_name ? <ChevronUp size={16} className="text-ink-variant" /> : <ChevronDown size={16} className="text-ink-variant" />}
                </button>
                {expandedCategory === cat.table_name && (
                  <div className="px-3 pb-3 text-xs text-ink-variant border-t border-border pt-2">
                    {cat.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consent History */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-primary" />
          <h3 className="text-title-lg font-semibold text-ink">{t('pdpa.consent_history_title') || 'Consent History'}</h3>
        </div>
        <p className="text-sm text-ink-variant mb-4">
          {t('pdpa.consent_history_desc') || 'Timeline of your consent records. Download receipts for your records.'}
        </p>
        {consentsLoading ? (
          <div className="space-y-2 skeleton-stagger">{[1, 2].map(i => <div key={i} className="h-16 bg-surface-sunken rounded-lg animate-shimmer" />)}</div>
        ) : consentHistory && consentHistory.length > 0 ? (
          <div className="space-y-3">
            {consentHistory.map(consent => (
              <div key={consent.id} className="flex items-center justify-between p-3 bg-surface-sunken rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${consent.consent_given ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {consent.consent_given ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">{consent.consent_type}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        consent.consent_given
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {consent.consent_given ? 'Active' : 'Revoked'}
                      </span>
                    </div>
                    <p className="text-xs text-ink-variant flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(consent.created_at).toLocaleDateString()} · v{consent.consent_form_version}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {consent.consent_given && (
                    <button
                      onClick={() => withdrawMutation.mutate(consent.id)}
                      disabled={withdrawMutation.isPending}
                      className="flex items-center gap-1 text-xs text-error hover:underline px-2 py-1 disabled:opacity-50"
                    >
                      {withdrawMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      {t('pdpa.revoke_button') || 'Revoke'}
                    </button>
                  )}
                  <button onClick={() => downloadReceipt(consent)} className="text-xs text-primary hover:underline px-3 py-2 min-h-[44px] flex items-center">
                    {t('pdpa.download_receipt') || 'Receipt'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-variant">{t('pdpa.no_consents') || 'No consent records found.'}</p>
        )}
      </div>

      <ConfirmDialog
        title={t('pdpa.delete_confirm_title') || 'Delete Account Data?'}
        message={t('pdpa.delete_confirm_message') || 'This will permanently anonymize your personal data. Your name, email, phone and other PII will be replaced with anonymized values. This action cannot be undone.'}
        confirmLabel={t('pdpa.delete_confirm_button') || 'Yes, Delete My Data'}
        onConfirm={() => { setShowDeleteConfirm(false); deleteMutation.mutate() }}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
        open={showDeleteConfirm}
      />
    </div>
  )
}

export default PDPAPage
