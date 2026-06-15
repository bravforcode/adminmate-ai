import { supabase } from '../lib/supabase'

export interface CreateInterviewInput {
  application_id: string
  company_id: string
  scheduled_at: string
  duration_minutes?: number
  interview_type?: string
  interviewer_name?: string
  location?: string
  meeting_link?: string
  status?: string
}

export interface UpdateInterviewInput {
  scheduled_at?: string
  duration_minutes?: number
  interview_type?: string
  interviewer_name?: string
  location?: string
  meeting_link?: string
  status?: string
  rating?: number
  recommendation?: string
  feedback?: string
}

export const interviewService = {
  getByApplication: async (applicationId: string) => {
    const { data, error } = await supabase.from('interviews').select('id, application_id, company_id, scheduled_at, duration_minutes, interview_type, interviewer_name, location, meeting_link, status, rating, recommendation, feedback, created_at').eq('application_id', applicationId).order('scheduled_at', { ascending: true })
    if (error) throw error
    return data
  },
  getUpcoming: async (companyId: string) => {
    const { data, error } = await supabase.from('interviews').select('*, applications(*, candidates(full_name, email, phone), jobs(title))').eq('company_id', companyId).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true })
    if (error) throw error
    return data
  },
  getPast: async (companyId: string) => {
    const { data, error } = await supabase.from('interviews').select('*, applications(*, candidates(full_name, email), jobs(title))').eq('company_id', companyId).in('status', ['completed', 'cancelled', 'no_show']).order('scheduled_at', { ascending: false })
    if (error) throw error
    return data
  },
  create: async (interview: CreateInterviewInput) => {
    const { data, error } = await supabase.from('interviews').insert(interview).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: UpdateInterviewInput, companyId: string) => {
    const { data, error } = await supabase.from('interviews').update(updates).eq('id', id).eq('company_id', companyId).select().single()
    if (error) throw error
    return data
  },
}
