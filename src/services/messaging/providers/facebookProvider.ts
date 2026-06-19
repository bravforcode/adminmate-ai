import type { MessageProvider, MessageProviderSendInput, MessageProviderSendResult } from './types'

/* ============================================================
   Facebook Provider Adapter (stub — requires Meta API config)
   ============================================================ */

export const facebookProvider: MessageProvider = {
  provider: 'facebook',
  channel: 'facebook',

  async isConfigured(): Promise<boolean> {
    return false
  },

  async send(_input: MessageProviderSendInput): Promise<MessageProviderSendResult> {
    return {
      success: false,
      provider: 'facebook',
      status: 'provider_not_configured',
      errorMessage: 'Facebook Messenger not configured. Contact administrator.',
    }
  },
}
