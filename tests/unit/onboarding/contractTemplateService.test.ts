import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import {
  getContractTemplates,
  getActiveContractTemplates,
  createContractTemplate,
  updateContractTemplate,
  renderContractTemplate,
} from '../../../src/services/onboarding/contractTemplateService'

describe('contractTemplateService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockTemplate = {
    id: 'tpl-1',
    company_id: 'c1',
    country_code: 'TH',
    employee_type: 'full_time',
    template_key: 'employment_th',
    name: 'Thai Employment Contract',
    language_code: 'th',
    body_template: 'Contract between {{company_name}} and {{employee_name}}',
    variables_schema: [
      { name: 'company_name', type: 'text', required: true, label: 'Company Name' },
      { name: 'employee_name', type: 'text', required: true, label: 'Employee Name' },
    ],
    version_number: 1,
    is_active: true,
    requires_legal_review: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  describe('getContractTemplates', () => {
    it('returns all templates for company', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [mockTemplate], error: null }),
          }),
        }),
      })

      const result = await getContractTemplates('c1')
      expect(result).toHaveLength(1)
      expect(result[0].company_id).toBe('c1')
      expect(mockSupabase.from).toHaveBeenCalledWith('contract_templates')
    })

    it('returns empty array when no templates', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      const result = await getContractTemplates('c1')
      expect(result).toEqual([])
    })

    it('throws on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      })

      await expect(getContractTemplates('c1')).rejects.toThrow('DB error')
    })
  })

  describe('getActiveContractTemplates', () => {
    it('filters by is_active=true', async () => {
      const eqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [mockTemplate], error: null }),
      })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: eqMock,
          }),
        }),
      })

      const result = await getActiveContractTemplates('c1')
      expect(result).toHaveLength(1)
    })
  })

  describe('createContractTemplate', () => {
    it('creates template and returns data', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
          }),
        }),
      })

      const result = await createContractTemplate({
        company_id: 'c1',
        country_code: 'TH',
        employee_type: 'full_time',
        template_key: 'employment_th',
        name: 'Thai Employment Contract',
        language_code: 'th',
        body_template: 'Contract body',
        variables_schema: [],
        version_number: 1,
        is_active: true,
        requires_legal_review: true,
      })
      expect(result.id).toBe('tpl-1')
      expect(mockSupabase.from).toHaveBeenCalledWith('contract_templates')
    })

    it('throws on insert error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Duplicate key') }),
          }),
        }),
      })

      await expect(createContractTemplate({
        company_id: 'c1',
        country_code: 'TH',
        employee_type: 'full_time',
        template_key: 'dup',
        name: 'Dup',
        language_code: 'en',
        body_template: 'x',
        variables_schema: [],
        version_number: 1,
        is_active: true,
        requires_legal_review: false,
      })).rejects.toThrow('Duplicate key')
    })
  })

  describe('updateContractTemplate', () => {
    it('updates template with updated_at timestamp', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { ...mockTemplate, name: 'Updated' }, error: null }),
            }),
          }),
        }),
      })

      const result = await updateContractTemplate('tpl-1', { name: 'Updated' })
      expect(result.name).toBe('Updated')
    })
  })

  describe('renderContractTemplate', () => {
    const schema = [
      { name: 'company_name', required: true },
      { name: 'employee_name', required: true },
      { name: 'optional_field', required: false },
    ]

    it('renders all variables correctly', () => {
      const result = renderContractTemplate(
        'Between {{company_name}} and {{employee_name}}',
        { company_name: 'ACME', employee_name: 'John' },
        schema
      )
      expect(result.rendered).toBe('Between ACME and John')
      expect(result.missing).toEqual([])
    })

    it('reports missing required variables', () => {
      const result = renderContractTemplate(
        'Between {{company_name}} and {{employee_name}}',
        { company_name: 'ACME' },
        schema
      )
      expect(result.missing).toContain('employee_name')
      expect(result.missing).not.toContain('company_name')
    })

    it('does not report missing optional variables', () => {
      const result = renderContractTemplate(
        '{{company_name}} {{optional_field}}',
        { company_name: 'ACME', employee_name: 'John' },
        schema
      )
      expect(result.missing).toEqual([])
    })

    it('replaces missing optional with placeholder', () => {
      const result = renderContractTemplate(
        'Field: {{optional_field}}',
        { company_name: 'ACME', employee_name: 'John' },
        schema
      )
      expect(result.rendered).toContain('[optional_field]')
    })

    it('handles empty variables object', () => {
      const result = renderContractTemplate(
        '{{company_name}}',
        {},
        [{ name: 'company_name', required: true }]
      )
      expect(result.missing).toContain('company_name')
      expect(result.rendered).toContain('[company_name]')
    })

    it('handles template with no variables', () => {
      const result = renderContractTemplate(
        'Static contract text',
        {},
        []
      )
      expect(result.rendered).toBe('Static contract text')
      expect(result.missing).toEqual([])
    })
  })
})
