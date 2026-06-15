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

const FN = 'export-user-data'

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

    const rateLimited = await enforceRateLimit(supabase, user.id, 'export_user_data', 3, 3600, req)
    if (rateLimited) return rateLimited

    let body: { company_id?: string; user_id?: string } = {}
    try { body = await req.json() } catch { /* optional */ }

    const targetUserId = body.user_id || user.id
    const companyId = body.company_id

    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', targetUserId).single()

    const isSelf = targetUserId === user.id
    const { data: profileCheck } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    if (!isSelf && profileCheck?.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Only admins can export other users\' data' }), {
        status: 403,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const effectiveCompanyId = companyId || profile?.company_id

    // Look up candidate records linked to user (by email) for applications & documents cross-ref
    const { data: userCandidates } = await supabase
      .from('candidates')
      .select('id')
      .eq('company_id', effectiveCompanyId)
      .eq('email', profile?.email ?? '')
    const candidateIds = userCandidates?.map(c => c.id) ?? []

    // Build document filter: employee_id (direct user link) + candidate_id (if user is a candidate)
    const docFilters = [`employee_id.eq.${targetUserId}`]
    if (candidateIds.length > 0) {
      docFilters.push(`candidate_id.in.(${candidateIds.join(',')})`)
    }

    const [consentsRes, appsRes, docsRes, chatRes, auditRes, notifRes, onboardRes] = await Promise.all([
      supabase.from('pdpa_consents').select('*').eq('employee_id', targetUserId).order('created_at', { ascending: false }),
      candidateIds.length > 0
        ? supabase.from('applications').select('*, candidates(full_name, email)').in('candidate_id', candidateIds)
        : Promise.resolve({ data: [] }),
      supabase.from('documents').select('*').or(docFilters.join(',')),
      supabase.from('chat_messages').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(500),
      supabase.from('audit_logs').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(500),
      supabase.from('notifications').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(200),
      supabase.from('onboarding_checklists').select('*, onboarding_tasks(*)').eq('employee_id', targetUserId),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: targetUserId,
      company_id: effectiveCompanyId,
      profile,
      consents: consentsRes.data ?? [],
      applications: appsRes.data ?? [],
      documents: docsRes.data ?? [],
      chat_messages: chatRes.data ?? [],
      audit_logs: auditRes.data ?? [],
      notifications: notifRes.data ?? [],
      onboarding: onboardRes.data ?? [],
    }

    await supabase.from('audit_logs').insert({
      company_id: effectiveCompanyId,
      user_id: user.id,
      action: 'pdpa_data_export',
      resource_type: 'user',
      resource_id: targetUserId,
      details: { record_count: Object.values(exportData).reduce((acc, v) => acc + (Array.isArray(v) ? v.length : 0), 0) },
    })

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })

    return new Response(JSON.stringify({ success: true, data: exportData }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error instanceof Error ? error.message : String(error) })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})
