import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()

const mockSupabase = vi.hoisted(() => ({
  storage: {
    from: vi.fn(() => ({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    })),
  },
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { storageService } from '../../../src/services/storageService'

function createMockFile(overrides: Partial<File> = {}): File {
  const defaults = { name: 'test.pdf', type: 'application/pdf', size: 1024 }
  return { ...defaults, ...overrides } as File
}

function createMockImage(overrides: Partial<File> = {}): File {
  const defaults = { name: 'logo.png', type: 'image/png', size: 512 * 1024 }
  return { ...defaults, ...overrides } as File
}

describe('storageService', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000'

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null, data: { path: 'some/path' } })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/file' } })
  })

  describe('uploadCV', () => {
    it('uploads a valid CV file successfully', async () => {
      const file = createMockFile()
      const result = await storageService.uploadCV(validUuid, file)

      expect(result).toHaveProperty('path')
      expect(result).toHaveProperty('url')
      expect(mockUpload).toHaveBeenCalledOnce()
      expect(mockUpload.mock.calls[0][0]).toContain(validUuid)
    })

    it('rejects invalid candidateId (non-UUID)', async () => {
      await expect(storageService.uploadCV('not-a-uuid', createMockFile()))
        .rejects.toThrow('Invalid candidateId')
    })

    it('rejects empty candidateId', async () => {
      await expect(storageService.uploadCV('', createMockFile()))
        .rejects.toThrow('Invalid candidateId')
    })

    it('rejects disallowed MIME type', async () => {
      const file = createMockFile({ type: 'text/html' })
      await expect(storageService.uploadCV(validUuid, file))
        .rejects.toThrow('File type "text/html" is not allowed')
    })

    it('rejects file exceeding MAX_FILE_SIZE', async () => {
      const file = createMockFile({ size: 11 * 1024 * 1024 })
      await expect(storageService.uploadCV(validUuid, file))
        .rejects.toThrow('exceeds limit')
    })

    it('accepts file at exactly MAX_FILE_SIZE', async () => {
      const file = createMockFile({ size: 10 * 1024 * 1024 })
      const result = await storageService.uploadCV(validUuid, file)
      expect(result).toHaveProperty('url')
    })

    it('accepts all allowed MIME types', async () => {
      const types = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ]
      for (const type of types) {
        const file = createMockFile({ type })
        const result = await storageService.uploadCV(validUuid, file)
        expect(result).toHaveProperty('url')
      }
    })

    it('sanitizes malicious file name', async () => {
      const file = createMockFile({ name: '../../../etc/passwd' })
      await storageService.uploadCV(validUuid, file)
      const uploadedPath = mockUpload.mock.calls[0][0]
      expect(uploadedPath).not.toContain('../')
    })

    it('throws supabase upload error', async () => {
      mockUpload.mockResolvedValue({ error: new Error('Storage quota exceeded'), data: null })
      await expect(storageService.uploadCV(validUuid, createMockFile()))
        .rejects.toThrow('Storage quota exceeded')
    })
  })

  describe('uploadLogo', () => {
    it('uploads a valid logo successfully', async () => {
      const file = createMockImage()
      const result = await storageService.uploadLogo(validUuid, file)
      expect(result).toHaveProperty('url')
      expect(mockUpload).toHaveBeenCalledOnce()
    })

    it('rejects invalid companyId', async () => {
      await expect(storageService.uploadLogo('bad-id', createMockImage()))
        .rejects.toThrow('Invalid companyId')
    })

    it('rejects non-image MIME type', async () => {
      const file = createMockImage({ type: 'application/pdf' })
      await expect(storageService.uploadLogo(validUuid, file))
        .rejects.toThrow('File type "application/pdf" is not allowed')
    })

    it('rejects file exceeding MAX_IMAGE_SIZE', async () => {
      const file = createMockImage({ size: 3 * 1024 * 1024 })
      await expect(storageService.uploadLogo(validUuid, file))
        .rejects.toThrow('exceeds limit')
    })

    it('accepts file at exactly MAX_IMAGE_SIZE', async () => {
      const file = createMockImage({ size: 2 * 1024 * 1024 })
      const result = await storageService.uploadLogo(validUuid, file)
      expect(result).toHaveProperty('url')
    })
  })

  describe('uploadAvatar', () => {
    it('uploads a valid avatar successfully', async () => {
      const file = createMockImage()
      const result = await storageService.uploadAvatar(validUuid, file)
      expect(result).toHaveProperty('url')
      expect(mockUpload).toHaveBeenCalledOnce()
    })

    it('rejects invalid userId', async () => {
      await expect(storageService.uploadAvatar('bad-id', createMockImage()))
        .rejects.toThrow('Invalid userId')
    })

    it('rejects non-image MIME type', async () => {
      const file = createMockImage({ type: 'text/plain' })
      await expect(storageService.uploadAvatar(validUuid, file))
        .rejects.toThrow('File type "text/plain" is not allowed')
    })

    it('rejects file exceeding MAX_IMAGE_SIZE', async () => {
      const file = createMockImage({ size: 5 * 1024 * 1024 })
      await expect(storageService.uploadAvatar(validUuid, file))
        .rejects.toThrow('exceeds limit')
    })

    it('does NOT pass upsert option', async () => {
      await storageService.uploadAvatar(validUuid, createMockImage())
      const uploadOptions = mockUpload.mock.calls[0][2]
      expect(uploadOptions).toBeUndefined()
    })
  })
})
