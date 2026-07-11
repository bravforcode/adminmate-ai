import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/utils.ts'

// Valid Supabase Auth hook actions — reject anything else
const VALID_ACTIONS = new Set(['AUTH_LOGIN', 'AUTH_SIGNUP', 'AUTH_VERIFY', 'AUTH_PASSWORD_RECOVERY'])

export async function handleAuthHook(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req)

  // Validate request is POST JSON
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ decision: 'reject', message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let body: { user?: { id?: string; aal?: string }; action?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ decision: 'reject', message: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { user, action } = body

  // Strict action validation — reject unknown actions
  if (!action || !VALID_ACTIONS.has(action)) {
    return new Response(
      JSON.stringify({ decision: 'reject', message: `Unknown action: ${action || 'none'}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Only enforce MFA on login — other actions pass through
  if (action === 'AUTH_LOGIN' && user?.id) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: factors } = await supabase.auth.admin.mfa.listFactors(user.id)
    const hasActiveMFA = factors?.all?.some((f) => f.status === 'verified')

    if (hasActiveMFA && user?.aal !== 'aal2') {
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'MFA required',
          redirectTo: '/auth/mfa',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  return new Response(
    JSON.stringify({ decision: 'accept' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(handleAuthHook)
