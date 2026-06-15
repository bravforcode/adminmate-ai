import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { signatureService } from '../../../src/services/signatureService'

const mockSignature = {
  id: 'sig-1',
  company_id: 'c1',
  document_id: 'doc-1',
  signer_name: 'John Doe',
  signer_email: 'john@test.com',
  signature_data: null,
  signed_at: null,
  ip_address: null,
  status: 'pending' as const,
  decline_reason: null,
  verification_token: 'valid-token-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

function mockChain(returns: Record<string, any>) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'single', 'eq', 'order', 'insert', 'update', 'delete']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => {
      const ret = returns[m] ?? chain
      return typeof ret === 'function' ? ret() : ret
    })
  })
  chain.update = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.select = vi.fn(() => chain)
  chain.single = vi.fn(() => chain)
  // allow override
  Object.entries(returns).forEach(([k, v]) => { chain[k] = typeof v === 'function' ? v : vi.fn(() => v) })
  return chain
}

describe('signatureService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('signDocument', () => {
    it('signs document with valid signatureId and token', async () => {
      const mockResult = { ...mockSignature, signature_data: 'data:image/sig', status: 'signed', signed_at: expect.any(String) }
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockResult, error: null }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await signatureService.signDocument('sig-1', 'data:image/sig', 'valid-token-123', '127.0.0.1')
      expect(result.status).toBe('signed')
      expect(result.signature_data).toBe('data:image/sig')
      expect(mockSupabase.from).toHaveBeenCalledWith('document_signatures')
    })

    it('throws when token does not match', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('No matching row found') }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      await expect(signatureService.signDocument('sig-1', 'data:image/sig', 'wrong-token'))
        .rejects.toThrow('No matching row found')
    })

    it('uses correct verification_token filter', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      await signatureService.signDocument('sig-1', 'data:image/sig', 'my-token')
      expect(mockChain.eq).toHaveBeenCalledWith('verification_token', 'my-token')
    })

    it('throws on database error', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      await expect(signatureService.signDocument('sig-1', 'data:image/sig', 'token'))
        .rejects.toThrow('DB error')
    })
  })

  describe('declineSignature', () => {
    it('declines signature with valid token', async () => {
      const mockResult = { ...mockSignature, status: 'declined', decline_reason: 'Not needed' }
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockResult, error: null }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await signatureService.declineSignature('sig-1', 'valid-token-123', 'Not needed')
      expect(result.status).toBe('declined')
      expect(result.decline_reason).toBe('Not needed')
    })

    it('throws when token does not match', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('No matching row found') }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      await expect(signatureService.declineSignature('sig-1', 'wrong-token', 'No reason'))
        .rejects.toThrow('No matching row found')
    })

    it('uses correct verification_token filter', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      await signatureService.declineSignature('sig-1', 'my-token')
      expect(mockChain.eq).toHaveBeenCalledWith('verification_token', 'my-token')
    })

    it('accepts decline without reason', async () => {
      const mockResult = { ...mockSignature, status: 'declined', decline_reason: null }
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockResult, error: null }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await signatureService.declineSignature('sig-1', 'valid-token-123')
      expect(result.status).toBe('declined')
      expect(result.decline_reason).toBeNull()
    })
  })

  describe('getByVerificationToken', () => {
    it('returns signature with document data for valid token', async () => {
      const mockResult = { ...mockSignature, documents: { name: 'Contract', document_type: 'pdf', company_id: 'c1' } }
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockResult, error: null }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      const result = await signatureService.getByVerificationToken('valid-token-123')
      expect(result.id).toBe('sig-1')
      expect(result.documents.name).toBe('Contract')
    })

    it('throws on missing token', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }
      mockSupabase.from.mockReturnValue(mockChain)

      await expect(signatureService.getByVerificationToken('invalid-token'))
        .rejects.toThrow('Not found')
    })
  })
})
