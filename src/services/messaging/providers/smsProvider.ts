import type { MessageProvider, MessageProviderSendInput, MessageProviderSendResult } from './types'

/* ============================================================
   SMS Provider Adapter (stub — requires Twilio/SMS gateway)
   ============================================================ */

export const smsProvider: MessageProvider = {
  provider: 'sms',
  channel: 'sms',

  async isConfigured(): Promise<boolean> {
    // SMS provider not yet configured
    return false
  },

  async send(_input: MessageProviderSendInput): Promise<MessageProviderSendResult> {
    return {
      success: false,
      provider: 'sms',
      status: 'provider_not_configured',
      errorMessage: 'SMS provider not configured. Contact administrator.',
    }
  },
}
