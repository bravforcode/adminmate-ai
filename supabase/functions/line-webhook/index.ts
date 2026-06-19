import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'
import { handleIncomingMessage } from '../_shared/messageHandler.ts'
import { getCorsHeaders, getJsonHeaders, logRequest } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'line-webhook'
const MAX_BODY_BYTES = 1_000_000
const MAX_EVENTS = 100

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  const start = Date.now()
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: getJsonHeaders(req) })
    }

    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_BYTES) {
      return new Response('Payload too large', { status: 413 })
    }

    const body = await req.text()
    if (body.length > MAX_BODY_BYTES) {
      return new Response('Payload too large', { status: 413 })
    }

    const signature = req.headers.get('x-line-signature')
    const secret = Deno.env.get('LINE_CHANNEL_SECRET') || ''
    if (!secret) {
      // Fail closed: reject all requests if secret is not configured in production
      logRequest({ function: FN, durationMs: Date.now() - start, status: 500, error: 'LINE_CHANNEL_SECRET not configured' })
      return new Response('Server configuration error', { status: 500 })
    }
    if (!signature) {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 401, error: 'missing signature' })
      return new Response('Forbidden', { status: 401 })
    }
    const hmac = createHmac('sha256', secret)
    hmac.update(body)
    if (hmac.digest('base64') !== signature) {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 401, error: 'invalid signature' })
      return new Response('Forbidden', { status: 401 })
    }

    let parsed: { events?: any[]; destination?: string }
    try { parsed = JSON.parse(body) } catch { return new Response('Invalid JSON', { status: 400 }) }

    const events = Array.isArray(parsed.events) ? parsed.events.slice(0, MAX_EVENTS) : []
    if (events.length === 0) return new Response('ok')

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    
    // Get bot's user ID from destination field
    const botUserId = parsed.destination
    if (!botUserId || typeof botUserId !== 'string') {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 200, error: 'no destination' })
      return new Response('ok')
    }

    let processed = 0
    for (const event of events) {
      if (event?.type !== 'message' || event?.message?.type !== 'text') continue
      const platformUserId = event?.source?.userId
      const text = event?.message?.text
      const messageId = event?.message?.id
      if (!platformUserId || typeof platformUserId !== 'string' || platformUserId.length > 100) continue
      if (!text || typeof text !== 'string' || text.length > 5000) continue

      // Check idempotency - skip if message already processed
      if (messageId) {
        const { data: existingEvent } = await supabase
          .from('webhook_events')
          .select('id')
          .eq('platform', 'line')
          .eq('message_id', messageId)
          .maybeSingle()
        if (existingEvent) {
          logRequest({ function: FN, durationMs: Date.now() - start, status: 200, error: 'duplicate message' })
          continue
        }
      }

      const { data: conn } = await supabase
        .from('chat_platform_connections')
        .select('company_id')
        .eq('platform', 'line')
        .eq('platform_account_id', botUserId)
        .eq('is_active', true)
        .maybeSingle()
      const companyId = conn?.company_id || Deno.env.get('DEFAULT_COMPANY_ID') || ''
      if (!companyId) {
        logRequest({ function: FN, durationMs: Date.now() - start, status: 200, error: 'no company mapping' })
        return new Response('ok')
      }

      // Store event for idempotency
      if (messageId) {
        await supabase
          .from('webhook_events')
          .insert({ platform: 'line', message_id: messageId })
      }

      await handleIncomingMessage(
        {
          platform: 'line',
          platformUserId,
          message: text,
          replyToken: event.replyToken,
          companyId,
        },
        supabase
      )
      processed++
    }

    logRequest({ function: FN, durationMs: Date.now() - start, status: 200 })
    return new Response('ok')
  } catch (error) {
    logRequest({ function: FN, durationMs: Date.now() - start, status: 500, error: error instanceof Error ? error.message : String(error) })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})
