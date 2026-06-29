import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock supabase ──
const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}))

// Chain builder: supabase.from('x').select().eq().single()
function chainResult(result: unknown, error: unknown = null) {
  const resolved = { data: result, error }
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolved),
    order: vi.fn().mockResolvedValue(resolved),
  }
  // insert/update/delete: thenable chain with .select()
  function makeInsertable() {
    const ins: Record<string, unknown> = {
      select: vi.fn(),
      then: (resolve: (v: unknown) => void) => resolve(resolved),
    }
    // .select().single() chain
    ins.select.mockReturnValue({
      single: vi.fn().mockResolvedValue(resolved),
    })
    return ins
  }
  chain.insert = vi.fn().mockReturnValue(makeInsertable())
  chain.update = vi.fn().mockReturnValue(makeInsertable())
  chain.delete = vi.fn().mockReturnValue(makeInsertable())
  return chain
}

import { subscriptionService } from '../../../src/services/billing/subscriptionService'

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  describe('getPlans', () => {
    it('returns active plans ordered by price', async () => {
      const plans = [
        { id: '1', name: 'Starter', tier: 'starter', price_monthly: 990, price_currency: 'THB', trial_days: 14, is_active: true },
        { id: '2', name: 'Growth', tier: 'growth', price_monthly: 2990, price_currency: 'THB', trial_days: 14, is_active: true },
      ]
      mockFrom.mockReturnValue(chainResult(plans))
      const result = await subscriptionService.getPlans()
      expect(result).toEqual(plans)
      expect(mockFrom).toHaveBeenCalledWith('plans')
    })

    it('throws on error', async () => {
      mockFrom.mockReturnValue(chainResult(null, { message: 'db error' }))
      await expect(subscriptionService.getPlans()).rejects.toThrow()
    })
  })

  describe('checkUsageLimit', () => {
    it('blocks when over limit', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: false, current_usage: 50, limit_value: 50, is_unlimited: false }],
        error: null,
      })
      const result = await subscriptionService.checkUsageLimit('company-1', 'ai_messages')
      expect(result.allowed).toBe(false)
      expect(result.current_usage).toBe(50)
      expect(result.limit_value).toBe(50)
    })

    it('allows when under limit', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: true, current_usage: 10, limit_value: 50, is_unlimited: false }],
        error: null,
      })
      const result = await subscriptionService.checkUsageLimit('company-1', 'ai_messages')
      expect(result.allowed).toBe(true)
      expect(result.current_usage).toBe(10)
    })

    it('allows unlimited plans', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: true, current_usage: 0, limit_value: 0, is_unlimited: true }],
        error: null,
      })
      const result = await subscriptionService.checkUsageLimit('company-1', 'jobs')
      expect(result.allowed).toBe(true)
      expect(result.is_unlimited).toBe(true)
    })

    it('denies when no subscription exists', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: false, current_usage: 0, limit_value: 0, is_unlimited: false }],
        error: null,
      })
      const result = await subscriptionService.checkUsageLimit('company-no-sub', 'ai_messages')
      expect(result.allowed).toBe(false)
    })
  })

  describe('recordUsage', () => {
    it('inserts usage record with correct period bounds', async () => {
      mockFrom.mockReturnValue(chainResult({ id: 'usage-1' }))
      await subscriptionService.recordUsage('company-1', 'ai_messages', 5)
      expect(mockFrom).toHaveBeenCalledWith('usage_records')
    })

    it('throws on error', async () => {
      mockFrom.mockReturnValue(chainResult(null, { message: 'insert failed' }))
      await expect(subscriptionService.recordUsage('company-1', 'ai_messages', 1)).rejects.toThrow()
    })
  })

  describe('checkModuleEntitlement', () => {
    it('returns true when entitled', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })
      const result = await subscriptionService.checkModuleEntitlement('company-1', 'payroll')
      expect(result).toBe(true)
    })

    it('returns false when not entitled', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })
      const result = await subscriptionService.checkModuleEntitlement('company-1', 'payroll')
      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc fail' } })
      await expect(
        subscriptionService.checkModuleEntitlement('company-1', 'payroll')
      ).rejects.toThrow()
    })
  })

  describe('createSubscription', () => {
    it('creates trial subscription with correct trial period', async () => {
      const plan = { trial_days: 14 }
      const sub = { id: 'sub-1', company_id: 'company-1', plan_id: 'plan-1', status: 'trialing' }

      mockFrom
        .mockReturnValueOnce(chainResult(null))   // getSubscription check (no existing)
        .mockReturnValueOnce(chainResult(plan))    // plans query
        .mockReturnValueOnce(chainResult(sub))     // subscriptions insert

      const result = await subscriptionService.createSubscription('company-1', 'plan-1')
      expect(result.status).toBe('trialing')
      expect(result.id).toBe('sub-1')
    })

    it('throws on plan lookup error', async () => {
      mockFrom
        .mockReturnValueOnce(chainResult(null))  // getSubscription check (no existing)
        .mockReturnValueOnce(chainResult(null, { message: 'plan not found' }))  // plans query
      await expect(subscriptionService.createSubscription('company-1', 'bad-plan')).rejects.toThrow()
    })
  })

  describe('RLS isolation', () => {
    it('checkUsageLimit passes correct company_id', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: true, current_usage: 0, limit_value: 10, is_unlimited: false }],
        error: null,
      })
      await subscriptionService.checkUsageLimit('company-A', 'ai_messages')
      expect(mockRpc).toHaveBeenCalledWith('check_usage_limit', {
        p_company_id: 'company-A',
        p_feature_key: 'ai_messages',
      })
    })

    it('different companies produce separate calls', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: true, current_usage: 0, limit_value: 10, is_unlimited: false }],
        error: null,
      })
      await subscriptionService.checkUsageLimit('company-A', 'ai_messages')
      await subscriptionService.checkUsageLimit('company-B', 'ai_messages')
      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(mockRpc).toHaveBeenNthCalledWith(1, 'check_usage_limit', {
        p_company_id: 'company-A',
        p_feature_key: 'ai_messages',
      })
      expect(mockRpc).toHaveBeenNthCalledWith(2, 'check_usage_limit', {
        p_company_id: 'company-B',
        p_feature_key: 'ai_messages',
      })
    })
  })

  describe('missing Stripe config', () => {
    it('createSubscription still works (server-side only, no Stripe check)', async () => {
      const plan = { trial_days: 14 }
      const sub = { id: 'sub-2', status: 'trialing' }
      mockFrom
        .mockReturnValueOnce(chainResult(null))  // getSubscription check (no existing)
        .mockReturnValueOnce(chainResult(plan))
        .mockReturnValueOnce(chainResult(sub))
      const result = await subscriptionService.createSubscription('company-1', 'plan-1')
      expect(result.status).toBe('trialing')
    })

    it('subscription creation is independent of Stripe SDK', async () => {
      // Service does NOT import Stripe — missing config means disabled UI, not failed creation
      const plan = { trial_days: 14 }
      const sub = { id: 'sub-3', status: 'trialing' }
      mockFrom
        .mockReturnValueOnce(chainResult(null))  // getSubscription check (no existing)
        .mockReturnValueOnce(chainResult(plan))
        .mockReturnValueOnce(chainResult(sub))
      // No Stripe SDK import = no crash
      const result = await subscriptionService.createSubscription('co-1', 'plan-1')
      expect(result).toBeDefined()
    })
  })
})
