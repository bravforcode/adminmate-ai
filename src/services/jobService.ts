import { supabase } from '../lib/supabase'
import { hasPermission } from './permissionService'

export const jobService = {
  getAll: async (companyId: string) => {
    const { data, error } = await supabase.from('jobs').select('*, applications(count)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from('jobs').select('id, company_id, created_by, title, title_th, department, location, employment_type, experience_level, salary_min, salary_max, salary_currency, description, description_th, responsibilities, requirements, nice_to_have, skills_required, status, application_deadline, headcount, filled_count, ai_generated, created_at, updated_at').eq('id', id).single()
    if (error) throw error
    return data
  },
  create: async (job: Record<string, unknown>) => {
    if (!(await hasPermission('job', 'write'))) {
      throw new Error('Permission denied: job.write')
    }
    const { data, error } = await supabase.from('jobs').insert(job).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: Record<string, unknown>) => {
    if (!(await hasPermission('job', 'write'))) {
      throw new Error('Permission denied: job.write')
    }
    const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  updateStatus: async (id: string, status: string) => {
    return jobService.update(id, { status })
  },
}
