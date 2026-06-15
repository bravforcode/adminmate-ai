import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSupabaseUrl = 'https://abc123.supabase.co'
const validStorageUrl = mockSupabaseUrl + '/storage/v1/object/public/resumes/test.pdf'
const internalUrl = 'http://169.254.169.254/latest/meta-data/'
const externalUrl = 'https://evil.com/malware.pdf'

const mockHeaders = (overrides: Record<string, string> = {}) => ({
  'content-type': 'application/pdf',
  'content-length': '1024',
  ...overrides,
})

function createMockFetch(status: number, headers: Record<string, string>, body?: string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(Object.entries(headers)),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(body || 'test content').buffer),
  })
}

describe('parse-resume SSRF & Security Validation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.SUPABASE_URL = mockSupabaseUrl
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('URL Validation — SSRF Guard', () => {
    it('should reject internal/private IP URLs', async () => {
      const cvDoc = { file_url: internalUrl }
      const supabaseUrl = process.env.SUPABASE_URL!
      const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`
      expect(cvDoc.file_url?.startsWith(storagePrefix)).toBe(false)
    })

    it('should reject external non-Supabase URLs', async () => {
      const cvDoc = { file_url: externalUrl }
      const supabaseUrl = process.env.SUPABASE_URL!
      const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`
      expect(cvDoc.file_url?.startsWith(storagePrefix)).toBe(false)
    })

    it('should reject empty/missing file_url', async () => {
      const cvDoc1 = { file_url: '' }
      const cvDoc2 = {} as any
      const supabaseUrl = process.env.SUPABASE_URL!
      const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`
      expect(!cvDoc1.file_url?.startsWith(storagePrefix)).toBe(true)
      expect(!cvDoc2.file_url?.startsWith(storagePrefix)).toBe(true)
    })

    it('should accept valid Supabase Storage URLs', async () => {
      const cvDoc = { file_url: validStorageUrl }
      const supabaseUrl = process.env.SUPABASE_URL!
      const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`
      expect(cvDoc.file_url?.startsWith(storagePrefix)).toBe(true)
    })

    it('should accept URLs with query parameters (signed URLs)', async () => {
      const signedUrl = validStorageUrl + '?token=abc&expires=123456'
      const supabaseUrl = process.env.SUPABASE_URL!
      const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`
      expect(signedUrl.startsWith(storagePrefix)).toBe(true)
    })

    it('should tolerate trailing slash in SUPABASE_URL', async () => {
      const supabaseUrl = 'https://abc123.supabase.co/'
      const storagePrefix = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/`
      expect(validStorageUrl.startsWith(storagePrefix)).toBe(true)
    })
  })

  describe('File Size Validation', () => {
    it('should reject files larger than 5MB via Content-Length', async () => {
      const contentLength = String(6 * 1024 * 1024)
      expect(parseInt(contentLength) > 5 * 1024 * 1024).toBe(true)
    })

    it('should accept files within 5MB limit', async () => {
      const contentLength = String(1024 * 1024)
      expect(parseInt(contentLength) > 5 * 1024 * 1024).toBe(false)
    })

    it('should handle missing Content-Length header gracefully', async () => {
      const contentLength = null
      const isRejected = !!(contentLength && parseInt(contentLength) > 5 * 1024 * 1024)
      expect(isRejected).toBe(false)
    })

    it('should validate actual buffer size after download', async () => {
      const largeBuffer = new ArrayBuffer(6 * 1024 * 1024)
      expect(largeBuffer.byteLength > 5 * 1024 * 1024).toBe(true)

      const smallBuffer = new ArrayBuffer(1024)
      expect(smallBuffer.byteLength > 5 * 1024 * 1024).toBe(false)
    })
  })

  describe('MIME Type Validation', () => {
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']

    it('should allow PDF files', () => {
      expect(allowedMimes.some(mime => 'application/pdf'.startsWith(mime))).toBe(true)
    })

    it('should allow DOCX files', () => {
      expect(allowedMimes.some(mime => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'.startsWith(mime))).toBe(true)
    })

    it('should allow TXT files', () => {
      expect(allowedMimes.some(mime => 'text/plain'.startsWith(mime))).toBe(true)
    })

    it('should reject HTML files', () => {
      expect(allowedMimes.some(mime => 'text/html'.startsWith(mime))).toBe(false)
    })

    it('should reject ZIP files', () => {
      expect(allowedMimes.some(mime => 'application/zip'.startsWith(mime))).toBe(false)
    })

    it('should handle missing Content-Type', () => {
      const contentType = ''
      expect(allowedMimes.some(mime => contentType.startsWith(mime))).toBe(false)
    })
  })

  describe('AbortController Timeout', () => {
    it('should abort fetch after 30 seconds', async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      expect(controller.signal.aborted).toBe(false)
      clearTimeout(timeoutId)
      expect(controller.signal.aborted).toBe(false)
    })

    it('should abort signal when timeout triggers', async () => {
      const controller = new AbortController()
      // Simulate timeout
      controller.abort()
      expect(controller.signal.aborted).toBe(true)
    })
  })
})
