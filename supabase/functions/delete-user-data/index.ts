import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getCorsHeaders,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'delete-user-data'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }
    userId = user.id

    const rateLimited = await enforceRateLimit(supabase, user.id, 'delete_user_data', 1, 3600, req)
    if (rateLimited) return rateLimited

    let body: { company_id?: string; user_id?: string } = {}
    try { body = await req.json() } catch { /* optional */ }

    const targetUserId = body.user_id || user.id
    const companyId = body.company_id

    const { data: profile } = await supabase.from('user_profiles').select('role, company_id, email').eq('id', user.id).single()

    const isSelf = targetUserId === user.id
    if (!isSelf && profile?.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Only admins can delete other users\' data' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // Get target user's profile to verify company boundary
    const { data: targetProfile } = await supabase.from('user_profiles')
      .select('email, company_id')
      .eq('id', targetUserId)
      .single()

    // SECURITY: Verify target user belongs to the same company as the caller
    if (!isSelf && targetProfile?.company_id !== profile?.company_id) {
      return new Response(JSON.stringify({ success: false, error: 'Cannot delete data from another company' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const effectiveCompanyId = profile?.company_id

    // Non-deterministic anonymous identifier (PDPA §33 / GDPR Art.17 compliant)
    const anonId = crypto.randomUUID()
    const deletedEmail = `deleted_${anonId}@anonymized.local`

    const anonymizedTables: string[] = []

    // ── 1. user_profiles ──────────────────────────────────────────────
    const profileUpdate = await supabase.from('user_profiles').update({
      full_name: 'Deleted User',
      email: deletedEmail,
      phone: null,
      location: null,
      current_position: null,
    }).eq('id', targetUserId)
    if (!profileUpdate.error) anonymizedTables.push('user_profiles')

    // ── 2. candidates + linked tables (fix: use actual email) ────────
    if (targetProfile?.email && effectiveCompanyId) {
      const { data: matchingCandidates } = await supabase.from('candidates')
        .select('id')
        .eq('email', targetProfile.email)
        .eq('company_id', effectiveCompanyId)

      if (matchingCandidates && matchingCandidates.length > 0) {
        const candidateIds = matchingCandidates.map(c => c.id)

        // candidates
        const candidateUpdate = await supabase.from('candidates').update({
          full_name: 'Deleted User',
          email: deletedEmail,
          phone: null,
          location: null,
          linkedin_url: null,
          portfolio_url: null,
        }).in('id', candidateIds)
        if (!candidateUpdate.error) anonymizedTables.push('candidates')

        // cv_documents — parsed_content contains full CV PII
        const cvUpdate = await supabase.from('cv_documents').update({
          file_url: null,
          file_name: '[Deleted]',
          file_size: null,
          file_type: null,
          parsed_content: null,
          raw_text: null,
          summary: null,
          skills_extracted: null,
          experience_years: null,
          education_extracted: null,
          language_proficiency: null,
        }).in('candidate_id', candidateIds)
        if (!cvUpdate.error) anonymizedTables.push('cv_documents')

        // applications — linked to candidate
        const { data: matchingApplications } = await supabase.from('applications')
          .select('id')
          .in('candidate_id', candidateIds)

        if (matchingApplications && matchingApplications.length > 0) {
          const applicationIds = matchingApplications.map(a => a.id)

          const appUpdate = await supabase.from('applications').update({
            ai_analysis: null,
            ai_skill_match: null,
            ai_experience_match: null,
            ai_missing_skills: null,
            ai_suggested_questions: null,
            ai_summary: null,
            recruiter_notes: null,
            rejection_reason: null,
          }).in('id', applicationIds)
          if (!appUpdate.error) anonymizedTables.push('applications')

          // interviews — linked to application
          const interviewUpdate = await supabase.from('interviews').update({
            interviewer_name: '[Deleted]',
            interviewer_email: '[Deleted]',
            location: null,
            meeting_link: null,
            feedback: null,
            notes: null,
            rating: null,
            recommendation: null,
          }).in('application_id', applicationIds)
          if (!interviewUpdate.error) anonymizedTables.push('interviews')

          // offers — linked to application
          const offerUpdate = await supabase.from('offers').update({
            salary_offered: null,
            salary_currency: null,
            benefits: null,
            special_conditions: null,
            offer_letter_content: null,
            candidate_response: null,
          }).in('application_id', applicationIds)
          if (!offerUpdate.error) anonymizedTables.push('offers')
        }
      }
    }

    // ── 3. chat_messages ─────────────────────────────────────────────
    await supabase.from('chat_messages').update({ content: '[Message deleted]' }).eq('user_id', targetUserId)
    anonymizedTables.push('chat_messages')

    // ── 4. notifications (user-scoped) ───────────────────────────────
    await supabase.from('notifications').update({
      title: '[Deleted]',
      title_th: '[ลบแล้ว]',
      message: '[This notification has been deleted]',
      message_th: '[ลบการแจ้งเตือนนี้แล้ว]',
      action_url: null,
    }).eq('user_id', targetUserId)
    anonymizedTables.push('notifications')

    // ── 5. onboarding_tasks (user-scoped, not company-wide) ───────────
    if (effectiveCompanyId) {
      const onboardingUpdate = await supabase.from('onboarding_tasks').update({
        assigned_to: null,
        notes: null,
        description: null,
      }).eq('company_id', effectiveCompanyId).eq('assigned_to', targetUserId)
      if (!onboardingUpdate.error) anonymizedTables.push('onboarding_tasks')
    }

    // ── 6. pdpa_consents (user-scoped, not company-wide) ─────────────
    await supabase.from('pdpa_consents').update({
      data_subject_email: deletedEmail,
      consent_given: false,
      purposes: [],
    }).eq('company_id', effectiveCompanyId).eq('data_subject_email', targetProfile?.email)
    anonymizedTables.push('pdpa_consents')

    // ── 7. audit_log (immutable record of the deletion) ──────────────
    await supabase.from('audit_logs').insert({
      company_id: effectiveCompanyId,
      user_id: user.id,
      action: 'pdpa_data_deletion',
      resource_type: 'user',
      resource_id: targetUserId,
      details: { anonymized_tables: anonymizedTables, requested_by: user.id, is_self: isSelf },
    })

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })

    return new Response(JSON.stringify({
      success: true,
      data: {
        anonymized_tables: anonymizedTables,
        deleted_at: new Date().toISOString(),
        user_id: targetUserId,
      },
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error instanceof Error ? error.message : String(error) })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})
