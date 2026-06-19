import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getJsonHeaders, validateInput, logRequest } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'
import { createRefreshCookie } from './cookies.ts'
import { captureError } from '../_shared/sentry.ts'

// Server-side rate limiting for login attempts
// Key: SHA-256(email + ip) to avoid storing plaintext PII in rate_limits table
async function checkLoginRateLimit(supabase: ReturnType<typeof createClient>, email: string, ip: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(`${email.toLowerCase().trim()}:${ip}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData)
  const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

  const { data, error } = await supabase.rpc('check_login_rate_limit', {
    p_key_hash: keyHash,
    p_action: 'login_attempt',
    p_limit: 5,
    p_window_seconds: 900, // 15 minutes
  })
  if (error) {
    // If rate limit check fails, allow the request (fail-open for availability)
    console.error('Rate limit check failed:', error)
    return true
  }
  const row = Array.isArray(data) ? data[0] : data
  return row?.allowed !== false
}

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

    // Server-side rate limiting by email+IP hash
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const rateAllowed = await checkLoginRateLimit(supabase, body.email!, clientIp)
    if (!rateAllowed) {
      logRequest({ function: fn, durationMs: Date.now() - start, status: 429 })
      return new Response(
        JSON.stringify({ success: false, error: 'Too many login attempts. Please try again later.' }),
        { status: 429, headers: { ...getJsonHeaders(req), 'Retry-After': '900' } }
      )
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email!,
      password: body.password!,
    })

    if (error || !data.session) {
      logRequest({ function: fn, durationMs: Date.now() - start, status: 401 })
      // Generic error — never leak whether email exists or password is wrong
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email or password' }),
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
  } catch (error) {
    captureError(error, { function: fn })
    logRequest({ function: fn, durationMs: Date.now() - start, status: 500 })
    return errorResponse(new Error('Internal server error'), 500, getJsonHeaders(req))
  }
}
