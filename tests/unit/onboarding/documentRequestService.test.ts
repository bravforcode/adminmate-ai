import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  storage: { from: vi.fn() },
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import {
  requestDocument,
  verifyDocument,
  rejectDocument,
  validateUploadToken,
} from '../../../src/services/onboarding/documentRequestService'

describe('documentRequestService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('requestDocument', () => {
    it('creates document request with hashed token', async () => {
      const mockRequest = {
        id: 'req-1',
        company_id: 'c1',
        onboarding_instance_id: 'inst-1',
        onboarding_item_id: 'item-1',
        document_type: 'id_card',
        status: 'requested',
        secure_upload_token_hash: 'abc123',
        token_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
        }),
      })

      const updateEqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'onboarding_document_requests') {
          return { insert: insertMock }
        }
        if (table === 'onboarding_instance_items') {
          return { update: updateMock }
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      })

      const result = await requestDocument('c1', 'inst-1', 'item-1', 'id_card', 'hr-1', 'cand-1')
      expect(result.id).toBe('req-1')
      expect(result.status).toBe('requested')
    })

    it('generates unique token with expiry', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'req-2', company_id: 'c1', status: 'requested' },
            error: null,
          }),
        }),
      })

      const updateEqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'onboarding_document_requests') return { insert: insertMock }
        if (table === 'onboarding_instance_items') return { update: updateMock }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      await requestDocument('c1', 'inst-1', 'item-1', 'id_card', 'hr-1')

      // Verify insert was called with token hash and expiry
      const insertCall = insertMock.mock.calls[0][0]
      expect(insertCall.secure_upload_token_hash).toBeDefined()
      expect(insertCall.secure_upload_token_hash.length).toBe(64) // SHA-256 hex
      expect(insertCall.token_expires_at).toBeDefined()
      expect(insertCall.status).toBe('requested')
    })

    it('creates audit log on request', async () => {
      const auditInsert = vi.fn().mockResolvedValue({ error: null })

      const updateEqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'onboarding_document_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'req-3' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'onboarding_instance_items') return { update: updateMock }
        if (table === 'audit_logs') return { insert: auditInsert }
        return {}
      })

      await requestDocument('c1', 'inst-1', 'item-1', 'bank_account', 'hr-1', 'cand-1')
      expect(auditInsert).toHaveBeenCalled()
      const auditCall = auditInsert.mock.calls[0][0]
      expect(auditCall.action).toBe('document.requested')
      expect(auditCall.company_id).toBe('c1')
    })
  })

  describe('verifyDocument', () => {
    it('verifies uploaded document and updates item status', async () => {
      const mockRequest = {
        id: 'req-1',
        company_id: 'c1',
        onboarding_item_id: 'item-1',
        status: 'uploaded',
      }

      let callIdx = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callIdx++
        if (table === 'onboarding_document_requests') {
          if (callIdx === 1) {
            // First call: select to get request
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
                }),
              }),
            }
          }
          // Second call: update status to verified
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'onboarding_instance_items') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      })

      await verifyDocument('req-1', 'hr-1')
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('rejects verification of non-uploaded document', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'req-1', status: 'requested' },
              error: null,
            }),
          }),
        }),
      })

      await expect(verifyDocument('req-1', 'hr-1')).rejects.toThrow('Cannot verify')
    })

    it('throws when request not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      await expect(verifyDocument('nonexistent', 'hr-1')).rejects.toThrow('Document request not found')
    })
  })

  describe('rejectDocument', () => {
    it('rejects document with reason and updates item', async () => {
      const mockRequest = {
        id: 'req-1',
        company_id: 'c1',
        onboarding_item_id: 'item-1',
        status: 'uploaded',
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'onboarding_document_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'onboarding_instance_items') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      })

      await rejectDocument('req-1', 'hr-1', 'Document is blurry')
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('requires rejection reason with min 3 chars', async () => {
      await expect(rejectDocument('req-1', 'hr-1', '')).rejects.toThrow('Rejection reason required')
      await expect(rejectDocument('req-1', 'hr-1', 'no')).rejects.toThrow('Rejection reason required')
    })
  })
})
