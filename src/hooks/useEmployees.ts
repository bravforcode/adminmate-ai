import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  type Employee,
} from '../services/hris/employeeService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const KEYS = {
  all: ['employees'] as const,
  list: (companyId: string, filters?: EmployeeFilters) => ['employees', 'list', companyId, filters] as const,
  detail: (id: string) => ['employees', 'detail', id] as const,
}

export interface EmployeeFilters {
  status?: string
  type?: string
  department?: string
  search?: string
}

export type EmployeeWithProfiles = Employee & {
  employee_profiles?: { display_name?: string; first_name?: string; last_name?: string }
  user_profiles?: { full_name?: string; email?: string; avatar_url?: string }
}

export function useEmployees(filters?: EmployeeFilters) {
  const company = useAuthStore(s => s.company)
  const isHR = useAuthStore(s => s.isAdminOrHR())
  return useQuery({
    queryKey: KEYS.list(company?.id ?? '', filters),
    queryFn: async () => {
      const result = await listEmployees(company!.id, filters)
      return result as unknown as EmployeeWithProfiles[]
    },
    enabled: !!company?.id && isHR,
  })
}

export function useEmployee(id: string) {
  const company = useAuthStore(s => s.company)
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => getEmployee(id),
    enabled: !!id && !!company?.id,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  return useMutation({
    mutationFn: async (data: Parameters<typeof createEmployee>[1]) => {
      return createEmployee(company!.id, data, profile!.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list(company?.id ?? '') })
      toast.success('Employee created successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Employee> }) => {
      return updateEmployee(id, updates)
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.list(company?.id ?? '') })
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) })
      toast.success('Employee updated successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
