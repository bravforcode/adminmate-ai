import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useJob, useUpdateJob } from '../../hooks/useJobs'
import { useApplications } from '../../hooks/useApplications'
import { JobStatusBadge } from '../../components/jobs/JobStatusBadge'
import { LoadingState } from '../../components/shared/LoadingState'
import { Button } from '../../components/ui/Button'
import { jobService } from '../../services/jobService'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import {
  MapPin, Clock, Users, DollarSign, Calendar, ArrowLeft, Share2, QrCode,
  Edit3, BarChart3, ExternalLink, Copy, Briefcase, Eye,
} from 'lucide-react'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null) {
  if (!min && !max) return '—'
  const fmt = (n: number) => n.toLocaleString()
  if (min && max) return `${fmt(min)} – ${fmt(max)} ${currency ?? ''}`
  if (min) return `From ${fmt(min)} ${currency ?? ''}`
  return `Up to ${fmt(max!)} ${currency ?? ''}`
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const company = useAuthStore(s => s.company)
  const { data: job, isLoading } = useJob(id!)
  const { data: applications } = useApplications(id!)
  const updateJob = useUpdateJob()

  const [activeTab, setActiveTab] = useState<'overview' | 'applicants' | 'analytics'>('overview')
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success(t('recruitment.jobs.link_copied', 'Link copied to clipboard'))
    } catch {
      toast.error(t('recruitment.jobs.copy_failed', 'Failed to copy'))
    }
  }, [shareLink, t])

  const handleGenerateShareLink = useCallback(async () => {
    if (!id || !company?.id) return
    try {
      const link = await jobService.generateShareLink(id, company.id)
      setShareLink(link)
      toast.success(t('recruitment.jobs.share_link_generated', 'Share link generated'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate link')
    }
  }, [id, company?.id, t])

  const handlePublish = useCallback(async () => {
    if (!id) return
    try {
      await updateJob.mutateAsync({ id, data: { status: 'published' } })
      toast.success(t('recruitment.jobs.published', 'Job published'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to publish')
    }
  }, [id, updateJob, t])

  const handleClose = useCallback(async () => {
    if (!id) return
    try {
      await updateJob.mutateAsync({ id, data: { status: 'closed' } })
      toast.success(t('recruitment.jobs.closed', 'Job closed'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to close')
    }
  }, [id, updateJob, t])

  if (isLoading) return <LoadingState variant="detail" />
  if (!job) return <div className="p-8 text-center text-ink-muted">{t('recruitment.jobs.job_not_found', 'Job not found')}</div>

  const appList = applications ?? []
  const statusCounts = appList.reduce((acc: Record<string, number>, app) => {
    const s = app.status ?? 'unknown'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const tabs = [
    { key: 'overview', label: t('recruitment.jobs.tab_overview', 'Overview'), icon: Eye },
    { key: 'applicants', label: t('recruitment.jobs.tab_applicants', 'Applicants'), icon: Users, count: appList.length },
    { key: 'analytics', label: t('recruitment.jobs.tab_analytics', 'Analytics'), icon: BarChart3 },
  ] as const

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back Link */}
      <Link to="/recruitment/jobs" className="flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft size={16} /> {t('recruitment.jobs.back_to_jobs', 'Back to Jobs')}
      </Link>

      {/* Header Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-headline-lg font-bold text-ink">{job.title}</h1>
            <p className="text-body-lg text-ink-muted mt-1">{job.department}</p>
          </div>
          <div className="flex items-center gap-2">
            <JobStatusBadge status={job.status} />
            {job.status === 'draft' && (
              <Button variant="default" size="sm" onClick={handlePublish} disabled={updateJob.isPending}>
                {t('recruitment.jobs.publish', 'Publish')}
              </Button>
            )}
            {job.status === 'published' && (
              <Button variant="outline" size="sm" onClick={handleClose} disabled={updateJob.isPending}>
                {t('recruitment.jobs.close_job', 'Close')}
              </Button>
            )}
          </div>
        </div>

        {/* Job Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-ink-muted mb-4">
          {job.location && <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>}
          {job.employment_type && <span className="flex items-center gap-1"><Clock size={14} /> {job.employment_type.replace('_', ' ')}</span>}
          {job.headcount != null && <span className="flex items-center gap-1"><Users size={14} /> {t('recruitment.jobs.headcount_positions', '{{count}} position(s)', { count: job.headcount })}</span>}
          {(job.salary_min || job.salary_max) && <span className="flex items-center gap-1"><DollarSign size={14} /> {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>}
          {job.application_deadline && <span className="flex items-center gap-1"><Calendar size={14} /> {t('recruitment.jobs.deadline', 'Deadline')}: {formatDate(job.application_deadline)}</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/recruitment/jobs?edit=${id}`)} icon={<Edit3 size={14} />}>
            {t('recruitment.jobs.edit_job', 'Edit')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateShareLink} icon={<Share2 size={14} />}>
            {t('recruitment.jobs.share', 'Share')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/recruitment/pipeline?job=${id}`)} icon={<Briefcase size={14} />}>
            {t('recruitment.jobs.view_pipeline', 'Pipeline')}
          </Button>
        </div>

        {/* Share Link */}
        {shareLink && (
          <div className="mt-4 p-3 bg-surface-sunken rounded-lg flex items-center gap-2">
            <input
              readOnly
              value={shareLink}
              className="flex-1 text-sm bg-transparent outline-none text-ink"
            />
            <Button variant="ghost" size="icon_sm" onClick={handleCopyLink} icon={<Copy size={14} />} title={t('recruitment.jobs.copy', 'Copy')} />
            <Button variant="ghost" size="icon_sm" onClick={() => setShowQR(!showQR)} icon={<QrCode size={14} />} title={t('recruitment.jobs.qr_code', 'QR Code')} />
            <a href={shareLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* QR Code placeholder */}
        {showQR && shareLink && (
          <div className="mt-3 p-4 bg-white rounded-lg inline-block">
            <div className="w-40 h-40 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              QR Code: {shareLink}
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-sunken rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-surface shadow-sm text-ink'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {'count' in tab && tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-surface rounded-xl border border-border p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {job.description && (
              <div>
                <h3 className="font-semibold mb-2">{t('recruitment.jobs.description', 'Description')}</h3>
                <p className="text-sm text-ink-muted whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
            {job.description_th && (
              <div>
                <h3 className="font-semibold mb-2">{t('recruitment.jobs.description_th', 'Description (Thai)')}</h3>
                <p className="text-sm text-ink-muted whitespace-pre-wrap">{job.description_th}</p>
              </div>
            )}
            {job.responsibilities?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{t('recruitment.jobs.responsibilities', 'Responsibilities')}</h3>
                <ul className="list-disc pl-5 text-sm text-ink-muted space-y-1">{job.responsibilities.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
            {job.requirements?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{t('recruitment.jobs.requirements', 'Requirements')}</h3>
                <ul className="list-disc pl-5 text-sm text-ink-muted space-y-1">{job.requirements.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
            {job.nice_to_have?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{t('recruitment.jobs.nice_to_have', 'Nice to Have')}</h3>
                <ul className="list-disc pl-5 text-sm text-ink-muted space-y-1">{(job.nice_to_have as string[]).map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
            {job.skills_required?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{t('recruitment.jobs.skills_required', 'Required Skills')}</h3>
                <div className="flex flex-wrap gap-2">{job.skills_required.map((s: string) => <span key={s} className="px-3 py-1 bg-primary-container/15 text-primary rounded-full text-xs font-medium">{s}</span>)}</div>
              </div>
            )}
            {job.experience_level && (
              <div>
                <h3 className="font-semibold mb-2">{t('recruitment.jobs.experience_level', 'Experience Level')}</h3>
                <p className="text-sm text-ink-muted">{job.experience_level}</p>
              </div>
            )}
          </div>
        )}

        {/* Applicants Tab */}
        {activeTab === 'applicants' && (
          <div className="space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="bg-surface-sunken rounded-lg p-3 text-center">
                  <p className="text-xs text-ink-muted capitalize">{status}</p>
                  <p className="text-lg font-bold text-ink">{count}</p>
                </div>
              ))}
            </div>

            {/* Applicant List */}
            {appList.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-8">{t('recruitment.jobs.no_applicants', 'No applicants yet')}</p>
            ) : (
              <div className="space-y-2">
                {appList.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface-sunken transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-white-container flex items-center justify-center text-xs font-bold">
                        {app.candidates?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{app.candidates?.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-ink-muted">{app.candidates?.current_position ?? ''} • Applied {formatDate(app.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {app.ai_match_score != null && (
                        <span className="text-xs font-medium text-primary">{app.ai_match_score}%</span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'hired' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        app.status === 'interviewing' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{app.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface-sunken rounded-lg p-4 text-center">
                <p className="text-xs text-ink-muted">{t('recruitment.jobs.total_applicants', 'Total')}</p>
                <p className="text-2xl font-bold text-ink">{appList.length}</p>
              </div>
              <div className="bg-surface-sunken rounded-lg p-4 text-center">
                <p className="text-xs text-ink-muted">{t('recruitment.jobs.shortlisted', 'Shortlisted')}</p>
                <p className="text-2xl font-bold text-primary">{statusCounts['shortlisted'] ?? 0}</p>
              </div>
              <div className="bg-surface-sunken rounded-lg p-4 text-center">
                <p className="text-xs text-ink-muted">{t('recruitment.jobs.interviewing', 'Interviewing')}</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts['interviewing'] ?? 0}</p>
              </div>
              <div className="bg-surface-sunken rounded-lg p-4 text-center">
                <p className="text-xs text-ink-muted">{t('recruitment.jobs.hired', 'Hired')}</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts['hired'] ?? 0}</p>
              </div>
            </div>

            {/* Pipeline Visual */}
            <div>
              <h3 className="font-semibold mb-3">{t('recruitment.jobs.pipeline_funnel', 'Pipeline Funnel')}</h3>
              <div className="space-y-2">
                {['applied', 'screening', 'shortlisted', 'interviewing', 'offered', 'hired'].map(stage => {
                  const count = statusCounts[stage] ?? 0
                  const maxCount = Math.max(...Object.values(statusCounts), 1)
                  const widthPct = Math.max((count / maxCount) * 100, 5)
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="text-xs text-ink-muted w-24 capitalize">{stage}</span>
                      <div className="flex-1 bg-surface-sunken rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-primary/20 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${widthPct}%` }}
                        >
                          {count > 0 && <span className="text-xs font-medium text-primary">{count}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Headcount Progress */}
            {job.headcount != null && job.headcount > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{t('recruitment.jobs.headcount_progress', 'Headcount Progress')}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-surface-sunken rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min(((statusCounts['hired'] ?? 0) / job.headcount) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-ink">{statusCounts['hired'] ?? 0} / {job.headcount}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default JobDetailPage
