import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Briefcase, Mail, Phone, Calendar, Building2, Shield, FileText, TrendingUp } from 'lucide-react'
import { useEmployee } from '../../hooks/useEmployees'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/shared/EmptyState'
import { ErrorState } from '../../components/shared/ErrorState'
import { LoadingState } from '../../components/shared/LoadingState'
import type { Employee } from '../../services/hris/employeeService'

type Tab = 'overview' | 'timeline' | 'documents' | 'performance'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  draft: 'bg-gray-100 text-gray-800 bg-surface/30 text-ink-faint',
  on_leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  offboarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-gray-100 text-gray-600 bg-surface/30 text-ink-muted',
}

function maskPhone(phone?: string): string {
  if (!phone || phone.length < 4) return '***'
  return phone.slice(0, -4) + '****'
}

function maskEmail(email?: string): string {
  if (!email) return '***'
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const maskedLocal = local.length <= 2 ? '**' : local[0] + '***' + local[local.length - 1]
  return `${maskedLocal}@${domain}`
}

function InfoRow({ icon: Icon, label, value, masked }: { icon: React.ElementType; label: string; value?: string; masked?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={16} className="text-ink-variant text-ink-variant mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-ink-variant text-ink-variant">{label}</p>
        <p className="text-sm text-ink font-medium">{masked ? maskEmail(value) : value}</p>
      </div>
    </div>
  )
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const { data: employee, isLoading, isError, error, refetch } = useEmployee(id || '')

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Briefcase },
    { key: 'timeline', label: 'Timeline', icon: Clock },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'performance', label: 'Performance', icon: TrendingUp },
  ]

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} icon={<ArrowLeft size={16} />}>
          Back to Employees
        </Button>
        <ErrorState title="Failed to load employee" message={(error as Error)?.message || ''} onRetry={() => refetch()} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} icon={<ArrowLeft size={16} />}>
          Back to Employees
        </Button>
        <LoadingState variant="detail" message="Loading employee..." />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} icon={<ArrowLeft size={16} />}>
          Back to Employees
        </Button>
        <EmptyState icon={Briefcase} title="Employee not found" description="This employee record doesn't exist or has been removed" />
      </div>
    )
  }

  const emp = employee as Employee & {
    employee_profiles?: { display_name?: string; first_name?: string; last_name?: string }
    user_profiles?: { full_name?: string; email?: string; avatar_url?: string }
  }

  const displayName = emp.employee_profiles?.display_name || emp.job_title || 'Employee'
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const statusStyle = STATUS_STYLES[emp.employment_status] || STATUS_STYLES.inactive

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} icon={<ArrowLeft size={16} />}>
          Back to Employees
        </Button>
      </div>

      {/* Header Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-container dark:bg-primary-container text-white-container dark:text-primary-muted flex items-center justify-center font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-headline-md font-bold text-ink text-ink">{displayName}</h1>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
                {emp.employment_status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-body-md text-ink-variant text-ink-variant mt-1">{emp.job_title}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-ink-variant text-ink-variant">
              <span className="flex items-center gap-1"><Briefcase size={14} /> {emp.employment_type.replace('_', ' ')}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> Hired {emp.hire_date}</span>
              {emp.employee_number && <span className="flex items-center gap-1"><Shield size={14} /> {emp.employee_number}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary dark:border-accent-dim dark:text-primary-muted'
                : 'border-transparent text-ink-variant text-ink-variant hover:text-ink dark:hover:text-ink'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <Mail size={16} /> Contact Information
            </h3>
            <div className="space-y-1">
              <InfoRow icon={Mail} label="Work Email" value={emp.work_email} masked />
              <InfoRow icon={Mail} label="Personal Email" value={emp.personal_email} masked />
              <InfoRow icon={Phone} label="Phone" value={maskPhone(emp.phone)} />
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <Briefcase size={16} /> Employment Details
            </h3>
            <div className="space-y-1">
              <InfoRow icon={Briefcase} label="Job Title" value={emp.job_title} />
              <InfoRow icon={Briefcase} label="Position Level" value={emp.position_level} />
              <InfoRow icon={Calendar} label="Hire Date" value={emp.hire_date} />
              <InfoRow icon={Calendar} label="Start Date" value={emp.start_date} />
              {emp.end_date && <InfoRow icon={Calendar} label="End Date" value={emp.end_date} />}
              {emp.probation_end_date && <InfoRow icon={Calendar} label="Probation End" value={emp.probation_end_date} />}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <Shield size={16} /> Emergency Contact
            </h3>
            <div className="space-y-1">
              <InfoRow icon={Shield} label="Name" value={emp.emergency_contact_name} />
              <InfoRow icon={Phone} label="Phone" value={maskPhone(emp.emergency_contact_phone)} />
            </div>
            {!emp.emergency_contact_name && !emp.emergency_contact_phone && (
              <p className="text-sm text-ink-variant/60 text-ink-variant/60">No emergency contact on file</p>
            )}
          </div>

          {/* System Info */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <Building2 size={16} /> System Information
            </h3>
            <div className="space-y-1">
              <InfoRow icon={Building2} label="Country" value={emp.country_code} />
              <InfoRow icon={Clock} label="Timezone" value={emp.timezone} />
              <InfoRow icon={Calendar} label="Created" value={emp.created_at ? new Date(emp.created_at).toLocaleDateString() : undefined} />
              <InfoRow icon={Calendar} label="Updated" value={emp.updated_at ? new Date(emp.updated_at).toLocaleDateString() : undefined} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <EmptyState icon={Clock} title="Timeline" description="Employee timeline events will be displayed here" />
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <EmptyState icon={FileText} title="Documents" description="Employee documents and files will be displayed here" />
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <EmptyState icon={TrendingUp} title="Performance" description="Performance reviews and metrics will be displayed here" />
        </div>
      )}
    </div>
  )
}

export default EmployeeDetailPage
