import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface UnifiedMessage {
  company_id: string
  conversation_id?: string
  platform: 'whatsapp' | 'line' | 'web' | 'email'
  platform_message_id?: string
  platform_user_id: string
  direction: 'inbound' | 'outbound'
  content: string
  content_type?: 'text' | 'image' | 'audio' | 'video' | 'file' | 'template'
  sender_type: 'user' | 'ai' | 'agent' | 'system'
  sender_id?: string
  metadata?: Record<string, unknown>
}

export interface SendMessageOptions {
  company_id: string
  platform: 'whatsapp' | 'line' | 'web' | 'email'
  platform_user_id: string
  content: string
  content_type?: string
  reply_to_message_id?: string
  priority?: number
  metadata?: Record<string, unknown>
}

export class MessagingHub {
  private supabase: ReturnType<typeof createClient>

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase
  }

  // Store inbound message and update conversation
  async receiveMessage(msg: UnifiedMessage): Promise<{ message_id: string; conversation_id: string }> {
    // 1. Get or create conversation thread
    const { data: threadId } = await this.supabase.rpc('get_or_create_conversation', {
      p_company_id: msg.company_id,
      p_platform: msg.platform,
      p_platform_user_id: msg.platform_user_id,
    })

    const conversationId = threadId as string

    // 2. Check for duplicate (idempotency)
    if (msg.platform_message_id) {
      const { data: existing } = await this.supabase
        .from('messages')
        .select('id')
        .eq('platform_message_id', msg.platform_message_id)
        .eq('platform', msg.platform)
        .maybeSingle()
      
      if (existing) {
        return { message_id: existing.id, conversation_id: conversationId }
      }
    }

    // 3. Insert message
    const { data: message, error: msgError } = await this.supabase
      .from('messages')
      .insert({
        company_id: msg.company_id,
        conversation_id: conversationId,
        platform: msg.platform,
        platform_message_id: msg.platform_message_id,
        platform_user_id: msg.platform_user_id,
        direction: msg.direction,
        content: msg.content,
        content_type: msg.content_type || 'text',
        sender_type: msg.sender_type,
        sender_id: msg.sender_id,
        status: 'received',
        metadata: msg.metadata || {},
      })
      .select('id')
      .single()

    if (msgError) throw msgError

    // 4. Update conversation thread preview
    await this.supabase.rpc('upsert_conversation_thread', {
      p_company_id: msg.company_id,
      p_platform: msg.platform,
      p_platform_user_id: msg.platform_user_id,
      p_message_preview: msg.content.slice(0, 200),
    })

    // 5. Log to sync log
    await this.logSync(msg.company_id, msg.platform, 'message.received', msg)

    return { message_id: message.id, conversation_id: conversationId }
  }

  // Queue outbound message for reliable delivery
  async sendMessage(opts: SendMessageOptions): Promise<{ queue_id: string }> {
    const { data: queueItem, error } = await this.supabase
      .from('message_queue')
      .insert({
        company_id: opts.company_id,
        platform: opts.platform,
        platform_user_id: opts.platform_user_id,
        content: opts.content,
        content_type: opts.content_type || 'text',
        reply_to_message_id: opts.reply_to_message_id,
        priority: opts.priority || 0,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) throw error
    return { queue_id: queueItem.id }
  }

  // Process queue and send via platform API
  async processQueue(batchSize: number = 5): Promise<number> {
    const { data: items, error } = await this.supabase.rpc('process_message_queue', {
      p_batch_size: batchSize,
    })

    if (error) throw error
    if (!items || items.length === 0) return 0

    let sent = 0
    for (const item of items) {
      try {
        await this.sendViaPlatform(item)
        await this.supabase.rpc('mark_queue_sent', { p_queue_id: item.queue_id })
        
        // Also store in messages table
        await this.receiveMessage({
          company_id: item.company_id,
          platform: item.platform,
          platform_user_id: item.platform_user_id,
          direction: 'outbound',
          content: item.content,
          content_type: item.content_type,
          sender_type: 'ai',
          sender_id: 'system',
          metadata: { queue_id: item.queue_id },
        })
        
        sent++
      } catch (err) {
        await this.supabase.rpc('mark_queue_failed', {
          p_queue_id: item.queue_id,
          p_error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return sent
  }

  // Send via platform-specific API
  private async sendViaPlatform(item: any): Promise<void> {
    if (item.platform === 'whatsapp') {
      await this.sendWhatsApp(item)
    } else if (item.platform === 'line') {
      await this.sendLINE(item)
    }
  }

  private async sendWhatsApp(item: any): Promise<void> {
    const { data: conn } = await this.supabase
      .from('chat_platform_connections')
      .select('access_token_vault_id, platform_account_id')
      .eq('company_id', item.company_id)
      .eq('platform', 'whatsapp')
      .eq('is_active', true)
      .single()

    let token: string | undefined
    if (conn?.access_token_vault_id) {
      const { data: decrypted } = await this.supabase.rpc('get_decrypted_token', { p_secret_id: conn.access_token_vault_id })
      token = decrypted as string
    }
    token = token || Deno.env.get('WHATSAPP_API_TOKEN')
    const phoneId = conn?.platform_account_id || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    if (!token || !phoneId) throw new Error('WhatsApp not configured')

    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: item.platform_user_id,
        type: 'text',
        text: { body: item.content.slice(0, 4096) },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`WhatsApp API error: ${res.status} - ${err}`)
    }
  }

  private async sendLINE(item: any): Promise<void> {
    const { data: conn } = await this.supabase
      .from('chat_platform_connections')
      .select('access_token_vault_id')
      .eq('company_id', item.company_id)
      .eq('platform', 'line')
      .eq('is_active', true)
      .single()

    let token: string | undefined
    if (conn?.access_token_vault_id) {
      const { data: decrypted } = await this.supabase.rpc('get_decrypted_token', { p_secret_id: conn.access_token_vault_id })
      token = decrypted as string
    }
    token = token || Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
    if (!token) throw new Error('LINE not configured')

    // LINE uses push message for outbound (not reply)
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: item.platform_user_id,
        messages: [{ type: 'text', text: item.content.slice(0, 5000) }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`LINE API error: ${res.status} - ${err}`)
    }
  }

  // Get conversation history
  async getConversationHistory(
    companyId: string,
    platform: string,
    platformUserId: string,
    limit: number = 50,
    before?: string
  ): Promise<any[]> {
    let query = this.supabase
      .from('messages')
      .select('*')
      .eq('company_id', companyId)
      .eq('platform', platform)
      .eq('platform_user_id', platformUserId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // Get all conversations for a company
  async getConversations(companyId: string, platform?: string): Promise<any[]> {
    let query = this.supabase
      .from('conversation_threads')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })

    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // Log sync event
  private async logSync(
    companyId: string,
    platform: string,
    eventType: string,
    payload: unknown
  ): Promise<void> {
    // Simple hash for dedup (not cryptographic, just for dedup)
    const payloadStr = JSON.stringify(payload)
    let hash = 0
    for (let i = 0; i < payloadStr.length; i++) {
      const char = payloadStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    const payloadHash = hash.toString(16)

    await this.supabase.from('platform_sync_log').insert({
      company_id: companyId,
      platform,
      event_type: eventType,
      payload_hash: payloadHash,
      status: 'success',
    })
  }

  // Health check
  async healthCheck(): Promise<{ whatsapp: string; line: string; database: string }> {
    const checks = { whatsapp: 'unknown', line: 'unknown', database: 'unknown' }

    // Database check
    try {
      const { error } = await this.supabase.from('messages').select('id').limit(1)
      checks.database = error ? 'degraded' : 'healthy'
    } catch {
      checks.database = 'down'
    }

    // WhatsApp config check
    const waToken = Deno.env.get('WHATSAPP_API_TOKEN')
    checks.whatsapp = waToken ? 'configured' : 'not_configured'

    // LINE config check
    const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
    checks.line = lineToken ? 'configured' : 'not_configured'

    return checks
  }
}
