import type { MessageProvider, MessageChannel } from './types'
import { emailProvider } from './emailProvider'
import { lineProvider } from './lineProvider'
import { whatsappProvider } from './whatsappProvider'
import { inAppProvider } from './inAppProvider'
import { smsProvider } from './smsProvider'
import { facebookProvider } from './facebookProvider'

/* ============================================================
   Provider Registry — central lookup for all messaging providers
   ============================================================ */

const providers: Record<MessageChannel, MessageProvider> = {
  email: emailProvider,
  line: lineProvider,
  whatsapp: whatsappProvider,
  in_app: inAppProvider,
  sms: smsProvider,
  facebook: facebookProvider,
}

export function getProvider(channel: MessageChannel): MessageProvider {
  return providers[channel]
}

export async function isChannelConfigured(channel: MessageChannel, companyId: string): Promise<boolean> {
  const provider = providers[channel]
  if (!provider) return false
  return provider.isConfigured(companyId)
}

export async function sendMessage(
  channel: MessageChannel,
  companyId: string,
  to: string,
  body: string,
  subject?: string,
  metadata?: Record<string, unknown>
) {
  const provider = providers[channel]
  if (!provider) {
    return { success: false, provider: 'unknown', status: 'failed' as const, errorMessage: `Unknown channel: ${channel}` }
  }
  return provider.send({ companyId, channel, to, body, subject, metadata })
}

export { emailProvider, lineProvider, whatsappProvider, inAppProvider, smsProvider, facebookProvider }
