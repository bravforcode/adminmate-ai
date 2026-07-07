import { supabase } from '../../lib/supabase'

/* ============================================================
   Exit Interview Service
   Schedules and tracks exit interviews.
   Private notes are NOT employee-visible.
   ============================================================ */

export type ExitInterviewStatus = 'not_required' | 'pending' | 'scheduled' | 'completed' | 'declined' | 'cancelled'

export interface ExitInterview {
  id: string
  company_id: string
  offboarding_case_id: string
  employee_user_id: string
  interviewer_user_id?: string
  scheduled_at?: string
  completed_at?: string
  status: ExitInterviewStatus
  feedback_summary?: string
  reason_for_leaving?: string
  would_recommend_company?: boolean
  rehire_eligible?: boolean
  private_notes?: string
  created_at: string
  updated_at: string
}

export async function scheduleExitInterview(
  companyId: string,
  caseId: string,
  employeeUserId: string,
  interviewerUserId: string,
  scheduledAt: string
): Promise<ExitInterview> {
  const { data, error } = await supabase
    .from('exit_interviews')
    .insert({
      company_id: companyId,
      offboarding_case_id: caseId,
      employee_user_id: employeeUserId,
      interviewer_user_id: interviewerUserId,
      scheduled_at: scheduledAt,
      status: 'scheduled',
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as ExitInterview
}

export async function completeExitInterview(
  interviewId: string,
  input: {
    feedbackSummary?: string
    reasonForLeaving?: string
    wouldRecommendCompany?: boolean
    rehireEligible?: boolean
    privateNotes?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('exit_interviews')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      feedback_summary: input.feedbackSummary || null,
      reason_for_leaving: input.reasonForLeaving || null,
      would_recommend_company: input.wouldRecommendCompany ?? null,
      rehire_eligible: input.rehireEligible ?? null,
      private_notes: input.privateNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', interviewId)
  if (error) throw error
}

export async function markExitInterviewNotRequired(interviewId: string): Promise<void> {
  const { error } = await supabase
    .from('exit_interviews')
    .update({ status: 'not_required', updated_at: new Date().toISOString() })
    .eq('id', interviewId)
  if (error) throw error
}

export async function getExitInterview(caseId: string): Promise<ExitInterview | null> {
  const { data, error } = await supabase
    .from('exit_interviews')
    .select('*')
    .eq('offboarding_case_id', caseId)
    .maybeSingle()
  if (error) throw error
  return data as unknown as ExitInterview | null
}

/**
 * Get exit interview for employee view (excludes private_notes).
 */
export async function getExitInterviewForEmployee(caseId: string): Promise<Omit<ExitInterview, 'private_notes'> | null> {
  const { data, error } = await supabase
    .from('exit_interviews')
    .select('id, company_id, offboarding_case_id, employee_user_id, interviewer_user_id, scheduled_at, completed_at, status, feedback_summary, reason_for_leaving, would_recommend_company, rehire_eligible, created_at, updated_at')
    .eq('offboarding_case_id', caseId)
    .maybeSingle()
  if (error) throw error
  return data as unknown as Omit<ExitInterview, 'private_notes'> | null
}
