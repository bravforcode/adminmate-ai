import { memo } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Mail, Phone, Sparkles } from 'lucide-react'
import { Candidate, CVDocument } from '../../types/models'

interface CandidateCardProps { candidate: Candidate }

export const CandidateCard = memo(function CandidateCard({ candidate }: CandidateCardProps) {
  const latestCV = candidate.cv_documents?.find((cv: CVDocument) => cv.is_current)
  const matchScore = candidate.applications?.[0]?.ai_match_score
  const initials = candidate.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <Link to={`/recruitment/candidates/${candidate.id}`}
      className="block bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline p-4 hover:border-primary dark:hover:border-primary hover:shadow-sm transition-all group card-hover">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-container dark:bg-primary-container text-on-primary-container dark:text-accent-dim flex items-center justify-center font-bold text-lg flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-on-surface dark:text-on-surface group-hover:text-primary dark:group-hover:text-accent-dim transition-colors">{candidate.full_name}</h3>
          <p className="text-sm text-on-surface-variant dark:text-on-surface-variant">{candidate.current_position || 'Candidate'}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-on-surface-variant dark:text-on-surface-variant">
            {candidate.location && <span className="flex items-center gap-1"><MapPin size={12} /> {candidate.location}</span>}
            {candidate.email && <span className="flex items-center gap-1"><Mail size={12} /> {candidate.email}</span>}
            {candidate.phone && <span className="flex items-center gap-1"><Phone size={12} /> {candidate.phone}</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {matchScore != null && (
            <div className="flex items-center gap-1 text-primary font-bold text-sm">
              <Sparkles size={14} /> {matchScore}%
            </div>
          )}
          {latestCV && <span className="inline-block mt-1 px-2 py-0.5 bg-surface-container-low dark:bg-surface-container-low rounded text-xs">CV attached</span>}
        </div>
      </div>
    </Link>
  )
})

export default CandidateCard
