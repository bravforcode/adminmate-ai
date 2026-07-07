import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getJsonHeaders, logRequest } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'
import { parseCookies, createRefreshCookie, clearRefreshCookie, COOKIE_NAME } from './cookies.ts'

export async function handleStatus(req: Request): Promise<Response> {
  const fn = 'auth-session/status'
  const start = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const cookies = parseCookies(req.headers.get('Cookie') || '')
    const refreshToken = cookies[`__Host-${COOKIE_NAME}`] ?? cookies[COOKIE_NAME]
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

    // access_token is NOT sent in the response body — session is managed
    // exclusively via httpOnly refresh token cookie.
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          valid: true,
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
