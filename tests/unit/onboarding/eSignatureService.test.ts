import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import {
  createESignatureRequest,
  markManualSigned,
  getESignatureRequests,
} from '../../../src/services/onboarding/eSignatureService'

describe('eSignatureService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockContract = {
    id: 'gc-1',
    company_id: 'c1',
    status: 'approved',
  }

  const mockESignRequest = {
    id: 'esr-1',
    company_id: 'c1',
    generated_contract_id: 'gc-1',
    provider: 'manual',
    status: 'manually_uploaded',
    signer_email: 'john@test.com',
    signer_name: 'John',
    signed_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
  }

  describe('createESignatureRequest', () => {
    it('creates request for approved contract', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'generated_contracts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockContract, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'esignature_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockESignRequest, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      const result = await createESignatureRequest('c1', 'gc-1', 'manual', 'John', 'john@test.com', 'hr-1')
      expect(result.id).toBe('esr-1')
    })

    it('rejects request for non-approved contract', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { ...mockContract, status: 'draft' }, error: null }),
          }),
        }),
      })

      await expect(
        createESignatureRequest('c1', 'gc-1', 'manual', 'John', 'john@test.com', 'hr-1')
      ).rejects.toThrow('Cannot send for signature')
    })

    it('throws when contract not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      await expect(
        createESignatureRequest('c1', 'bad-id', 'manual', 'John', 'john@test.com', 'hr-1')
      ).rejects.toThrow('Contract not found')
    })

    it('sets status to not_configured for unconfigured external provider', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'generated_contracts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockContract, error: null }),
              }),
            }),
          }
        }
        if (table === 'esignature_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...mockESignRequest, provider: 'docusign', status: 'not_configured' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      const result = await createESignatureRequest('c1', 'gc-1', 'docusign', 'John', 'john@test.com', 'hr-1')
      expect(result.status).toBe('not_configured')
    })

    it('creates audit log on request', async () => {
      const auditInsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'generated_contracts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockContract, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'esignature_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockESignRequest, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: auditInsert }
        return {}
      })

      await createESignatureRequest('c1', 'gc-1', 'manual', 'John', 'john@test.com', 'hr-1')
      expect(auditInsert).toHaveBeenCalled()
      expect(auditInsert.mock.calls[0][0].action).toBe('esignature.requested')
    })
  })

  describe('markManualSigned', () => {
    it('creates manual signature and marks contract as signed', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'esignature_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockESignRequest, error: null }),
              }),
            }),
          }
        }
        if (table === 'generated_contracts') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      await markManualSigned('gc-1', 'c1', 'hr-1')
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('creates audit log for manual signing', async () => {
      const auditInsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'esignature_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockESignRequest, error: null }),
              }),
            }),
          }
        }
        if (table === 'generated_contracts') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }
        }
        if (table === 'audit_logs') return { insert: auditInsert }
        return {}
      })

      await markManualSigned('gc-1', 'c1', 'hr-1')
      expect(auditInsert.mock.calls[0][0].action).toBe('esignature.manual_signed')
    })
  })

  describe('getESignatureRequests', () => {
    it('returns requests for company', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [mockESignRequest], error: null }),
          }),
        }),
      })

      const result = await getESignatureRequests('c1')
      expect(result).toHaveLength(1)
      expect(result[0].company_id).toBe('c1')
    })

    it('filters by contractId when provided', async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: [mockESignRequest], error: null })
      const orderMock = vi.fn().mockReturnValue({ eq: eqMock })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: orderMock,
          }),
        }),
      })

      const result = await getESignatureRequests('c1', 'gc-1')
      expect(result).toHaveLength(1)
    })
  })
})
