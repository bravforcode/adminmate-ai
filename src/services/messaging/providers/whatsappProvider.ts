import type { MessageProvider, MessageProviderSendInput, MessageProviderSendResult } from './types'
import { supabase } from '../../../lib/supabase'

/* ============================================================
   WhatsApp Provider Adapter (checks vault-backed token)
   ============================================================ */

export const whatsappProvider: MessageProvider = {
  provider: 'whatsapp',
  channel: 'whatsapp',

  async isConfigured(companyId: string): Promise<boolean> {
    const { data } = await supabase
      .from('chat_platform_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('platform', 'whatsapp')
      .eq('is_active', true)
      .maybeSingle()
    return !!data
  },

  async send(input: MessageProviderSendInput): Promise<MessageProviderSendResult> {
    if (!(await this.isConfigured(input.companyId))) {
      return {
        success: false,
        provider: 'whatsapp',
        status: 'provider_not_configured',
        errorMessage: 'WhatsApp channel not configured for this company.',
      }
    }

    // Actual sending happens in MessagingHub.processQueue() on the server side
    return {
      success: false,
      provider: 'whatsapp',
      status: 'provider_not_configured',
      errorMessage: 'WhatsApp sending via client not supported. Use server-side queue.',
    }
  },
}
