import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getJsonHeaders, logRequest } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'
import { parseCookies, clearRefreshCookie, COOKIE_NAME } from './cookies.ts'

export async function handleLogout(req: Request): Promise<Response> {
  const fn = 'auth-session/logout'
  const start = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const cookies = parseCookies(req.headers.get('Cookie') || '')
    const refreshToken = cookies[`__Host-${COOKIE_NAME}`] ?? cookies[COOKIE_NAME]
    if (refreshToken) {
      try {
        const { data } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
        if (data?.session?.user?.id) {
          await supabase.auth.admin.signOut(data.session.user.id)
        }
      } catch {
        // Non-critical — session expires naturally
      }
    }

    const headers = getJsonHeaders(req)
    headers['Set-Cookie'] = clearRefreshCookie()

    logRequest({ function: fn, durationMs: Date.now() - start, status: 200 })

    return new Response(
      JSON.stringify({ success: true, data: { message: 'Logged out' } }),
      { status: 200, headers }
    )
  } catch (error: unknown) {
    logRequest({ function: fn, durationMs: Date.now() - start, status: 500, error: error instanceof Error ? error.message : String(error) })
    return errorResponse(error, 500, getJsonHeaders(req))
  }
}
