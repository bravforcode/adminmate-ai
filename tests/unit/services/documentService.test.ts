import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { documentService } from '../../../src/services/documentService'

describe('documentService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockDoc = { id: '1', company_id: 'c1', name: 'Resume', document_type: 'cv', status: 'active' }

  it('create: inserts doc and returns data', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockDoc, error: null }),
        }),
      }),
    })

    const result = await documentService.create({ company_id: 'c1', name: 'Resume', document_type: 'cv' })
    expect(result).toEqual(mockDoc)
    expect(mockSupabase.from).toHaveBeenCalledWith('documents')
  })

  it('create: throws on database error', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    })

    await expect(documentService.create({ company_id: 'c1', name: 'X', document_type: 'cv' })).rejects.toThrow('DB error')
  })

  it('update: filters by id and company_id', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ data: { ...mockDoc, status: 'archived' }, error: null })
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: mockUpdate }),
          }),
        }),
      }),
    })

    const result = await documentService.update('1', { status: 'archived' }, 'c1')
    expect(result.status).toBe('archived')
    expect(mockSupabase.from).toHaveBeenCalledWith('documents')
  })

  it('update: throws on database error', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }) }),
          }),
        }),
      }),
    })

    await expect(documentService.update('1', { status: 'archived' }, 'c1')).rejects.toThrow('Update failed')
  })

  it('getAll: returns documents filtered by companyId', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [mockDoc], error: null }),
          }),
        }),
      }),
    })

    const result = await documentService.getAll('c1')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].company_id).toBe('c1')
  })

  it('getByType: filters by companyId and docType', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [mockDoc], error: null }),
        }),
      }),
    })

    const result = await documentService.getByType('c1', 'cv')
    expect(result).toHaveLength(1)
  })
})
