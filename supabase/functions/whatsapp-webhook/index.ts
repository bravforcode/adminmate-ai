import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleIncomingMessage } from '../_shared/messageHandler.ts'
import { corsHeaders } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }
  try {
    const body = await req.json()
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const message = value?.messages?.[0]
    if (!message || message.type !== 'text') return new Response('ok')

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const phoneNumberId = value.metadata?.phone_number_id
    const { data: conn } = await supabase.from('chat_platform_connections').select('company_id').eq('platform', 'whatsapp').eq('platform_account_id', phoneNumberId).eq('is_active', true).maybeSingle()
    await handleIncomingMessage({
      platform: 'whatsapp', platformUserId: message.from, message: message.text?.body || '',
      companyId: conn?.company_id || Deno.env.get('DEFAULT_COMPANY_ID') || '',
    }, supabase)
    return new Response('ok')
  } catch (error) { return errorResponse(error, 500, corsHeaders) }
})
