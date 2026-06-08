import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MessagingHub } from '../_shared/messagingHub.ts'
import {
  corsHeaders,
  JSON_HEADERS,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'messaging-hub'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: JSON_HEADERS }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const user = await verifyAuth(req, supabase)
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: JSON_HEADERS }
      )
    }
    userId = user.id

    const rateLimited = await enforceRateLimit(supabase, user.id, 'messaging_hub', 60, 60)
    if (rateLimited) return rateLimited

    const hub = new MessagingHub(supabase)
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'conversations'

    switch (action) {
      case 'conversations': {
        const platform = url.searchParams.get('platform') || undefined
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (!profile?.company_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'No company associated' }),
            { status: 403, headers: JSON_HEADERS }
          )
        }

        const conversations = await hub.getConversations(profile.company_id, platform)
        logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200, action: 'get_conversations' })
        return new Response(
          JSON.stringify({ success: true, data: conversations }),
          { headers: JSON_HEADERS }
        )
      }

      case 'history': {
        const platform = url.searchParams.get('platform')
        const platformUserId = url.searchParams.get('platform_user_id')
        const limit = parseInt(url.searchParams.get('limit') || '50')

        if (!platform || !platformUserId) {
          return new Response(
            JSON.stringify({ success: false, error: 'platform and platform_user_id required' }),
            { status: 400, headers: JSON_HEADERS }
          )
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (!profile?.company_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'No company associated' }),
            { status: 403, headers: JSON_HEADERS }
          )
        }

        const history = await hub.getConversationHistory(
          profile.company_id,
          platform,
          platformUserId,
          limit
        )

        logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200, action: 'get_history' })
        return new Response(
          JSON.stringify({ success: true, data: history }),
          { headers: JSON_HEADERS }
        )
      }

      case 'send': {
        let body: any
        try {
          body = await req.json()
        } catch {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid JSON body' }),
            { status: 400, headers: JSON_HEADERS }
          )
        }

        const { platform, platform_user_id, content, content_type, priority } = body
        if (!platform || !platform_user_id || !content) {
          return new Response(
            JSON.stringify({ success: false, error: 'platform, platform_user_id, and content required' }),
            { status: 400, headers: JSON_HEADERS }
          )
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single()

        if (!profile?.company_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'No company associated' }),
            { status: 403, headers: JSON_HEADERS }
          )
        }

        const result = await hub.sendMessage({
          company_id: profile.company_id,
          platform,
          platform_user_id,
          content,
          content_type: content_type || 'text',
          priority: priority || 0,
        })

        await hub.processQueue(1)

        logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200, action: 'send_message' })
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: JSON_HEADERS }
        )
      }

      case 'health': {
        const health = await hub.healthCheck()
        logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200, action: 'health' })
        return new Response(
          JSON.stringify({ success: true, data: health }),
          { headers: JSON_HEADERS }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unknown action' }),
          { status: 400, headers: JSON_HEADERS }
        )
    }
  } catch (error: any) {
    logRequest({
      function: FN,
      userId,
      durationMs: Date.now() - start,
      status: 500,
      error: error?.message,
    })
    return errorResponse(error, 500, corsHeaders)
  }
})