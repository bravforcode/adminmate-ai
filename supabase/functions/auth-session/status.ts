import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getJsonHeaders, logRequest } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'
import { parseCookies, createRefreshCookie, clearRefreshCookie } from './cookies.ts'

export async function handleStatus(req: Request): Promise<Response> {
  const fn = 'auth-session/status'
  const start = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const refreshToken = parseCookies(req.headers.get('Cookie') || '')['sb-auth-refresh']
    if (!refreshToken) {
      logRequest({ function: fn, durationMs: Date.now() - start, status: 200 })
      return new Response(
        JSON.stringify({ success: true, data: { valid: false } }),
        { status: 200, headers: getJsonHeaders(req) }
      )
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.session?.user) {
      logRequest({ function: fn, durationMs: Date.now() - start, status: 200 })
      return new Response(
        JSON.stringify({ success: true, data: { valid: false } }),
        { status: 200, headers: { ...getJsonHeaders(req), 'Set-Cookie': clearRefreshCookie() } }
      )
    }

    const headers = getJsonHeaders(req)
    headers['Set-Cookie'] = createRefreshCookie(data.session.refresh_token)
    headers['Cache-Control'] = 'no-store'

    logRequest({ function: fn, userId: data.session.user.id, durationMs: Date.now() - start, status: 200 })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          valid: true,
          access_token: data.session.access_token,
          user: { id: data.session.user.id, email: data.session.user.email },
        },
      }),
      { status: 200, headers }
    )
  } catch (error: unknown) {
    logRequest({ function: fn, durationMs: Date.now() - start, status: 500, error: error instanceof Error ? error.message : String(error) })
    return errorResponse(error, 500, getJsonHeaders(req))
  }
}
