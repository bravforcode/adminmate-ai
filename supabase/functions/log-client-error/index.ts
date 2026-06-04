import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  corsHeaders,
  JSON_HEADERS,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  logRequest,
} from '../_shared/utils.ts'

const FN = 'log-client-error'
const MAX_BODY_BYTES = 32_000

interface ClientErrorPayload {
  type?: string
  message?: string
  stack?: string
  source?: string
  lineno?: number
  colno?: number
  reason?: string
  url?: string
  userAgent?: string
  userId?: string | null
  companyId?: string | null
  timestamp?: string
  severity?: string
  componentStack?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

function sanitizeString(value: unknown, maxLen = 2000): string | null {
  if (typeof value !== 'string') return null
  return value.length > maxLen ? value.slice(0, maxLen) : value
}

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  return xff.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS })
    }

    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ success: false, error: 'Payload too large' }), { status: 413, headers: JSON_HEADERS })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const user = await verifyAuth(req, supabase)
    let companyId: string | null = null
    let rateLimitKey: string
    if (user) {
      userId = user.id
      rateLimitKey = user.id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()
      companyId = profile?.company_id ?? null
    } else {
      rateLimitKey = `ip:${getClientIp(req)}`
    }

    const rateLimited = await enforceRateLimit(supabase, rateLimitKey, 'log_client_error', 60, 60)
    if (rateLimited) return rateLimited

    let payload: ClientErrorPayload = {}
    try {
      const text = await req.text()
      if (text.length > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ success: false, error: 'Payload too large' }), { status: 413, headers: JSON_HEADERS })
      }
      payload = text ? (JSON.parse(text) as ClientErrorPayload) : {}
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS })
    }

    const row = {
      user_id: userId || null,
      company_id: companyId,
      action: 'client_error',
      resource_type: sanitizeString(payload.type ?? 'unknown', 50) ?? 'unknown',
      resource_id: null,
      metadata: {
        message: sanitizeString(payload.message ?? '', 2000),
        stack: sanitizeString(payload.stack ?? '', 4000),
        source: sanitizeString(payload.source ?? '', 500),
        lineno: typeof payload.lineno === 'number' ? payload.lineno : null,
        colno: typeof payload.colno === 'number' ? payload.colno : null,
        reason: sanitizeString(payload.reason ?? '', 2000),
        url: sanitizeString(payload.url ?? '', 500),
        user_agent: sanitizeString(payload.userAgent ?? '', 500),
        severity: sanitizeString(payload.severity ?? 'error', 20),
        component_stack: sanitizeString(payload.componentStack ?? '', 4000),
        client_timestamp: sanitizeString(payload.timestamp ?? '', 50),
        extra: (payload.metadata && typeof payload.metadata === 'object') ? payload.metadata : {},
      },
      ip_address: getClientIp(req),
      user_agent: sanitizeString(req.headers.get('user-agent') ?? '', 500),
    }

    const { error } = await supabase.from('activity_log').insert(row)
    if (error) {
      console.error('[log-client-error] insert failed:', error)
      logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: 'insert failed' })
      return new Response(JSON.stringify({ success: false, error: 'Failed to record error' }), { status: 500, headers: JSON_HEADERS })
    }

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: JSON_HEADERS })
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), { status: 500, headers: JSON_HEADERS })
  }
})
