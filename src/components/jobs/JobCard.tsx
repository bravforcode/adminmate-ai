import { Link } from 'react-router-dom'
import { MapPin, Clock, Users } from 'lucide-react'
import { JobStatusBadge } from './JobStatusBadge'

interface JobCardProps { job: any }

export function JobCard({ job }: JobCardProps) {
  return (
    <Link to={`/recruitment/jobs/${job.id}`} className="block bg-surface rounded-xl border border-outline-variant p-4 hover:border-primary hover:shadow-sm transition-all group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors">{job.title}</h3>
          <p className="text-sm text-on-surface-variant mt-0.5">{job.department}</p>
        </div>
        <JobStatusBadge status={job.status} />
      </div>
      <div className="flex items-center gap-3 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1"><MapPin size={12} /> {job.location || 'N/A'}</span>
        <span className="flex items-center gap-1"><Clock size={12} /> {job.employment_type?.replace('_', ' ')}</span>
        <span className="flex items-center gap-1"><Users size={12} /> {job.applications?.[0]?.count ?? 0} applicants</span>
      </div>
      {job.skills_required?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {job.skills_required.slice(0, 4).map((s: string) => (
            <span key={s} className="px-2 py-0.5 bg-surface-container-low rounded text-xs">{s}</span>
          ))}
          {job.skills_required.length > 4 && <span className="px-2 py-0.5 text-xs text-on-surface-variant">+{job.skills_required.length - 4}</span>}
        </div>
      )}
    </Link>
  )
}
