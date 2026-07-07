import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCandidate } from '../../hooks/useCandidates'
import { useAuthStore } from '../../stores/authStore'
import { CVUploader } from '../../components/candidates/CVUploader'
import { CVParseResult } from '../../components/candidates/CVParseResult'
import { CVDocument } from '../../types/models'
import { LoadingState } from '../../components/shared/LoadingState'
import { Button } from '../../components/ui/Button'
import { candidateService, type CandidateNote, type CandidateTimelineEvent } from '../../services/candidateService'
import { applicationService } from '../../services/applicationService'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  MapPin, Mail, Phone, ArrowLeft, Linkedin, Globe, UserCheck, UserX,
  Calendar, MessageSquare, Briefcase, FileText, StickyNote, Clock,
  BarChart3, ChevronDown, ChevronUp, Send, Star, ExternalLink,
} from 'lucide-react'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: candidate, isLoading } = useCandidate(id!)
  const company = useAuthStore(s => s.company)
  const user = useAuthStore(s => s.user)
  const latestCV = candidate?.cv_documents?.find((cv: CVDocument) => cv.is_current)

  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'documents' | 'notes' | 'timeline' | 'scores'>('overview')
  const [noteText, setNoteText] = useState('')
  const [expandedApp, setExpandedApp] = useState<string | null>(null)

  // Notes query
  const { data: notes } = useQuery({
    queryKey: ['candidate-notes', id],
    queryFn: () => candidateService.getNotes(id!, company!.id),
    enabled: !!id && !!company?.id,
  })

  // Timeline query
  const { data: timeline } = useQuery({
    queryKey: ['candidate-timeline', id],
    queryFn: () => candidateService.getTimeline(id!, company!.id),
    enabled: !!id && !!company?.id,
  })

  // Add note mutation
  const addNote = useMutation({
    mutationFn: (content: string) => candidateService.addNote(id!, company!.id, user!.id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate-notes', id] })
      setNoteText('')
      toast.success(t('recruitment.candidates.note_added', 'Note added'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Application status update
  const updateAppStatus = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) =>
      applicationService.updateStatus(appId, status, undefined, company?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
      toast.success(t('recruitment.toasts.status_updated', 'Status updated'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleAction = useCallback((action: string) => {
    if (!candidate) return
    switch (action) {
      case 'schedule':
        navigate(`/recruitment/interviews?candidate=${candidate.id}`)
        break
      case 'message':
        if (candidate.email) window.open(`mailto:${candidate.email}`, '_blank')
        break
    }
  }, [candidate, navigate])

  if (isLoading) return <LoadingState variant="detail" />
  if (!candidate) return <div className="p-8 text-center text-on-surface-variant">{t('recruitment.candidates.candidate_not_found', 'Candidate not found')}</div>

  const applications = candidate.applications ?? []
  const cvDocuments = candidate.cv_documents ?? []

  const tabs = [
    { key: 'overview', label: t('recruitment.candidates.tab_overview', 'Overview'), icon: FileText },
    { key: 'applications', label: t('recruitment.candidates.tab_applications', 'Applications'), icon: Briefcase, count: applications.length },
    { key: 'documents', label: t('recruitment.candidates.tab_documents', 'Documents'), icon: FileText, count: cvDocuments.length },
    { key: 'notes', label: t('recruitment.candidates.tab_notes', 'Notes'), icon: StickyNote, count: notes?.length ?? 0 },
    { key: 'timeline', label: t('recruitment.candidates.tab_timeline', 'Timeline'), icon: Clock },
    { key: 'scores', label: t('recruitment.candidates.tab_scores', 'AI Scores'), icon: BarChart3 },
  ] as const

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back Link */}
      <Link to="/recruitment/candidates" className="flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft size={16} /> {t('recruitment.candidates.back_to_candidates', 'Back to Candidates')}
      </Link>

      {/* Header Card */}
      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-2xl flex-shrink-0">
            {candidate.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-headline-md font-bold text-on-surface">{candidate.full_name}</h1>
                <p className="text-body-md text-on-surface-variant">{candidate.current_position || t('recruitment.candidates.title', 'Candidate')}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-on-surface-variant">
                  {candidate.email && <span className="flex items-center gap-1"><Mail size={14} /> {candidate.email}</span>}
                  {candidate.phone && <span className="flex items-center gap-1"><Phone size={14} /> {candidate.phone}</span>}
                  {candidate.location && <span className="flex items-center gap-1"><MapPin size={14} /> {candidate.location}</span>}
                  {candidate.linkedin_url && <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Linkedin size={14} /> LinkedIn</a>}
                  {candidate.portfolio_url && <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe size={14} /> {t('recruitment.candidates.portfolio', 'Portfolio')}</a>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleAction('schedule')} icon={<Calendar size={14} />}>
                  {t('recruitment.candidates.schedule_interview', 'Schedule')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAction('message')} icon={<MessageSquare size={14} />}>
                  {t('recruitment.candidates.send_message', 'Message')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-surface-container-low rounded-lg p-3 text-center">
            <p className="text-xs text-on-surface-variant">{t('recruitment.candidates.applications', 'Applications')}</p>
            <p className="text-lg font-bold text-on-surface">{applications.length}</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3 text-center">
            <p className="text-xs text-on-surface-variant">{t('recruitment.candidates.documents', 'Documents')}</p>
            <p className="text-lg font-bold text-on-surface">{cvDocuments.length}</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3 text-center">
            <p className="text-xs text-on-surface-variant">{t('recruitment.candidates.experience', 'Experience')}</p>
            <p className="text-lg font-bold text-on-surface">{candidate.experience_years ?? '—'} yrs</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3 text-center">
            <p className="text-xs text-on-surface-variant">{t('recruitment.candidates.source_label', 'Source')}</p>
            <p className="text-sm font-medium text-on-surface truncate">{candidate.source ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-container-low rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-surface shadow-sm text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
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
      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* CV Upload */}
            <div>
              <h3 className="text-sm font-semibold mb-3">{t('recruitment.candidates.upload_cv', 'Upload CV')}</h3>
              <CVUploader candidateId={candidate.id} companyId={company?.id ?? ''} />
            </div>

            {/* Parsed CV */}
            {latestCV && (
              <div className="p-4 bg-surface-container-low rounded-lg">
                <h3 className="text-sm font-semibold mb-3">{t('recruitment.candidates.parsed_cv_data', 'Parsed CV Data')}</h3>
                <CVParseResult cvDocument={latestCV} />
              </div>
            )}

            {/* Candidate Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">{t('recruitment.candidates.personal_info', 'Personal Information')}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('recruitment.candidates.full_name', 'Full Name')}</dt><dd className="text-on-surface font-medium">{candidate.full_name}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('recruitment.candidates.email', 'Email')}</dt><dd className="text-on-surface font-medium">{candidate.email ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('recruitment.candidates.phone', 'Phone')}</dt><dd className="text-on-surface font-medium">{candidate.phone ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('recruitment.candidates.location', 'Location')}</dt><dd className="text-on-surface font-medium">{candidate.location ?? '—'}</dd></div>
                </dl>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">{t('recruitment.candidates.professional_info', 'Professional Information')}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('recruitment.candidates.current_position', 'Current Position')}</dt><dd className="text-on-surface font-medium">{candidate.current_position ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('recruitment.candidates.experience_years', 'Experience')}</dt><dd className="text-on-surface font-medium">{candidate.experience_years != null ? `${candidate.experience_years} years` : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('recruitment.candidates.source_label', 'Source')}</dt><dd className="text-on-surface font-medium">{candidate.source ?? '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-on-surface-variant">{t('recruitment.candidates.language', 'Language')}</dt><dd className="text-on-surface font-medium">{candidate.preferred_language ?? '—'}</dd></div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="space-y-3">
            {applications.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">{t('recruitment.candidates.no_applications', 'No applications yet')}</p>
            ) : (
              applications.map((app: Record<string, unknown>) => (
                <div key={app.id as string} className="border border-outline-variant rounded-lg p-4">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedApp(expandedApp === (app.id as string) ? null : (app.id as string))}>
                    <div className="flex items-center gap-3">
                      <Briefcase size={16} className="text-on-surface-variant" />
                      <div>
                        <p className="text-sm font-medium text-on-surface">{(app.jobs as Record<string, unknown>)?.title as string ?? 'Unknown Position'}</p>
                        <p className="text-xs text-on-surface-variant">Applied {formatDate(app.created_at as string)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'hired' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        app.status === 'interviewing' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{app.status as string}</span>
                      {expandedApp === (app.id as string) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  {expandedApp === (app.id as string) && (
                    <div className="mt-4 pt-4 border-t border-outline-variant space-y-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateAppStatus.mutate({ appId: app.id as string, status: 'shortlisted' })} icon={<UserCheck size={14} />} disabled={updateAppStatus.isPending}>
                          {t('recruitment.candidates.shortlist', 'Shortlist')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateAppStatus.mutate({ appId: app.id as string, status: 'interviewing' })} icon={<Calendar size={14} />} disabled={updateAppStatus.isPending}>
                          {t('recruitment.candidates.move_to_interview', 'Interview')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateAppStatus.mutate({ appId: app.id as string, status: 'hired' })} icon={<Star size={14} />} disabled={updateAppStatus.isPending}>
                          {t('recruitment.candidates.hire', 'Hire')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => updateAppStatus.mutate({ appId: app.id as string, status: 'rejected' })} icon={<UserX size={14} />} disabled={updateAppStatus.isPending} className="text-error hover:text-error">
                          {t('recruitment.candidates.reject', 'Reject')}
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/recruitment/pipeline?job=${app.job_id}`)} icon={<ExternalLink size={14} />}>
                        {t('recruitment.candidates.view_in_pipeline', 'View in Pipeline')}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <CVUploader candidateId={candidate.id} companyId={company?.id ?? ''} />
            {cvDocuments.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">{t('recruitment.candidates.no_documents', 'No documents uploaded')}</p>
            ) : (
              <div className="space-y-2">
                {cvDocuments.map((cv: CVDocument) => (
                  <div key={cv.id} className="flex items-center justify-between p-3 border border-outline-variant rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-on-surface-variant" />
                      <div>
                        <p className="text-sm font-medium text-on-surface">{cv.file_name ?? 'CV Document'}</p>
                        <p className="text-xs text-on-surface-variant">
                          {cv.file_size ? `${(cv.file_size / 1024).toFixed(1)} KB` : ''} {cv.is_current && <span className="text-primary ml-1">• Current</span>}
                        </p>
                      </div>
                    </div>
                    {cv.file_url && (
                      <a href={cv.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">{t('recruitment.candidates.view', 'View')}</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={t('recruitment.candidates.add_note_placeholder', 'Add a note about this candidate...')}
                className="flex-1 p-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-sm resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                rows={3}
              />
              <Button
                variant="default"
                size="sm"
                onClick={() => { if (noteText.trim()) addNote.mutate(noteText.trim()) }}
                disabled={!noteText.trim() || addNote.isPending}
                icon={<Send size={14} />}
                className="self-end"
              >
                {t('recruitment.candidates.add_note', 'Add')}
              </Button>
            </div>
            {!notes || notes.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">{t('recruitment.candidates.no_notes', 'No notes yet')}</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note: CandidateNote) => (
                  <div key={note.id} className="p-4 bg-surface-container-low rounded-lg">
                    <p className="text-sm text-on-surface whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-on-surface-variant mt-2">{formatDateTime(note.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-0">
            {!timeline || timeline.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">{t('recruitment.candidates.no_timeline', 'No timeline events')}</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-outline-variant" />
                <div className="space-y-6">
                  {timeline.map((event: CandidateTimelineEvent) => (
                    <div key={event.id} className="relative pl-10">
                      <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-primary border-2 border-surface" />
                      <div>
                        <p className="text-sm font-medium text-on-surface">{event.description}</p>
                        <p className="text-xs text-on-surface-variant">{formatDateTime(event.created_at)}</p>
                        {event.event_type && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{event.event_type}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Scores Tab */}
        {activeTab === 'scores' && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant">
              <h3 className="text-sm font-semibold text-on-surface mb-2">{t('recruitment.candidates.ai_scoring', 'AI Scoring')}</h3>
              <p className="text-sm text-on-surface-variant">
                {t('recruitment.candidates.ai_scoring_desc', 'AI scores are generated based on candidate data and job requirements. All scores require HR review and override.')}
              </p>
            </div>
            {applications.filter((a: Record<string, unknown>) => a.ai_match_score != null).length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-8">{t('recruitment.candidates.no_scores', 'No AI scores available yet')}</p>
            ) : (
              <div className="space-y-3">
                {applications
                  .filter((a: Record<string, unknown>) => a.ai_match_score != null)
                  .map((app: Record<string, unknown>) => (
                    <div key={app.id as string} className="flex items-center justify-between p-4 border border-outline-variant rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-on-surface">{(app.jobs as Record<string, unknown>)?.title as string ?? 'Unknown'}</p>
                        <p className="text-xs text-on-surface-variant">{t('recruitment.candidates.match_score', 'Match Score')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{app.ai_match_score as number}%</p>
                        <p className="text-xs text-on-surface-variant">{t('recruitment.candidates.hr_review_required', 'HR review required')}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                {t('recruitment.candidates.ai_disclaimer', 'AI scores are advisory only. All hiring decisions must be made by HR. Scores do not auto-reject candidates.')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CandidateDetailPage
