import { useParams, Link } from 'react-router-dom'
import { useJob } from '../../hooks/useJobs'
import { JobStatusBadge } from '../../components/jobs/JobStatusBadge'
import { MapPin, Clock, Users, DollarSign, Calendar, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: job, isLoading } = useJob(id!)
  const { t } = useTranslation('recruitment')

  if (isLoading) return <div className="p-8 text-center text-on-surface-variant">Loading...</div>
  if (!job) return <div className="p-8 text-center text-on-surface-variant">Job not found</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/recruitment/jobs" className="flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft size={16} /> Back to Jobs</Link>
      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-headline-lg font-bold text-on-surface">{job.title}</h1>
            <p className="text-body-lg text-on-surface-variant mt-1">{job.department}</p>
          </div>
          <JobStatusBadge status={job.status} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant mb-6">
          <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {job.employment_type?.replace('_', ' ')}</span>
          <span className="flex items-center gap-1"><Users size={14} /> {job.headcount} position(s)</span>
          {job.salary_min && <span className="flex items-center gap-1"><DollarSign size={14} /> {job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString()} {job.salary_currency}</span>}
          {job.application_deadline && <span className="flex items-center gap-1"><Calendar size={14} /> Deadline: {job.application_deadline}</span>}
        </div>
        {job.description && <div className="mb-6"><h3 className="font-semibold mb-2">Description</h3><p className="text-sm text-on-surface-variant whitespace-pre-wrap">{job.description}</p></div>}
        {job.responsibilities?.length > 0 && (
          <div className="mb-6"><h3 className="font-semibold mb-2">Responsibilities</h3><ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">{job.responsibilities.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>
        )}
        {job.requirements?.length > 0 && (
          <div className="mb-6"><h3 className="font-semibold mb-2">Requirements</h3><ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">{job.requirements.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>
        )}
        {job.skills_required?.length > 0 && (
          <div><h3 className="font-semibold mb-2">Required Skills</h3><div className="flex flex-wrap gap-2">{job.skills_required.map((s: string) => <span key={s} className="px-3 py-1 bg-primary-container/15 text-primary rounded-full text-xs font-medium">{s}</span>)}</div></div>
        )}
      </div>
    </div>
  )
}

export default JobDetailPage
