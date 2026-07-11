import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import {
  Shield, CheckCircle, AlertTriangle, Clock, FileDown,
  Activity, Scale,
} from 'lucide-react'
import { DataDeletionRequest } from '../../types/models'
import { auditLogService, type AuditLogEntry } from '../../services/auditLogService'
import toast from 'react-hot-toast'

// ─── Compliance framework definitions ───────────────────────
interface ComplianceCheck {
  id: string
  labelKey: string
  required: boolean
  framework: 'PDPA' | 'GDPR' | 'CCPA' | 'GENERAL'
}

const COMPLIANCE_CHECKS: Record<string, ComplianceCheck[]> = {
  TH: [
    { id: 'pdpa_consent', labelKey: 'compliance.checks.pdpa_consent', required: true, framework: 'PDPA' },
    { id: 'dpo', labelKey: 'compliance.checks.dpo', required: false, framework: 'PDPA' },
    { id: 'retention_policy', labelKey: 'compliance.checks.retention_policy', required: true, framework: 'PDPA' },
    { id: 'breach_procedure', labelKey: 'compliance.checks.breach_procedure', required: true, framework: 'PDPA' },
    { id: 'data_portability', labelKey: 'compliance.checks.data_portability', required: true, framework: 'PDPA' },
    { id: 'right_to_erasure', labelKey: 'compliance.checks.right_to_erasure', required: true, framework: 'PDPA' },
  ],
  VN: [
    { id: 'consent', labelKey: 'compliance.checks.consent', required: true, framework: 'PDPA' },
    { id: 'cross_border', labelKey: 'compliance.checks.cross_border', required: true, framework: 'PDPA' },
    { id: 'security', labelKey: 'compliance.checks.security', required: true, framework: 'PDPA' },
    { id: 'data_portability', labelKey: 'compliance.checks.data_portability', required: true, framework: 'PDPA' },
  ],
  ID: [
    { id: 'consent', labelKey: 'compliance.checks.explicit_consent', required: true, framework: 'PDPA' },
    { id: 'breach', labelKey: 'compliance.checks.breach', required: true, framework: 'PDPA' },
    { id: 'retention', labelKey: 'compliance.checks.retention', required: true, framework: 'PDPA' },
    { id: 'right_to_erasure', labelKey: 'compliance.checks.right_to_erasure', required: true, framework: 'PDPA' },
  ],
  EU: [
    { id: 'gdpr_consent', labelKey: 'compliance.checks.gdpr_consent', required: true, framework: 'GDPR' },
    { id: 'right_to_erasure', labelKey: 'compliance.checks.right_to_erasure', required: true, framework: 'GDPR' },
    { id: 'data_portability', labelKey: 'compliance.checks.data_portability', required: true, framework: 'GDPR' },
    { id: 'dpo', labelKey: 'compliance.checks.dpo', required: true, framework: 'GDPR' },
    { id: 'breach_notification', labelKey: 'compliance.checks.breach_notification', required: true, framework: 'GDPR' },
    { id: 'retention_policy', labelKey: 'compliance.checks.retention_policy', required: true, framework: 'GDPR' },
  ],
  US: [
    { id: 'ccpa_right_to_know', labelKey: 'compliance.checks.ccpa_right_to_know', required: true, framework: 'CCPA' },
    { id: 'ccpa_right_to_delete', labelKey: 'compliance.checks.ccpa_right_to_delete', required: true, framework: 'CCPA' },
    { id: 'ccpa_opt_out', labelKey: 'compliance.checks.ccpa_opt_out', required: true, framework: 'CCPA' },
    { id: 'ccpa_non_discrimination', labelKey: 'compliance.checks.ccpa_non_discrimination', required: true, framework: 'CCPA' },
  ],
}

