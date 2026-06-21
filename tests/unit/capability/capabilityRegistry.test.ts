import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import {
  getCapabilities,
  getCapability,
  updateCapabilityStatus,
  getCapabilityMatrix,
} from '../../../src/services/capability/capabilityRegistryService'

const mockCapabilities = [
  {
    id: '1',
    feature_key: 'jobs',
    module_name: 'Recruitment',
    capability_status: 'complete',
    owner: null,
    dependencies: ['companies'],
    permission_set: ['recruiter', 'admin', 'hr_manager'],
    plan_entitlement: 'free',
    country_availability: 'ALL',
    provider_requirement: null,
    support_tier: 'basic',
    known_limitations: null,
    evidence_links: [],
    last_reviewed_at: null,
    is_user_visible: true,
    created_at: '2024-06-20T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
  {
    id: '2',
    feature_key: 'payroll_runs',
    module_name: 'Payroll',
    capability_status: 'partial',
    owner: null,
    dependencies: ['employee_directory'],
    permission_set: ['payroll_admin', 'admin'],
    plan_entitlement: 'enterprise',
    country_availability: 'TH',
    provider_requirement: null,
    support_tier: 'premium',
    known_limitations: 'Schema + service only; no dedicated page',
    evidence_links: [],
    last_reviewed_at: null,
    is_user_visible: false,
    created_at: '2024-06-20T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
  {
    id: '3',
    feature_key: 'onboarding',
    module_name: 'Onboarding',
    capability_status: 'complete',
    owner: null,
    dependencies: ['candidates'],
    permission_set: ['hr_manager', 'admin'],
    plan_entitlement: 'free',
    country_availability: 'ALL',
    provider_requirement: null,
    support_tier: 'basic',
    known_limitations: null,
    evidence_links: [],
    last_reviewed_at: null,
    is_user_visible: true,
    created_at: '2024-06-20T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
]

function mockSelectChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function mockSelectSingle(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function mockUpdateChain(result: { error: unknown }) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('capabilityRegistryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCapabilities', () => {
    it('returns all capabilities', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: mockCapabilities, error: null }))

      const result = await getCapabilities()
      expect(result).toHaveLength(3)
      expect(result[0].feature_key).toBe('jobs')
    })

    it('returns empty array on error', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: null, error: { message: 'fail' } }))

      const result = await getCapabilities()
      expect(result).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: null, error: null }))

      const result = await getCapabilities()
      expect(result).toEqual([])
    })

    it('calls from with correct table', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: [], error: null }))

      await getCapabilities()
      expect(mockSupabase.from).toHaveBeenCalledWith('feature_capabilities')
    })
  })

  describe('getCapability', () => {
    it('returns a single capability by feature_key', async () => {
      mockSupabase.from.mockReturnValue(mockSelectSingle({ data: mockCapabilities[0], error: null }))

      const result = await getCapability('jobs')
      expect(result).not.toBeNull()
      expect(result!.feature_key).toBe('jobs')
    })

    it('returns null on error', async () => {
      mockSupabase.from.mockReturnValue(mockSelectSingle({ data: null, error: { message: 'not found' } }))

      const result = await getCapability('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('updateCapabilityStatus', () => {
    it('updates status successfully', async () => {
      mockSupabase.from.mockReturnValue(mockUpdateChain({ error: null }))

      const result = await updateCapabilityStatus('jobs', 'complete')
      expect(result).toBe(true)
    })

    it('returns false on error', async () => {
      mockSupabase.from.mockReturnValue(mockUpdateChain({ error: { message: 'update failed' } }))

      const result = await updateCapabilityStatus('jobs', 'complete')
      expect(result).toBe(false)
    })
  })

  describe('getCapabilityMatrix', () => {
    it('computes correct totals', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: mockCapabilities, error: null }))

      const matrix = await getCapabilityMatrix()
      expect(matrix.total).toBe(3)
    })

    it('groups by status', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: mockCapabilities, error: null }))

      const matrix = await getCapabilityMatrix()
      expect(matrix.byStatus['complete']).toBe(2)
      expect(matrix.byStatus['partial']).toBe(1)
    })

    it('groups by module', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: mockCapabilities, error: null }))

      const matrix = await getCapabilityMatrix()
      expect(matrix.byModule['Recruitment']).toHaveLength(1)
      expect(matrix.byModule['Payroll']).toHaveLength(1)
      expect(matrix.byModule['Onboarding']).toHaveLength(1)
    })

    it('groups by plan', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: mockCapabilities, error: null }))

      const matrix = await getCapabilityMatrix()
      expect(matrix.byPlan['free']).toHaveLength(2)
      expect(matrix.byPlan['enterprise']).toHaveLength(1)
    })

    it('separates visible and hidden', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: mockCapabilities, error: null }))

      const matrix = await getCapabilityMatrix()
      expect(matrix.visible).toHaveLength(2)
      expect(matrix.hidden).toHaveLength(1)
      expect(matrix.hidden[0].feature_key).toBe('payroll_runs')
    })

    it('returns empty matrix when no capabilities', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: [], error: null }))

      const matrix = await getCapabilityMatrix()
      expect(matrix.total).toBe(0)
      expect(matrix.visible).toHaveLength(0)
      expect(matrix.hidden).toHaveLength(0)
    })

    it('handles empty status/module/plan groups', async () => {
      mockSupabase.from.mockReturnValue(mockSelectChain({ data: [], error: null }))

      const matrix = await getCapabilityMatrix()
      expect(Object.keys(matrix.byStatus)).toHaveLength(0)
      expect(Object.keys(matrix.byModule)).toHaveLength(0)
      expect(Object.keys(matrix.byPlan)).toHaveLength(0)
    })
  })
})
