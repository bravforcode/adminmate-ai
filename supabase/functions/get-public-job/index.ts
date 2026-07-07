import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getServiceClient } from '../_shared/supabaseClient.ts'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'get-public-job'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const cors = getCorsHeaders(req)
  try {
    if (req.method !== 'GET') {
      return errorResponse('Method not allowed', 405, cors)
    }

    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token || token.length > 32) {
      return errorResponse('Invalid token', 400, cors)
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase.rpc('get_public_job', { p_token: token })
    if (error) {
      console.error(`[${FN}] RPC error:`, error.message)
      return errorResponse('Failed to fetch job', 500, cors)
    }

    if (!data || data.length === 0) {
      return errorResponse('Job not found or not published', 404, cors)
    }

    return new Response(JSON.stringify({ success: true, job: data[0] }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error(`[${FN}] Unhandled:`, err)
    return errorResponse(err, 500, cors)
  }
})
