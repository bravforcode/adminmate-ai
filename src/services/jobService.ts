import { supabase } from '../lib/supabase'
import { hasPermission } from './permissionService'

export interface JobSearchOptions {
  search?: string
  status?: string
  department?: string
}

export const jobService = {
  getAll: async (companyId: string, options?: JobSearchOptions) => {
    let query = supabase
      .from('jobs')
      .select('*, applications(count)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (options?.search) {
      const term = `%${options.search}%`
      query = query.or(`title.ilike.${term},department.ilike.${term},location.ilike.${term}`)
    }
    if (options?.status) {
      query = query.eq('status', options.status)
    }
    if (options?.department) {
      query = query.eq('department', options.department)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  getById: async (id: string) => {
    const { data, error } = await supabase.from('jobs').select('id, company_id, created_by, title, title_th, department, location, employment_type, experience_level, salary_min, salary_max, salary_currency, description, description_th, responsibilities, requirements, nice_to_have, skills_required, status, application_deadline, headcount, filled_count, ai_generated, share_token, created_at, updated_at').eq('id', id).single()
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

  delete: async (id: string, companyId: string): Promise<void> => {
    if (!(await hasPermission('job', 'write'))) {
      throw new Error('Permission denied: job.write')
    }
    const { error } = await supabase.from('jobs').delete().eq('id', id).eq('company_id', companyId)
    if (error) throw error
  },

  updateStatus: async (id: string, status: string) => {
    return jobService.update(id, { status })
  },

  publish: async (id: string) => {
    return jobService.update(id, { status: 'published', published_at: new Date().toISOString() })
  },

  close: async (id: string) => {
    return jobService.update(id, { status: 'closed', closed_at: new Date().toISOString() })
  },

  generateShareLink: async (id: string, companyId: string): Promise<string> => {
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    const { error } = await supabase
      .from('jobs')
      .update({ share_token: token })
      .eq('id', id)
      .eq('company_id', companyId)
    if (error) throw error
    return `${window.location.origin}/careers/apply/${token}`
  },

  getByShareToken: async (token: string) => {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, title_th, department, location, employment_type, experience_level, salary_min, salary_max, salary_currency, description, description_th, responsibilities, requirements, skills_required, application_deadline')
      .eq('share_token', token)
      .eq('status', 'published')
      .single()
    if (error) throw error
    return data
  },
}
