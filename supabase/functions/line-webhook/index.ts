import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'
import { handleIncomingMessage } from '../_shared/messageHandler.ts'
import { corsHeaders } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok')
  try {
    const body = await req.text()
    const signature = req.headers.get('x-line-signature')
    const secret = Deno.env.get('LINE_CHANNEL_SECRET') || ''
    if (secret && signature) {
      const hmac = createHmac('sha256', secret)
      hmac.update(body)
      if (hmac.digest('base64') !== signature) return new Response('Forbidden', { status: 401 })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { events } = JSON.parse(body)

    for (const event of events || []) {
      if (event.type !== 'message' || event.message?.type !== 'text') continue
      const { data: conn } = await supabase.from('chat_platform_connections').select('company_id').eq('platform', 'line').eq('is_active', true).maybeSingle()
      await handleIncomingMessage({
        platform: 'line', platformUserId: event.source.userId, message: event.message.text, replyToken: event.replyToken,
        companyId: conn?.company_id || Deno.env.get('DEFAULT_COMPANY_ID') || '',
      }, supabase)
    }
    return new Response('ok')
  } catch (error) { return errorResponse(error, 500, corsHeaders) }
})
