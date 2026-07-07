import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, Briefcase } from 'lucide-react'
import type { Employee } from '../../services/hris/employeeService'

interface EmployeeCardProps {
  employee: Employee & { employee_profiles?: { display_name?: string; first_name?: string; last_name?: string } }
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  on_leave: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  offboarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-500',
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

export const EmployeeCard = memo(function EmployeeCard({ employee }: EmployeeCardProps) {
  const displayName = employee.employee_profiles?.display_name || employee.job_title || 'Employee'
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const statusStyle = STATUS_STYLES[employee.employment_status] || STATUS_STYLES.inactive

  return (
    <Link
      to={`/employees/${employee.id}`}
      className="block bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline p-4 hover:border-primary dark:hover:border-primary hover:shadow-sm transition-all group card-hover"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-container dark:bg-primary-container text-on-primary-container dark:text-accent-dim flex items-center justify-center font-bold text-lg flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-on-surface dark:text-on-surface group-hover:text-primary dark:group-hover:text-accent-dim transition-colors truncate">
            {displayName}
          </h3>
          <p className="text-sm text-on-surface-variant dark:text-on-surface-variant flex items-center gap-1">
            <Briefcase size={12} /> {employee.job_title}
          </p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-on-surface-variant dark:text-on-surface-variant">
            {employee.work_email && (
              <span className="flex items-center gap-1"><Mail size={12} /> {maskEmail(employee.work_email)}</span>
            )}
            {employee.phone && (
              <span className="flex items-center gap-1"><Phone size={12} /> {maskPhone(employee.phone)}</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
            {employee.employment_status.replace('_', ' ')}
          </span>
          <span className="text-xs text-on-surface-variant dark:text-on-surface-variant">
            {employee.employee_number}
          </span>
        </div>
      </div>
    </Link>
  )
})

export default EmployeeCard
