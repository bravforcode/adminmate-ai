import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getJsonHeaders, logRequest } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'
import { parseCookies, createRefreshCookie, clearRefreshCookie, COOKIE_NAME } from './cookies.ts'

export async function handleRefresh(req: Request): Promise<Response> {
  const fn = 'auth-session/refresh'
  const start = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const cookies = parseCookies(req.headers.get('Cookie') || '')
    const refreshToken = cookies[`__Host-${COOKIE_NAME}`] ?? cookies[COOKIE_NAME]
    if (!refreshToken) {
      logRequest({ function: fn, durationMs: Date.now() - start, status: 401, error: 'No refresh token' })
      return new Response(
        JSON.stringify({ success: false, error: 'No session' }),
        { status: 401, headers: { ...getJsonHeaders(req), 'Set-Cookie': clearRefreshCookie() } }
      )
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.session) {
      logRequest({ function: fn, durationMs: Date.now() - start, status: 401, error: error?.message || 'Session expired' })
      return new Response(
        JSON.stringify({ success: false, error: 'Session expired' }),
        { status: 401, headers: { ...getJsonHeaders(req), 'Set-Cookie': clearRefreshCookie() } }
      )
    }

    const headers = getJsonHeaders(req)
    headers['Set-Cookie'] = createRefreshCookie(data.session.refresh_token)
    headers['Cache-Control'] = 'no-store'

    logRequest({ function: fn, userId: data.session.user.id, durationMs: Date.now() - start, status: 200 })

    // access_token is returned in the body so the client can hydrate the
    // Supabase SDK's in-memory session (supabase.auth.setSession). The
    // refresh_token is NEVER sent in the body — it is transported exclusively
    // via the httpOnly cookie set above.
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          access_token: data.session.access_token,
          user: {
            id: data.session.user.id,
            email: data.session.user.email,
          },
        },
      }),
      { status: 200, headers }
    )
  } catch (error: unknown) {
    logRequest({ function: fn, durationMs: Date.now() - start, status: 500, error: error instanceof Error ? error.message : String(error) })
    return errorResponse(error, 500, getJsonHeaders(req))
  }
}
