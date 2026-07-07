import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getCorsHeaders,
  handleCorsPreflight,
  logRequest,
  timingSafeEqual,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'process-message-queue'
const BATCH_SIZE = 10
const MAX_RETRIES = 3

interface QueueMessage {
  id: string
  company_id: string
  platform: string
  platform_user_id: string
  content: string
  content_type: string
  priority: number
  retry_count: number
  status: string
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: getCorsHeaders(req) }
      )
    }

    // Verify cron secret (x-cron-secret header, matching existing edge function pattern)
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret || !expectedSecret || !timingSafeEqual(cronSecret, expectedSecret)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid cron secret' }),
        { status: 401, headers: getCorsHeaders(req) }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch pending messages ordered by priority (highest first) then creation time.
    // next_retry_at filter honors exponential backoff set on failed attempts.
    const now = new Date().toISOString()
    const { data: messages, error } = await supabase
      .from('message_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (error) {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 500, error: error.message })
      return errorResponse(error, 500, getCorsHeaders(req))
    }

    if (!messages || messages.length === 0) {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 200 })
      return new Response(
        JSON.stringify({ success: true, data: { processed: 0, failed: 0 } }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Mark messages as processing
    const messageIds = messages.map((m: QueueMessage) => m.id)
    await supabase
      .from('message_queue')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .in('id', messageIds)

    let processed = 0
    let failed = 0

    for (const msg of messages) {
      try {
        if (msg.platform === 'line') {
          // LINE Messaging API push
          const token = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
          if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured')

          const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: msg.platform_user_id,
              messages: [{ type: 'text', text: msg.content }],
            }),
          })

          if (!res.ok) {
            const body = await res.text()
            throw new Error(`LINE API ${res.status}: ${body}`)
          }
        } else if (msg.platform === 'whatsapp') {
          // WhatsApp Cloud API
          const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
          const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
          if (!token || !phoneNumberId) throw new Error('WhatsApp credentials not configured')

          const res = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: msg.platform_user_id,
                type: 'text',
                text: { body: msg.content },
              }),
            }
          )

          if (!res.ok) {
            const body = await res.text()
            throw new Error(`WhatsApp API ${res.status}: ${body}`)
          }
        } else {
          // Unknown platform — mark as failed
          throw new Error(`Unsupported platform: ${msg.platform}`)
        }

        // Mark as sent
        await supabase
          .from('message_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', msg.id)

        processed++
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        const newRetryCount = (msg.retry_count || 0) + 1
        const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending'

        // Update with retry info
        await supabase
          .from('message_queue')
          .update({
            status: newStatus,
            retry_count: newRetryCount,
            last_error: errorMessage,
            next_retry_at: newStatus === 'pending'
              ? new Date(Date.now() + 5000 * Math.pow(2, newRetryCount)).toISOString()
              : null,
          })
          .eq('id', msg.id)

        failed++
        console.error(`[process-message-queue] Failed msg ${msg.id}: ${errorMessage}`)
      }
    }

    logRequest({ function: FN, durationMs: Date.now() - start, status: 200 })
    return new Response(
      JSON.stringify({ success: true, data: { processed, failed } }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    logRequest({
      function: FN,
      durationMs: Date.now() - start,
      status: 500,
      error: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})
