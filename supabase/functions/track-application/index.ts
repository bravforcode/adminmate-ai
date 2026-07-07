import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, getJsonHeaders, handleCorsPreflight } from '../_shared/utils.ts'

const FN = 'track-application'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const h = getJsonHeaders(req)
  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: h })
    }

    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token || token.length > 32) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid tracking token' }), { status: 400, headers: h })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data, error } = await supabase.rpc('get_public_application', { p_token: token })
    if (error) {
      console.error(`[${FN}] RPC error:`, error.message)
      return new Response(JSON.stringify({ success: false, error: 'Failed to track application' }), { status: 500, headers: h })
    }

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Application not found' }), { status: 404, headers: h })
    }

    return new Response(JSON.stringify({ success: true, application: data[0] }), { status: 200, headers: h })
  } catch (err) {
    console.error(`[${FN}] Unhandled:`, err)
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), { status: 500, headers: h })
  }
})
