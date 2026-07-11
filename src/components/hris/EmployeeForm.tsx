import { useState } from 'react'
import { UserPlus, Save } from 'lucide-react'
import { Button } from '../ui/Button'
import type { EmploymentType, EmploymentStatus } from '../../services/hris/employeeService'

interface EmployeeFormProps {
  onClose: () => void
  onSubmit: (data: EmployeeFormData) => Promise<void>
  initialData?: Partial<EmployeeFormData>
  departments?: Array<{ id: string; name: string }>
  teams?: Array<{ id: string; name: string }>
  isLoading?: boolean
}

export interface EmployeeFormData {
  employee_number: string
  job_title: string
  employment_type: EmploymentType
  employment_status: EmploymentStatus
  hire_date: string
  start_date: string
  department_id?: string
  team_id?: string
  work_email?: string
  personal_email?: string
  phone?: string
  country_code: string
  timezone: string
  position_level?: string
}

const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contractor', 'intern', 'remote', 'seasonal', 'gig']
const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['draft', 'active']

const INPUT_CLASS = 'w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm'
const LABEL_CLASS = 'block text-sm font-medium mb-1 text-ink'

export function EmployeeForm({ onClose, onSubmit, initialData, departments = [], teams = [], isLoading }: EmployeeFormProps) {
  const [form, setForm] = useState<EmployeeFormData>({
    employee_number: initialData?.employee_number || '',
    job_title: initialData?.job_title || '',
    employment_type: initialData?.employment_type || 'full_time',
    employment_status: initialData?.employment_status || 'draft',
    hire_date: initialData?.hire_date || new Date().toISOString().split('T')[0],
    start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
    department_id: initialData?.department_id || '',
    team_id: initialData?.team_id || '',
    work_email: initialData?.work_email || '',
    personal_email: initialData?.personal_email || '',
    phone: initialData?.phone || '',
    country_code: initialData?.country_code || 'TH',
    timezone: initialData?.timezone || 'Asia/Bangkok',
    position_level: initialData?.position_level || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.employee_number.trim()) newErrors.employee_number = 'Employee number is required'
    if (!form.job_title.trim()) newErrors.job_title = 'Job title is required'
    if (!form.hire_date) newErrors.hire_date = 'Hire date is required'
    if (!form.start_date) newErrors.start_date = 'Start date is required'
    if (form.work_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.work_email)) newErrors.work_email = 'Invalid email'
    if (form.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal_email)) newErrors.personal_email = 'Invalid email'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(form)
  }

  const updateField = <K extends keyof EmployeeFormData>(field: K, value: EmployeeFormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus size={20} className="text-primary dark:text-primary-muted" />
        <h3 className="font-semibold text-ink">{initialData ? 'Edit Employee' : 'New Employee'}</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Employee Number *</label>
          <input value={form.employee_number} onChange={e => updateField('employee_number', e.target.value)} className={INPUT_CLASS} placeholder="EMP00001" data-testid="employee-number" />
          {errors.employee_number && <p className="text-destructive text-xs mt-1">{errors.employee_number}</p>}
        </div>
        <div>
          <label className={LABEL_CLASS}>Job Title *</label>
          <input value={form.job_title} onChange={e => updateField('job_title', e.target.value)} className={INPUT_CLASS} placeholder="Software Engineer" data-testid="job-title" />
          {errors.job_title && <p className="text-destructive text-xs mt-1">{errors.job_title}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Employment Type</label>
          <select value={form.employment_type} onChange={e => updateField('employment_type', e.target.value as EmploymentType)} className={INPUT_CLASS}>
            {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Status</label>
          <select value={form.employment_status} onChange={e => updateField('employment_status', e.target.value as EmploymentStatus)} className={INPUT_CLASS}>
            {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Hire Date *</label>
          <input type="date" value={form.hire_date} onChange={e => updateField('hire_date', e.target.value)} className={INPUT_CLASS} data-testid="hire-date" />
          {errors.hire_date && <p className="text-destructive text-xs mt-1">{errors.hire_date}</p>}
        </div>
        <div>
          <label className={LABEL_CLASS}>Start Date *</label>
          <input type="date" value={form.start_date} onChange={e => updateField('start_date', e.target.value)} className={INPUT_CLASS} data-testid="start-date" />
          {errors.start_date && <p className="text-destructive text-xs mt-1">{errors.start_date}</p>}
        </div>
      </div>

      {departments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Department</label>
            <select value={form.department_id || ''} onChange={e => updateField('department_id', e.target.value || undefined)} className={INPUT_CLASS}>
              <option value="">None</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {teams.length > 0 && (
            <div>
              <label className={LABEL_CLASS}>Team</label>
              <select value={form.team_id || ''} onChange={e => updateField('team_id', e.target.value || undefined)} className={INPUT_CLASS}>
                <option value="">None</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Work Email</label>
          <input type="email" value={form.work_email || ''} onChange={e => updateField('work_email', e.target.value)} className={INPUT_CLASS} placeholder="name@company.com" />
          {errors.work_email && <p className="text-destructive text-xs mt-1">{errors.work_email}</p>}
        </div>
        <div>
          <label className={LABEL_CLASS}>Personal Email</label>
          <input type="email" value={form.personal_email || ''} onChange={e => updateField('personal_email', e.target.value)} className={INPUT_CLASS} />
          {errors.personal_email && <p className="text-destructive text-xs mt-1">{errors.personal_email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={LABEL_CLASS}>Phone</label>
          <input value={form.phone || ''} onChange={e => updateField('phone', e.target.value)} className={INPUT_CLASS} placeholder="+66812345678" />
        </div>
        <div>
          <label className={LABEL_CLASS}>Country Code</label>
          <input value={form.country_code} onChange={e => updateField('country_code', e.target.value)} className={INPUT_CLASS} placeholder="TH" />
        </div>
        <div>
          <label className={LABEL_CLASS}>Position Level</label>
          <input value={form.position_level || ''} onChange={e => updateField('position_level', e.target.value)} className={INPUT_CLASS} placeholder="Senior" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="default" disabled={isLoading} loading={isLoading} icon={<Save size={16} />}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

export default EmployeeForm
