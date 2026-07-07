import type { MessageProvider, MessageProviderSendInput, MessageProviderSendResult } from './types'

/* ============================================================
   In-App Provider Adapter (always available, no external config)
   ============================================================ */

export const inAppProvider: MessageProvider = {
  provider: 'in_app',
  channel: 'in_app',

  async isConfigured(): Promise<boolean> {
    // In-app messaging is always available
    return true
  },

  async send(_input: MessageProviderSendInput): Promise<MessageProviderSendResult> {
    // In-app messages are stored directly in notifications table
    // No external API call needed
    return {
      success: true,
      provider: 'in_app',
      status: 'sent',
    }
  },
}
