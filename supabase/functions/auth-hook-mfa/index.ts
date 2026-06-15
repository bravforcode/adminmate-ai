import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      return new Response(
        JSON.stringify({
          decision: 'reject',
          message: 'MFA required',
          redirectTo: '/auth/mfa',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  return new Response(
    JSON.stringify({ decision: 'accept' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}

serve(handleAuthHook)
