import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getCorsHeaders,
  getJsonHeaders,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'metrics'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined
  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: getJsonHeaders(req) })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const user = await verifyAuth(req, supabase)
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: getJsonHeaders(req) })
    }
    userId = user.id

    const rateLimited = await enforceRateLimit(supabase, user.id, 'metrics', 30, 60)
    if (rateLimited) return rateLimited

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'hr'].includes(profile.role)) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: admin only' }), { status: 403, headers: getJsonHeaders(req) })
    }

    const companyId = profile.company_id
    if (!companyId) {
      return new Response(JSON.stringify({ success: false, error: 'No company associated with this user' }), { status: 403, headers: getJsonHeaders(req) })
    }

    const [usersRes, companiesRes, jobsRes, candidatesRes, recentSignupsRes] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('id', companyId),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    const metrics = {
      total_users: usersRes.count ?? 0,
      total_companies: companiesRes.count ?? 0,
      total_jobs: jobsRes.count ?? 0,
      total_candidates: candidatesRes.count ?? 0,
      recent_signups: recentSignupsRes.count ?? 0,
    }

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(
      JSON.stringify({ success: true, data: metrics, generated_at: new Date().toISOString() }),
      { status: 200, headers: getJsonHeaders(req) }
    )
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})
