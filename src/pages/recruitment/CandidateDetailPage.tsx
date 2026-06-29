import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCandidate } from '../../hooks/useCandidates'
import { useAuthStore } from '../../stores/authStore'
import { CVUploader } from '../../components/candidates/CVUploader'
import { CVParseResult } from '../../components/candidates/CVParseResult'
import { CVDocument } from '../../types/models'
import { LoadingState } from '../../components/shared/LoadingState'
import { MapPin, Mail, Phone, ArrowLeft, Linkedin, Globe } from 'lucide-react'

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { data: candidate, isLoading } = useCandidate(id!)
  const company = useAuthStore(s => s.company)
  const latestCV = candidate?.cv_documents?.find((cv: CVDocument) => cv.is_current)

  if (isLoading) return <LoadingState variant="detail" />
  if (!candidate) return <div className="p-8 text-center text-on-surface-variant">{t('recruitment.candidates.candidate_not_found', 'Candidate not found')}</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/recruitment/candidates" className="flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft size={16} /> {t('recruitment.candidates.back_to_candidates', 'Back to Candidates')}</Link>
      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-2xl flex-shrink-0">
            {candidate.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
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
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">{t('recruitment.candidates.upload_cv', 'Upload CV')}</h3>
          <CVUploader candidateId={candidate.id} companyId={company?.id ?? ''} />
        </div>

        {latestCV && (
          <div className="p-4 bg-surface-container-low rounded-lg">
            <h3 className="text-sm font-semibold mb-3">{t('recruitment.candidates.parsed_cv_data', 'Parsed CV Data')}</h3>
            <CVParseResult cvDocument={latestCV} />
          </div>
        )}
      </div>
    </div>
  )
}

export default CandidateDetailPage
