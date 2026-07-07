import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import {
  getLegalEntities,
  createLegalEntity,
  deleteLegalEntity,
} from '../../../src/services/legalEntityService'

describe('legalEntityService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getLegalEntities queries by company_id', async () => {
    const mockData = [{ id: '1', name: 'Test Entity', company_id: 'company-1' }]
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    })

    const result = await getLegalEntities('company-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('legal_entities')
    expect(result).toEqual(mockData)
  })

  it('createLegalEntity inserts with company_id', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new', name: 'New Entity' }, error: null }),
        }),
      }),
    })

    const result = await createLegalEntity({
      company_id: 'company-1',
      name: 'New Entity',
      country_code: 'TH',
      default_currency: 'THB',
      default_timezone: 'Asia/Bangkok',
      status: 'active',
    })
    expect(result?.name).toBe('New Entity')
  })

  it('deleteLegalEntity calls delete + eq', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const result = await deleteLegalEntity('entity-1')
    expect(result).toBe(true)
  })
})
