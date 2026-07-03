import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { documentService } from '../../../src/services/documentService'

describe('documentService — PDPA Consent', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('create with consent enforcement', () => {
    it('creates non-sensitive document without consent', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'doc-1', document_type: 'handbook' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      const result = await documentService.create({ company_id: 'c1', name: 'Handbook', document_type: 'handbook' })
      expect(result.id).toBe('doc-1')
    })

    it('blocks sensitive document without consent', async () => {
      await expect(
        documentService.create({ company_id: 'c1', name: 'ID Card', document_type: 'id_card' })
      ).rejects.toThrow('PDPA consent required')
    })

    it('blocks bank_account without consent', async () => {
      await expect(
        documentService.create({ company_id: 'c1', name: 'Bank', document_type: 'bank_account' })
      ).rejects.toThrow('PDPA consent required')
    })

    it('blocks house_registration without consent', async () => {
      await expect(
        documentService.create({ company_id: 'c1', name: 'House Reg', document_type: 'house_registration' })
      ).rejects.toThrow('PDPA consent required')
    })

    it('blocks medical_certificate without consent', async () => {
      await expect(
        documentService.create({ company_id: 'c1', name: 'Medical', document_type: 'medical_certificate' })
      ).rejects.toThrow('PDPA consent required')
    })

    it('allows sensitive document with consent=true', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'doc-2', document_type: 'id_card' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      const result = await documentService.create({ company_id: 'c1', name: 'ID Card', document_type: 'id_card' }, true)
      expect(result.id).toBe('doc-2')
    })

    it('creates audit log on document creation', async () => {
      const auditInsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'doc-3' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: auditInsert }
        return {}
      })

      await documentService.create({ company_id: 'c1', name: 'Resume', document_type: 'cv' })
      expect(auditInsert).toHaveBeenCalled()
      expect(auditInsert.mock.calls[0][0].action).toBe('document.created')
      expect(auditInsert.mock.calls[0][0].company_id).toBe('c1')
    })

    it('audit log includes consent status', async () => {
      const auditInsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'documents') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'doc-4' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: auditInsert }
        return {}
      })

      await documentService.create({ company_id: 'c1', name: 'ID', document_type: 'id_card' }, true)
      const details = JSON.parse(auditInsert.mock.calls[0][0].details)
      expect(details.has_consent).toBe(true)
      expect(details.document_type).toBe('id_card')
    })

    it('throws on database error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      })

      await expect(
        documentService.create({ company_id: 'c1', name: 'X', document_type: 'cv' })
      ).rejects.toThrow('DB error')
    })
  })
})
