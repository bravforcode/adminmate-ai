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
      className="block bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-4 hover:border-primary dark:hover:border-[#3b82f6] hover:shadow-sm transition-all group card-hover">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-container dark:bg-[#1e40af] text-on-primary-container dark:text-[#93c5fd] flex items-center justify-center font-bold text-lg flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-on-surface dark:text-[#f1f5f9] group-hover:text-primary dark:group-hover:text-[#93c5fd] transition-colors">{candidate.full_name}</h3>
          <p className="text-sm text-on-surface-variant dark:text-[#94a3b8]">{candidate.current_position || 'Candidate'}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-on-surface-variant dark:text-[#94a3b8]">
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
          {latestCV && <span className="inline-block mt-1 px-2 py-0.5 bg-surface-container-low dark:bg-[#1e3a5f] rounded text-xs">CV attached</span>}
        </div>
      </div>
    </Link>
  )
})

export default CandidateCard
