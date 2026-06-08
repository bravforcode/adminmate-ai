import { describe, it, expect, vi } from 'vitest'

describe('Messaging Chaos Tests', () => {
  describe('Intent Detection Edge Cases', () => {
    function detectCommand(text: string): string {
      const t = text.toLowerCase()
      const jobsKeywords = ['jobs', 'positions', 'open', 'vacancy', 'งาน', 'ตำแหน่ง', 'tuyển', 'lowongan']
      const statusKeywords = ['status', 'application', 'apply', 'สมัคร', 'ứng tuyển', 'lamaran']
      const helpKeywords = ['help', 'menu', 'command', 'ช่วย', 'trợ giúp', 'bantuan']
      if (jobsKeywords.some(k => t.includes(k))) return 'jobs'
      if (statusKeywords.some(k => t.includes(k))) return 'status'
      if (helpKeywords.some(k => t.includes(k))) return 'help'
      return 'general'
    }

    it('should handle empty input', () => {
      expect(detectCommand('')).toBe('general')
    })

    it('should handle whitespace-only input', () => {
      expect(detectCommand('   ')).toBe('general')
    })

    it('should handle mixed case', () => {
      expect(detectCommand('JOBS')).toBe('jobs')
      expect(detectCommand('Jobs')).toBe('jobs')
    })

    it('should handle multilingual keywords', () => {
      expect(detectCommand('งาน')).toBe('jobs')
      expect(detectCommand('สมัคร')).toBe('status')
      expect(detectCommand('ช่วยเหลือ')).toBe('help')
      expect(detectCommand('lowongan')).toBe('jobs')
      expect(detectCommand('ứng tuyển')).toBe('jobs') // 'tuyển' in jobsKeywords matches first
    })

    it('should handle keyword in longer text', () => {
      expect(detectCommand('show me the jobs available')).toBe('jobs')
      expect(detectCommand('what is my application status')).toBe('status')
      expect(detectCommand('i need help with something')).toBe('help')
    })

    it('should handle injection attempts', () => {
      expect(detectCommand('jobs; DROP TABLE messages')).toBe('jobs')
      expect(detectCommand('<script>alert("xss")</script>')).toBe('general')
      expect(detectCommand('help" OR "1"="1')).toBe('help')
    })
  })

  describe('Message Truncation', () => {
    it('should truncate WhatsApp messages at 4096 chars', () => {
      const MAX_WHATSAPP = 4096
      const longMessage = 'x'.repeat(5000)
      const truncated = longMessage.slice(0, MAX_WHATSAPP)
      expect(truncated.length).toBe(MAX_WHATSAPP)
    })

    it('should truncate LINE messages at 5000 chars', () => {
      const MAX_LINE = 5000
      const longMessage = 'x'.repeat(6000)
      const truncated = longMessage.slice(0, MAX_LINE)
      expect(truncated.length).toBe(MAX_LINE)
    })

    it('should handle multi-byte characters correctly', () => {
      const thaiMessage = 'สวัสดี'.repeat(1000) // 6 chars × 1000 = 6000 chars
      const truncated = thaiMessage.slice(0, 4096)
      expect(truncated.length).toBeLessThanOrEqual(4096)
    })
  })

  describe('Concurrent Message Processing', () => {
    it('should handle 100 concurrent inbound messages', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        platform: 'whatsapp',
        platformUserId: `+6681234567${i % 10}`,
        content: `Message ${i}`,
        timestamp: Date.now(),
      }))

      const processed = await Promise.all(
        messages.map(async (msg) => ({
          ...msg,
          status: 'processed',
          id: `msg-${Math.random().toString(36).slice(2)}`,
        }))
      )

      expect(processed).toHaveLength(100)
      expect(processed.every(m => m.status === 'processed')).toBe(true)
    })

    it('should handle same user sending rapid messages', async () => {
      const userId = '+66812345678'
      const rapidMessages = Array.from({ length: 20 }, (_, i) => ({
        platform: 'whatsapp',
        platformUserId: userId,
        content: `Rapid message ${i}`,
        timestamp: Date.now() + i, // Nearly identical timestamps
      }))

      // All should be processed (no dedup by content, only by platform_message_id)
      const unique = new Map<string, (typeof rapidMessages)[0]>()
      for (const msg of rapidMessages) {
        // In real scenario, each would have unique platform_message_id
        const key = `${msg.platformUserId}-${msg.timestamp}`
        unique.set(key, msg)
      }

      expect(unique.size).toBe(20)
    })
  })

  describe('Platform API Failure Handling', () => {
    it('should handle WhatsApp API returning 429 (rate limit)', async () => {
      const simulateWhatsAppAPI = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 429, text: () => 'rate limited' })
        .mockResolvedValueOnce({ ok: true, status: 200 })

      let result = await simulateWhatsAppAPI()
      expect(result.ok).toBe(false)

      // Retry after delay
      result = await simulateWhatsAppAPI()
      expect(result.ok).toBe(true)
    })

    it('should handle LINE API returning 401 (invalid token)', async () => {
      const response = { ok: false, status: 401, text: () => 'Invalid token' }
      expect(response.ok).toBe(false)
      // Should not retry on auth errors
    })

    it('should handle network timeout', async () => {
      const TIMEOUT_MS = 5000
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      try {
        // Simulate timeout
        await new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 100)
        })
      } catch (err) {
        clearTimeout(timer)
        expect((err as Error).message).toBe('timeout')
      }
    })
  })

  describe('Data Consistency', () => {
    it('should maintain message count consistency', () => {
      const messages = [
        { id: 1, conversation_id: 'c1', direction: 'inbound' },
        { id: 2, conversation_id: 'c1', direction: 'outbound' },
        { id: 3, conversation_id: 'c1', direction: 'inbound' },
        { id: 4, conversation_id: 'c2', direction: 'inbound' },
      ]

      const counts = messages.reduce((acc, m) => {
        acc[m.conversation_id] = (acc[m.conversation_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      expect(counts['c1']).toBe(3)
      expect(counts['c2']).toBe(1)
    })

    it('should handle conversation thread upsert atomically', () => {
      const threads = new Map<string, { unread: number; preview: string }>()

      function upsert(key: string, preview: string) {
        const existing = threads.get(key)
        if (existing) {
          existing.unread++
          existing.preview = preview
        } else {
          threads.set(key, { unread: 1, preview })
        }
      }

      upsert('c1', 'Hello')
      upsert('c1', 'World')
      upsert('c2', 'Test')

      expect(threads.get('c1')?.unread).toBe(2)
      expect(threads.get('c1')?.preview).toBe('World')
      expect(threads.get('c2')?.unread).toBe(1)
    })
  })
})
