import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getJsonHeaders, validateInput, logRequest } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'
import { createRefreshCookie } from './cookies.ts'

export async function handleLogin(req: Request): Promise<Response> {
  const fn = 'auth-session/login'
  const start = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let body: { email?: string; password?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    const validation = validateInput(body, ['email', 'password'])
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email!,
      password: body.password!,
    })

    if (error || !data.session) {
      logRequest({ function: fn, durationMs: Date.now() - start, status: 401, error: error?.message })
      return new Response(
        JSON.stringify({ success: false, error: error?.message || 'Authentication failed' }),
        { status: 401, headers: getJsonHeaders(req) }
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
