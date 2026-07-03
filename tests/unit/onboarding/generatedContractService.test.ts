import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import {
  generateContractFromTemplate,
  approveGeneratedContract,
  rejectGeneratedContract,
} from '../../../src/services/onboarding/generatedContractService'

describe('generatedContractService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockTemplate = {
    id: 'tpl-1',
    company_id: 'c1',
    body_template: 'Contract for {{employee_name}} at {{company_name}}',
    variables_schema: [
      { name: 'employee_name', type: 'text', required: true, label: 'Name' },
      { name: 'company_name', type: 'text', required: true, label: 'Company' },
    ],
    language_code: 'en',
  }

  const mockContract = {
    id: 'gc-1',
    company_id: 'c1',
    contract_template_id: 'tpl-1',
    status: 'pending_review',
    rendered_body: 'Contract for John at ACME',
    variables_snapshot: { employee_name: 'John', company_name: 'ACME' },
    ai_generated: false,
    created_at: '2024-01-01T00:00:00Z',
  }

  describe('generateContractFromTemplate', () => {
    it('generates contract when all required variables provided', async () => {
      let callIdx = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callIdx++
        if (table === 'contract_templates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'generated_contracts') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockContract, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      })

      const result = await generateContractFromTemplate(
        'c1', 'tpl-1',
        { employee_name: 'John', company_name: 'ACME' },
        'hr-1'
      )
      expect(result.contract).toBeDefined()
      expect(result.contract!.status).toBe('pending_review')
    })

    it('returns missing variables when required fields not provided', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
            }),
          }),
        }),
      })

      const result = await generateContractFromTemplate(
        'c1', 'tpl-1',
        { employee_name: 'John' },
        'hr-1'
      )
      expect(result.missing).toContain('company_name')
      expect(result.contract).toBeUndefined()
    })

    it('returns error when template not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
            }),
          }),
        }),
      })

      const result = await generateContractFromTemplate('c1', 'bad-tpl', {}, 'hr-1')
      expect(result.error).toBe('Template not found')
    })

    it('creates audit log on generation', async () => {
      const auditInsert = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'contract_templates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'generated_contracts') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockContract, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: auditInsert }
        return {}
      })

      await generateContractFromTemplate(
        'c1', 'tpl-1',
        { employee_name: 'John', company_name: 'ACME' },
        'hr-1'
      )
      expect(auditInsert).toHaveBeenCalled()
      expect(auditInsert.mock.calls[0][0].action).toBe('contract.generated')
    })

    it('links contract to onboarding instance when provided', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'contract_templates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'generated_contracts') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockContract, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      const result = await generateContractFromTemplate(
        'c1', 'tpl-1',
        { employee_name: 'John', company_name: 'ACME' },
        'hr-1',
        { onboardingInstanceId: 'inst-1', candidateId: 'cand-1' }
      )
      expect(result.contract).toBeDefined()
    })
  })

  describe('approveGeneratedContract', () => {
    it('approves contract from pending_review status', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'generated_contracts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { ...mockContract, status: 'pending_review' }, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      await approveGeneratedContract('gc-1', 'reviewer-1', 'Looks good')
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('rejects approval from non-pending_review status', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { ...mockContract, status: 'draft' }, error: null }),
          }),
        }),
      })

      await expect(approveGeneratedContract('gc-1', 'reviewer-1')).rejects.toThrow('Cannot approve')
    })

    it('throws when contract not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      await expect(approveGeneratedContract('nonexistent', 'reviewer-1')).rejects.toThrow('Contract not found')
    })
  })

  describe('rejectGeneratedContract', () => {
    it('rejects contract with reason', async () => {
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
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) }
        return {}
      })

      await rejectGeneratedContract('gc-1', 'reviewer-1', 'Missing salary clause')
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('requires rejection reason min 3 chars', async () => {
      await expect(rejectGeneratedContract('gc-1', 'reviewer-1', '')).rejects.toThrow('Rejection reason required')
      await expect(rejectGeneratedContract('gc-1', 'reviewer-1', 'no')).rejects.toThrow('Rejection reason required')
    })
  })
})
