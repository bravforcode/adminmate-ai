import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/utils.ts'

export async function handleAuthHook(req: Request): Promise<Response> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { user, action } = await req.json()

  if (action === 'AUTH_LOGIN' && user?.id) {
    const { data: factors } = await supabase.auth.admin.mfa.listFactors(user.id)
    const hasActiveMFA = factors?.all?.some((f) => f.status === 'verified')

    if (hasActiveMFA && user?.aal !== 'aal2') {
      const corsHeaders = getCorsHeaders(req)
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

  const corsHeaders = getCorsHeaders(req)
  return new Response(
    JSON.stringify({ decision: 'accept' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve(handleAuthHook)
