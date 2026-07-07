import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { getDepartments, getTeams, getReportingLines } from '../../../src/services/orgStructureService'

function mockQuery(data: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  }
}

describe('orgStructureService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getDepartments queries by company_id', async () => {
    mockSupabase.from.mockReturnValue(mockQuery([{ id: '1', name: 'Engineering' }]))
    const result = await getDepartments('company-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('departments')
    expect(result).toEqual([{ id: '1', name: 'Engineering' }])
  })

  it('getTeams queries by company_id', async () => {
    mockSupabase.from.mockReturnValue(mockQuery([{ id: '1', name: 'Frontend' }]))
    const result = await getTeams('company-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('teams')
    expect(result).toEqual([{ id: '1', name: 'Frontend' }])
  })

  it('getReportingLines queries by company_id', async () => {
    // getReportingLines has no .order() — chain ends at .eq()
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ id: '1', employee_user_id: 'u1' }], error: null }),
      }),
    })
    const result = await getReportingLines('company-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('reporting_lines')
    expect(result).toEqual([{ id: '1', employee_user_id: 'u1' }])
  })
})

describe('locationService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getLocations queries by company_id', async () => {
    mockSupabase.from.mockReturnValue(mockQuery([{ id: '1', name: 'Bangkok HQ' }]))
    const { getLocations } = await import('../../../src/services/locationService')
    const result = await getLocations('company-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('locations')
    expect(result).toEqual([{ id: '1', name: 'Bangkok HQ' }])
  })
})

describe('costCenterService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getCostCenters queries by company_id', async () => {
    mockSupabase.from.mockReturnValue(mockQuery([{ id: '1', name: 'CC-001' }]))
    const { getCostCenters } = await import('../../../src/services/costCenterService')
    const result = await getCostCenters('company-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('cost_centers')
    expect(result).toEqual([{ id: '1', name: 'CC-001' }])
  })
})
