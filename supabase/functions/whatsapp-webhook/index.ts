import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { handleIncomingMessage } from '../_shared/messageHandler.ts'
import { getCorsHeaders, getJsonHeaders, logRequest } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'whatsapp-webhook'
const MAX_BODY_BYTES = 1_000_000

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  const start = Date.now()
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')
      const expected = Deno.env.get('WHATSAPP_VERIFY_TOKEN')
      if (!expected) {
        return new Response('Webhook not configured', { status: 503 })
      }
      if (mode === 'subscribe' && token === expected && challenge) {
        return new Response(challenge, { status: 200 })
      }
      logRequest({ function: FN, durationMs: Date.now() - start, status: 403, error: 'webhook verification failed' })
      return new Response('Forbidden', { status: 403 })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: getJsonHeaders(req) })
    }

    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_BYTES) {
      return new Response('Payload too large', { status: 413 })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    
    // Read body as text first for signature verification
    const bodyText = await req.text()
    if (!bodyText || bodyText.length > MAX_BODY_BYTES) {
      return new Response('Invalid body', { status: 400 })
    }

    // Verify WhatsApp signature — fail closed
    const signature = req.headers.get('x-hub-signature-256')
    const secret = Deno.env.get('WHATSAPP_APP_SECRET')
    if (!secret) {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 500, error: 'WHATSAPP_APP_SECRET not configured' })
      return new Response('Server configuration error', { status: 500 })
    }
    if (!signature) {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 403, error: 'missing signature' })
      return new Response('Forbidden', { status: 403 })
    }
    const hmac = createHmac('sha256', secret)
    hmac.update(bodyText)
    const expectedSignature = `sha256=${hmac.digest('hex')}`
    // Constant-time comparison to prevent timing attacks on HMAC verification
    const sigBuf = Buffer.from(signature, 'utf-8')
    const expBuf = Buffer.from(expectedSignature, 'utf-8')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 403, error: 'invalid signature' })
      return new Response('Forbidden', { status: 403 })
    }

    // Parse body after verification
    let body
    try { body = JSON.parse(bodyText) } catch { return new Response('Invalid JSON', { status: 400 }) }
    if (!body) return new Response('Invalid JSON', { status: 400 })

    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const message = value?.messages?.[0]
    if (!message || message.type !== 'text') return new Response('ok')

    // Check idempotency - skip if message already processed
    const messageId = message.id
    if (messageId) {
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('platform', 'whatsapp')
        .eq('message_id', messageId)
        .maybeSingle()
      if (existingEvent) {
        logRequest({ function: FN, durationMs: Date.now() - start, status: 200, error: 'duplicate message' })
        return new Response('ok')
      }
    }

    const from = message.from
    const text = message.text?.body
    if (!from || typeof from !== 'string' || from.length > 32) return new Response('ok')
    if (!text || typeof text !== 'string' || text.length > 4096) return new Response('ok')

    const phoneNumberId = value.metadata?.phone_number_id
    if (!phoneNumberId || typeof phoneNumberId !== 'string') {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 200, error: 'no phone_number_id' })
      return new Response('ok')
    }

    const { data: conn } = await supabase
      .from('chat_platform_connections')
      .select('company_id')
      .eq('platform', 'whatsapp')
      .eq('platform_account_id', phoneNumberId)
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
        .insert({ platform: 'whatsapp', message_id: messageId })
    }

    await handleIncomingMessage(
      { platform: 'whatsapp', platformUserId: from, message: text, companyId },
      supabase
    )

    logRequest({ function: FN, durationMs: Date.now() - start, status: 200 })
    return new Response('ok')
  } catch (error) {
    logRequest({ function: FN, durationMs: Date.now() - start, status: 500, error: error instanceof Error ? error.message : String(error) })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})
