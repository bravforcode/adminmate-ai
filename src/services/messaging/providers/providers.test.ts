import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error })
  }
  return chain
}

const mockFrom = vi.fn()

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { emailProvider } from './emailProvider'
import { smsProvider } from './smsProvider'
import { lineProvider } from './lineProvider'
import { whatsappProvider } from './whatsappProvider'
import { inAppProvider } from './inAppProvider'
import { facebookProvider } from './facebookProvider'
import { getProvider, isChannelConfigured, sendMessage } from './index'
import { renderTemplate, validateTemplateVariables } from './types'

describe('messaging providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('emailProvider', () => {
    it('should check if configured', async () => {
      mockFrom.mockReturnValue(createChain({ is_enabled: true, config_status: 'configured' }))
      const result = await emailProvider.isConfigured('c1')
      expect(result).toBe(true)
    })

    it('should return false when not configured', async () => {
      mockFrom.mockReturnValue(createChain(null))
      const result = await emailProvider.isConfigured('c1')
      expect(result).toBe(false)
    })

    it('should return provider_not_configured when sending without config', async () => {
      mockFrom.mockReturnValue(createChain(null))
      const result = await emailProvider.send({ companyId: 'c1', channel: 'email', to: 'test@test.com', body: 'Hello' })
      expect(result.status).toBe('provider_not_configured')
    })
  })

  describe('smsProvider', () => {
    it('should not be configured', async () => {
      const result = await smsProvider.isConfigured()
      expect(result).toBe(false)
    })

    it('should return provider_not_configured', async () => {
      const result = await smsProvider.send({ companyId: 'c1', channel: 'sms', to: '+1234567890', body: 'Hello' })
      expect(result.status).toBe('provider_not_configured')
    })
  })

  describe('lineProvider', () => {
    it('should check platform connection', async () => {
      mockFrom.mockReturnValue(createChain({ id: '1' }))
      const result = await lineProvider.isConfigured('c1')
      expect(result).toBe(true)
    })

    it('should return false when no connection', async () => {
      mockFrom.mockReturnValue(createChain(null))
      const result = await lineProvider.isConfigured('c1')
      expect(result).toBe(false)
    })
  })

  describe('whatsappProvider', () => {
    it('should check platform connection', async () => {
      mockFrom.mockReturnValue(createChain({ id: '1' }))
      const result = await whatsappProvider.isConfigured('c1')
      expect(result).toBe(true)
    })

    it('should return false when no connection', async () => {
      mockFrom.mockReturnValue(createChain(null))
      const result = await whatsappProvider.isConfigured('c1')
      expect(result).toBe(false)
    })
  })

  describe('inAppProvider', () => {
    it('should always be configured', async () => {
      const result = await inAppProvider.isConfigured()
      expect(result).toBe(true)
    })

    it('should always succeed', async () => {
      const result = await inAppProvider.send({ companyId: 'c1', channel: 'in_app', to: 'u1', body: 'Hello' })
      expect(result.success).toBe(true)
      expect(result.status).toBe('sent')
    })
  })

  describe('facebookProvider', () => {
    it('should not be configured', async () => {
      const result = await facebookProvider.isConfigured()
      expect(result).toBe(false)
    })

    it('should return provider_not_configured', async () => {
      const result = await facebookProvider.send({ companyId: 'c1', channel: 'facebook', to: 'user123', body: 'Hello' })
      expect(result.status).toBe('provider_not_configured')
    })
  })

  describe('provider registry', () => {
    it('should get provider by channel', () => {
      expect(getProvider('email')).toBe(emailProvider)
      expect(getProvider('sms')).toBe(smsProvider)
      expect(getProvider('line')).toBe(lineProvider)
      expect(getProvider('whatsapp')).toBe(whatsappProvider)
      expect(getProvider('in_app')).toBe(inAppProvider)
      expect(getProvider('facebook')).toBe(facebookProvider)
    })

    it('should check channel configuration', async () => {
      mockFrom.mockReturnValue(createChain(null))
      const result = await isChannelConfigured('email', 'c1')
      expect(typeof result).toBe('boolean')
    })

    it('should return false for unknown channel', async () => {
      const result = await isChannelConfigured('unknown' as any, 'c1')
      expect(result).toBe(false)
    })

    it('should send via provider', async () => {
      mockFrom.mockReturnValue(createChain({ is_enabled: true, config_status: 'configured' }))
      const result = await sendMessage('email', 'c1', 'test@test.com', 'Hello')
      expect(result).toHaveProperty('success')
    })

    it('should return error for unknown channel', async () => {
      const result = await sendMessage('unknown' as any, 'c1', 'test', 'body')
      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('Unknown channel')
    })
  })
})

describe('template rendering', () => {
  describe('renderTemplate', () => {
    it('should replace variables', () => {
      const result = renderTemplate(
        'Hello {{name}}',
        'Dear {{name}}, your application for {{position}} is received.',
        { name: 'John', position: 'Engineer' },
        [
          { name: 'name', type: 'string', required: true },
          { name: 'position', type: 'string', required: true },
        ],
      )
      expect(result.subject).toBe('Hello John')
      expect(result.body).toBe('Dear John, your application for Engineer is received.')
      expect(result.missingVariables).toHaveLength(0)
    })

    it('should track missing required variables', () => {
      const result = renderTemplate(
        null,
        'Hello {{name}}',
        {},
        [{ name: 'name', type: 'string', required: true }],
      )
      expect(result.missingVariables).toContain('name')
    })

    it('should use default values', () => {
      const result = renderTemplate(
        null,
        'Hello {{name}}',
        {},
        [{ name: 'name', type: 'string', required: false, defaultValue: 'User' }],
      )
      expect(result.body).toBe('Hello User')
    })

    it('should handle null subject', () => {
      const result = renderTemplate(
        null,
        'Body text',
        {},
        [],
      )
      expect(result.subject).toBeUndefined()
      expect(result.body).toBe('Body text')
    })
  })

  describe('validateTemplateVariables', () => {
    it('should validate required variables', () => {
      const result = validateTemplateVariables(
        { name: 'John' },
        [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
        ],
      )
      expect(result.valid).toBe(false)
      expect(result.missing).toContain('email')
    })

    it('should pass when all required present', () => {
      const result = validateTemplateVariables(
        { name: 'John', email: 'john@test.com' },
        [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
        ],
      )
      expect(result.valid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('should ignore optional variables', () => {
      const result = validateTemplateVariables(
        {},
        [{ name: 'optional', type: 'string', required: false }],
      )
      expect(result.valid).toBe(true)
    })
  })
})
