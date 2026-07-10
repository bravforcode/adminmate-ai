import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, Search, Users, Download, Filter } from 'lucide-react'
import { useEmployees, type EmployeeFilters, type EmployeeWithProfiles } from '../../hooks/useEmployees'
import { useCreateEmployee } from '../../hooks/useEmployees'
import { EmployeeCard } from '../../components/hris/EmployeeCard'
import { EmployeeForm, type EmployeeFormData } from '../../components/hris/EmployeeForm'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/shared/EmptyState'
import { ErrorState } from '../../components/shared/ErrorState'
import { LoadingState } from '../../components/shared/LoadingState'
import type { EmploymentType, EmploymentStatus } from '../../services/hris/employeeService'

const STATUS_OPTIONS: EmploymentStatus[] = ['draft', 'active', 'on_leave', 'suspended', 'offboarding', 'terminated', 'inactive']
const TYPE_OPTIONS: EmploymentType[] = ['full_time', 'part_time', 'contractor', 'intern', 'remote', 'seasonal', 'gig']

function maskPhoneForExport(phone?: string): string {
  if (!phone || phone.length < 4) return '***'
  return phone.slice(0, -4) + '****'
}

export function EmployeeListPage() {
  const [showForm, setShowForm] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const filters: EmployeeFilters = useMemo(() => ({
    search: search || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  }), [search, statusFilter, typeFilter])

  const { data: employees, isLoading, isError, error, refetch } = useEmployees(filters)
  const createEmployee = useCreateEmployee()

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value), [])

  const handleCreateEmployee = useCallback(async (data: EmployeeFormData) => {
    await createEmployee.mutateAsync({
      employee_number: data.employee_number,
      job_title: data.job_title,
      employment_type: data.employment_type,
      employment_status: data.employment_status,
      hire_date: data.hire_date,
      start_date: data.start_date,
      department_id: data.department_id || undefined,
      team_id: data.team_id || undefined,
      work_email: data.work_email || undefined,
      personal_email: data.personal_email || undefined,
      phone: data.phone || undefined,
      country_code: data.country_code,
      timezone: data.timezone,
      position_level: data.position_level || undefined,
    })
    setShowForm(false)
  }, [createEmployee])

  const handleExportCSV = useCallback(() => {
    if (!employees || employees.length === 0) return
    const headers = ['Employee Number', 'Name', 'Job Title', 'Status', 'Type', 'Hire Date', 'Email']
    const rows = employees.map((e: EmployeeWithProfiles) => [
      e.employee_number,
      e.employee_profiles?.display_name || e.job_title,
      e.job_title,
      e.employment_status,
      e.employment_type,
      e.hire_date,
      e.work_email ? maskPhoneForExport(e.work_email) : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'employees.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }, [employees])

  const activeFiltersCount = [statusFilter, typeFilter].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-ink text-ink">Employees</h1>
          <p className="text-body-md text-ink-variant text-ink-variant mt-1">Manage your organization&apos;s workforce</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={handleExportCSV} disabled={!employees || employees.length === 0} icon={<Download size={16} />}>
            Export CSV
          </Button>
          <Button variant="default" size="lg" onClick={() => setShowForm(true)} data-testid="add-employee" icon={<Plus size={18} />}>
            Add Employee
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant text-ink-variant size-4" />
          <input
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm placeholder:text-ink-variant/50"
            placeholder="Search by name, number, or title..."
            data-testid="employee-search"
          />
        </div>
        <Button variant="outline" size="md" onClick={() => setShowFilters(!showFilters)} icon={<Filter size={16} />}>
          Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>
      </div>

      {showFilters && (
        <div className="bg-surface rounded-xl border border-border p-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-ink-variant">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink text-sm outline-none"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-ink-variant">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink text-sm outline-none"
            >
              <option value="">All Types</option>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setTypeFilter('') }}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <EmployeeForm onClose={() => setShowForm(false)} onSubmit={handleCreateEmployee} isLoading={createEmployee.isPending} />
        </div>
      )}

      {isError ? (
        <ErrorState
          title="Failed to load employees"
          message={(error as Error)?.message || ''}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <LoadingState variant="cards" rows={6} message="Loading employees..." />
      ) : employees && employees.length === 0 ? (
        search || activeFiltersCount > 0 ? (
          <EmptyState icon={Search} title="No results found" description="Try adjusting your search or filters" />
        ) : (
          <EmptyState
            icon={Users}
            title="No employees yet"
            description="Add your first employee to start managing your workforce"
            action={{ label: 'Add Employee', onClick: () => setShowForm(true) }}
          />
        )
      ) : (
        <div className="grid gap-4">
          {employees?.map((emp: EmployeeWithProfiles) => (
            <EmployeeCard key={emp.id} employee={emp} />
          ))}
        </div>
      )}

      {employees && employees.length > 0 && (
        <div className="text-sm text-ink-variant text-ink-variant text-center">
          Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

export default EmployeeListPage
