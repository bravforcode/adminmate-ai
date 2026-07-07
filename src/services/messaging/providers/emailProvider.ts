import type { MessageProvider, MessageProviderSendInput, MessageProviderSendResult } from './types'
import { supabase } from '../../../lib/supabase'

/* ============================================================
   Email Provider Adapter (stub — requires SMTP/SendGrid config)
   ============================================================ */

export const emailProvider: MessageProvider = {
  provider: 'email',
  channel: 'email',

  async isConfigured(companyId: string): Promise<boolean> {
    const { data } = await supabase
      .from('messaging_provider_configs')
      .select('is_enabled, config_status')
      .eq('company_id', companyId)
      .eq('provider', 'email')
      .maybeSingle()
    return data?.is_enabled === true && data?.config_status === 'configured'
  },

  async send(input: MessageProviderSendInput): Promise<MessageProviderSendResult> {
    if (!(await this.isConfigured(input.companyId))) {
      return {
        success: false,
        provider: 'email',
        status: 'provider_not_configured',
        errorMessage: 'Email provider not configured. Contact administrator.',
      }
    }

    // Real implementation would call SMTP/SendGrid/Mailgun API
    // For now, return provider_not_configured until real SMTP is wired
    return {
      success: false,
      provider: 'email',
      status: 'provider_not_configured',
      errorMessage: 'Email sending not yet implemented. Configure SMTP provider first.',
    }
  },
}
