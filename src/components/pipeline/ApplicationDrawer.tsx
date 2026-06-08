import { useUpdateApplicationStatus } from '../../hooks/useApplications'
import { useTriggerAIScreening } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { PIPELINE_STAGES } from '../../utils/constants'
import { X, Sparkles, MapPin, Mail, Phone, Lightbulb, RefreshCw } from 'lucide-react'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

interface ApplicationDrawerProps { application: any; onClose: () => void }

export function ApplicationDrawer({ application, onClose }: ApplicationDrawerProps) {
  const updateStatus = useUpdateApplicationStatus()
  const triggerAI = useTriggerAIScreening()
  const company = useAuthStore(s => s.company)
  const candidate = application.candidates
  const latestCV = application.cv_documents?.find((cv: any) => cv.is_current)
  const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === application.status)

  const handleScreen = async () => {
    if (!latestCV) { toast.error('No CV available for screening'); return }
    await triggerAI.mutateAsync({ applicationId: application.id, jobId: application.job_id, cvDocumentId: latestCV.id, companyId: company?.id ?? '' })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface h-full overflow-y-auto shadow-xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-surface-container rounded-lg"><X size={20} /></button>

        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-2xl mb-3">
            {candidate?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <h2 className="text-headline-md font-bold text-on-surface">{candidate?.full_name}</h2>
          <p className="text-body-md text-on-surface-variant">{candidate?.current_position || 'Candidate'}</p>
          <div className="flex gap-3 mt-2 text-xs text-on-surface-variant">
            {candidate?.email && <span className="flex items-center gap-1"><Mail size={12} /> {candidate.email}</span>}
            {candidate?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {candidate.phone}</span>}
            {candidate?.location && <span className="flex items-center gap-1"><MapPin size={12} /> {candidate.location}</span>}
          </div>
        </div>

        {application.ai_match_score != null && (
          <div className="bg-surface-container-low rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={16} className="text-primary" /> AI Match Score</h3>
              <span className="text-lg font-bold text-primary">{application.ai_match_score}%</span>
            </div>
            {application.ai_summary && <p className="text-sm text-on-surface-variant mb-3">{application.ai_summary}</p>}
            {application.ai_missing_skills?.length > 0 && (
              <div className="mb-3"><h4 className="text-xs font-semibold text-on-surface-variant mb-1">Missing Skills</h4>
                <div className="flex flex-wrap gap-1">{application.ai_missing_skills.map((s: string) => <span key={s} className="px-2 py-0.5 bg-error-container/30 text-error text-xs rounded">{s}</span>)}</div>
              </div>
            )}
            {application.ai_suggested_questions?.length > 0 && (
              <div><h4 className="text-xs font-semibold text-on-surface-variant mb-1 flex items-center gap-1"><Lightbulb size={12} /> Suggested Interview Questions</h4>
                <ul className="text-xs text-on-surface-variant space-y-1 pl-3">{application.ai_suggested_questions.map((q: string, i: number) => <li key={i} className="italic">"{q}"</li>)}</ul>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <button onClick={handleScreen} disabled={triggerAI.isPending || !latestCV}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <RefreshCw size={14} className={triggerAI.isPending ? 'animate-spin' : ''} />
            {triggerAI.isPending ? 'Screening...' : 'Screen with AI'}
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Move to</h3>
          <div className="grid grid-cols-3 gap-2">
            {PIPELINE_STAGES.filter(s => s.id !== application.status && s.id !== 'rejected').map(stage => (
              <button key={stage.id} onClick={() => updateStatus.mutate({ id: application.id, status: stage.id })}
                className={cn('px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:border-primary', application.status === stage.id ? 'bg-primary-container/15 border-primary text-primary' : 'border-outline-variant text-on-surface-variant')}>
                {stage.labelKey}
              </button>
            ))}
          </div>
        </div>

        {latestCV?.parsed_content && (
          <div className="p-4 bg-surface-container-low rounded-lg">
            <h3 className="text-sm font-semibold mb-3">Parsed CV Data</h3>
            <pre className="text-xs text-on-surface-variant whitespace-pre-wrap font-mono">{JSON.stringify(latestCV.parsed_content, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
