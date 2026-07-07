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

export interface InterviewScorecard {
  id: string
  interview_id: string
  company_id: string
  evaluator_id: string
  criteria: Array<{
    criterion: string
    score: number
    comment?: string
  }>
  overall_rating: number
  recommendation: string
  notes?: string
  created_at: string
}

export interface CancelInterviewInput {
  reason?: string
  cancelled_by?: string
}

export interface RescheduleInterviewInput {
  scheduled_at: string
  duration_minutes?: number
  reason?: string
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

  getById: async (id: string, companyId: string) => {
    const { data, error } = await supabase
      .from('interviews')
      .select('*, applications(*, candidates(full_name, email, phone), jobs(title))')
      .eq('id', id)
      .eq('company_id', companyId)
      .single()
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

  reschedule: async (id: string, input: RescheduleInterviewInput, companyId: string) => {
    const updates: Record<string, unknown> = {
      scheduled_at: input.scheduled_at,
      status: 'rescheduled',
    }
    if (input.duration_minutes !== undefined) updates.duration_minutes = input.duration_minutes

    const { data, error } = await supabase
      .from('interviews')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  cancel: async (id: string, input: CancelInterviewInput, companyId: string) => {
    const { data, error } = await supabase
      .from('interviews')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw error

    // Audit log for cancellation
    await supabase.from('audit_logs').insert({
      company_id: companyId,
      user_id: input.cancelled_by,
      action: 'interview.cancel',
      resource_type: 'interview',
      resource_id: id,
      details: JSON.stringify({ reason: input.reason }),
    })

    return data
  },

  markNoShow: async (id: string, companyId: string) => {
    const { data, error } = await supabase
      .from('interviews')
      .update({ status: 'no_show' })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  submitScorecard: async (interviewId: string, companyId: string, evaluatorId: string, scorecard: Omit<InterviewScorecard, 'id' | 'interview_id' | 'company_id' | 'evaluator_id' | 'created_at'>): Promise<InterviewScorecard> => {
    const { data, error } = await supabase
      .from('interview_scorecards')
      .insert({
        interview_id: interviewId,
        company_id: companyId,
        evaluator_id: evaluatorId,
        criteria: scorecard.criteria,
        overall_rating: scorecard.overall_rating,
        recommendation: scorecard.recommendation,
        notes: scorecard.notes,
      })
      .select()
      .single()
    if (error) throw error
    return data as InterviewScorecard
  },

  getScorecard: async (interviewId: string, companyId: string): Promise<InterviewScorecard | null> => {
    const { data, error } = await supabase
      .from('interview_scorecards')
      .select('*')
      .eq('interview_id', interviewId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data as InterviewScorecard | null
  },

  delete: async (id: string, companyId: string): Promise<void> => {
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)
    if (error) throw error
  },
}
