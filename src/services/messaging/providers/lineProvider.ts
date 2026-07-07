import type { MessageProvider, MessageProviderSendInput, MessageProviderSendResult } from './types'
import { supabase } from '../../../lib/supabase'

/* ============================================================
   LINE Provider Adapter (checks vault-backed token)
   ============================================================ */

export const lineProvider: MessageProvider = {
  provider: 'line',
  channel: 'line',

  async isConfigured(companyId: string): Promise<boolean> {
    // Check platform connection
    const { data } = await supabase
      .from('chat_platform_connections')
      .select('id')
      .eq('company_id', companyId)
      .eq('platform', 'line')
      .eq('is_active', true)
      .maybeSingle()
    return !!data
  },

  async send(input: MessageProviderSendInput): Promise<MessageProviderSendResult> {
    if (!(await this.isConfigured(input.companyId))) {
      return {
        success: false,
        provider: 'line',
        status: 'provider_not_configured',
        errorMessage: 'LINE channel not configured for this company.',
      }
    }

    // Real implementation would call LINE Push API
    // Actual sending happens in MessagingHub.processQueue() on the server side
    return {
      success: false,
      provider: 'line',
      status: 'provider_not_configured',
      errorMessage: 'LINE sending via client not supported. Use server-side queue.',
    }
  },
}