const FRAMEWORK_LABELS: Record<string, { label: string; color: string }> = {
  PDPA: { label: 'PDPA', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  GDPR: { label: 'GDPR', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  CCPA: { label: 'CCPA', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  GENERAL: { label: 'General', color: 'bg-gray-100 text-gray-700 bg-surface/30 text-ink-faint' },
}

type Tab = 'overview' | 'consent' | 'retention' | 'requests' | 'audit'

export function CompliancePage() {
  const { t } = useTranslation('common')
  const company = useAuthStore(s => s.company)
  const country = company?.country || 'TH'
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const checks = COMPLIANCE_CHECKS[country] || COMPLIANCE_CHECKS.TH

  // ─── Data fetching ─────────────────────────────────────────
  const { data: consentStats } = useQuery({
    queryKey: ['compliance', 'consent-stats', company?.id],
    queryFn: async () => {
      const { count: total } = await supabase.from('pdpa_consents').select('*', { count: 'exact', head: true }).eq('company_id', company?.id)
      const { count: active } = await supabase.from('pdpa_consents').select('*', { count: 'exact', head: true }).eq('company_id', company?.id).eq('consent_given', true)
      return { total: total ?? 0, active: active ?? 0 }
    },
    enabled: !!company?.id,
  })

  const { data: deletionRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['compliance', 'deletions', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('data_deletion_requests').select('*').eq('company_id', company?.id).order('created_at', { ascending: false })
      return (data || []) as DataDeletionRequest[]
    },
    enabled: !!company?.id,
  })

  const { data: retentionPolicies } = useQuery({
    queryKey: ['compliance', 'retention', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('data_retention_policies').select('*').eq('company_id', company?.id).eq('is_active', true)
      return data || []
    },
    enabled: !!company?.id,
  })

  const { data: recentAuditLogs } = useQuery({
    queryKey: ['compliance', 'audit-recent', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const result = await auditLogService.getAuditLogs(company.id, { limit: 10 })
      return result.data
    },
    enabled: !!company?.id,
  })

  // ─── Mutations ─────────────────────────────────────────────
  const handleDeletion = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approved' | 'rejected' }) => {
      if (action === 'approved') {
        const req = deletionRequests?.find(r => r.id === requestId)
        if (req) await supabase.rpc('anonymize_candidate_data', { p_email: req.requester_email, p_company_id: company?.id })
      }
      await supabase.from('data_deletion_requests').update({ status: action === 'approved' ? 'completed' : 'rejected', completed_at: new Date().toISOString() }).eq('id', requestId)
    },
    onSuccess: (_, variables) => {
      toast.success(t(variables.action === 'approved' ? 'compliance.request_approved' : 'compliance.request_rejected'))
      queryClient.invalidateQueries({ queryKey: ['compliance', 'deletions'] })
    },
  })

  // ─── Compliance score ──────────────────────────────────────
  const passedChecks = checks.filter(c => !c.required || consentStats && consentStats.active > 0).length
  const complianceScore = Math.round((passedChecks / checks.length) * 100)

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: t('compliance.tab_overview') || 'Overview', icon: <Shield size={16} /> },
    { key: 'consent', label: t('compliance.tab_consent') || 'Consent', icon: <CheckCircle size={16} /> },
    { key: 'retention', label: t('compliance.tab_retention') || 'Retention', icon: <Clock size={16} /> },
    { key: 'requests', label: t('compliance.tab_requests') || 'Requests', icon: <FileDown size={16} /> },
    { key: 'audit', label: t('compliance.tab_audit') || 'Audit Log', icon: <Activity size={16} /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-headline-md font-bold text-ink">{t('compliance.title')}</h1>
        <p className="text-body-md text-ink-muted mt-1">{t('compliance.subtitle', { country })}</p>
      </div>

      {/* Compliance Score Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${complianceScore >= 80 ? 'bg-green-100 text-green-600' : complianceScore >= 50 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
              <Scale size={24} />
            </div>
            <div>
              <h3 className="text-title-lg font-semibold text-ink">{t('compliance.score_title') || 'Compliance Score'}</h3>
              <p className="text-sm text-ink-muted">{t('compliance.score_subtitle', { country }) || `${country} regulatory framework`}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${complianceScore >= 80 ? 'text-green-600' : complianceScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{complianceScore}%</p>
            <p className="text-xs text-ink-muted">{passedChecks}/{checks.length} {t('compliance.checks_passed') || 'checks passed'}</p>
          </div>
        </div>
        <div className="w-full bg-surface-sunken rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${complianceScore >= 80 ? 'bg-green-500' : complianceScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${complianceScore}%` }} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-sunken rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Framework Checks */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-primary" />
              <h3 className="font-semibold">{t('compliance.checklist_title', { country })}</h3>
            </div>
            <div className="space-y-2">
              {checks.map(check => {
                const framework = FRAMEWORK_LABELS[check.framework]
                return (
                  <div key={check.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-sunken">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${framework.color}`}>{framework.label}</span>
                      <span className="text-sm">{t(check.labelKey) || check.id}</span>
                    </div>
                    {check.required ? (
                      <AlertTriangle size={16} className="text-yellow-600" />
                    ) : (
                      <CheckCircle size={16} className="text-green-600" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-ink-muted">{t('compliance.active_consents') || 'Active Consents'}</p>
                <p className="text-xl font-bold text-ink">{consentStats?.active ?? 0}</p>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <FileDown size={20} className="text-secondary" />
              </div>
              <div>
                <p className="text-xs text-ink-muted">{t('compliance.pending_requests') || 'Pending Requests'}</p>
                <p className="text-xl font-bold text-ink">{deletionRequests?.filter(r => r.status === 'pending').length ?? 0}</p>
              </div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center">
                <Clock size={20} className="text-ink-faint" />
              </div>
              <div>
                <p className="text-xs text-ink-muted">{t('compliance.retention_policies') || 'Retention Policies'}</p>
                <p className="text-xl font-bold text-ink">{retentionPolicies?.length ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'consent' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} className="text-primary" />
            <h3 className="font-semibold">{t('compliance.consent_management') || 'Consent Management'}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-surface-sunken rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-ink">{consentStats?.total ?? 0}</p>
              <p className="text-xs text-ink-muted">{t('compliance.total_consents') || 'Total Consents'}</p>
            </div>
            <div className="bg-surface-sunken rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{consentStats?.active ?? 0}</p>
              <p className="text-xs text-ink-muted">{t('compliance.active_consents') || 'Active Consents'}</p>
            </div>
          </div>
          <p className="text-sm text-ink-muted">
            {t('compliance.consent_desc') || 'All data collection requires explicit user consent. Consent records include purpose, timestamp, IP address, and user agent for audit trail compliance.'}
          </p>
        </div>
      )}

      {activeTab === 'retention' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-primary" />
            <h3 className="font-semibold">{t('compliance.data_retention') || 'Data Retention Policies'}</h3>
          </div>
          {retentionPolicies && retentionPolicies.length > 0 ? (
            <div className="space-y-2">
              {retentionPolicies.map((policy: Record<string, unknown>) => (
                <div key={policy.id as string} className="flex items-center justify-between py-3 px-3 rounded-lg bg-surface-sunken border border-border">
                  <div>
                    <p className="text-sm font-medium text-ink">{policy.entity_type as string}</p>
                    <p className="text-xs text-ink-muted">{t('compliance.retention_action') || 'Action'}: {policy.action as string}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">{policy.retention_days as number} {t('compliance.days') || 'days'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border"><span className="text-ink-muted">{t('compliance.cv_data')}</span><span>{t('compliance.cv_data_retention')}</span></div>
              <div className="flex justify-between py-2 border-b border-border"><span className="text-ink-muted">{t('compliance.employee_data')}</span><span>{t('compliance.employee_data_retention')}</span></div>
              <div className="flex justify-between py-2"><span className="text-ink-muted">{t('compliance.chat_history')}</span><span>{t('compliance.chat_history_retention')}</span></div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileDown size={20} className="text-primary" />
            <h3 className="font-semibold">{t('compliance.data_subject_requests')}</h3>
          </div>
          {requestsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-sunken rounded-lg animate-shimmer" />)}</div>
          ) : deletionRequests?.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('empty.compliance_requests_title')}</p>
          ) : (
            <div className="space-y-2">
              {deletionRequests?.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">{req.requester_email}</p>
                    <p className="text-xs text-ink-muted">{req.request_type} · {req.created_at ? new Date(req.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      req.status === 'completed' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{req.status}</span>
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleDeletion.mutate({ requestId: req.id, action: 'approved' })} className="px-3 py-2 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100 min-h-[44px]">{t('compliance.approve')}</button>
                        <button onClick={() => handleDeletion.mutate({ requestId: req.id, action: 'rejected' })} className="px-3 py-2 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 min-h-[44px]">{t('compliance.reject')}</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-primary" />
              <h3 className="font-semibold">{t('compliance.recent_audit_logs') || 'Recent Audit Logs'}</h3>
            </div>
          </div>
          {recentAuditLogs && recentAuditLogs.length > 0 ? (
            <div className="space-y-2">
              {recentAuditLogs.map((log: AuditLogEntry) => (
                <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-sunken">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{log.action}</span>
                    <span className="text-sm text-ink-muted">{log.user_profiles?.full_name || 'System'}</span>
                  </div>
                  <span className="text-xs text-ink-muted">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{t('empty.audit_log_title')}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default CompliancePage
