import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase chainable query builder — Supabase always resolves {data, error}, never rejects
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'range']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: Function, _reject?: Function) => {
    return resolve({ data: result, error })
  }
  return chain
}

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('../permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import { subscriptionService } from './subscriptionService'

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPlans', () => {
    it('should return active plans', async () => {
      const plans = [{ id: 'p1', name: 'Free', price_monthly: 0, is_active: true }]
      mockFrom.mockReturnValue(createChain(plans))

      const result = await subscriptionService.getPlans()
      expect(mockFrom).toHaveBeenCalledWith('plans')
      expect(result).toEqual(plans)
    })

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))
      await expect(subscriptionService.getPlans()).rejects.toThrow('DB error')
    })
  })

  describe('getPlanFeatures', () => {
    it('should return features for plan', async () => {
      const features = [{ id: 'f1', plan_id: 'p1', feature_key: 'hr_users', limit_value: 5 }]
      mockFrom.mockReturnValue(createChain(features))

      const result = await subscriptionService.getPlanFeatures('p1')
      expect(result).toEqual(features)
    })
  })

  describe('getSubscription', () => {
    it('should return subscription', async () => {
      const sub = { id: 's1', company_id: 'c1', status: 'active' }
      mockFrom.mockReturnValue(createChain(sub))

      const result = await subscriptionService.getSubscription('c1')
      expect(result).toEqual(sub)
    })

    it('should return null if not found', async () => {
      mockFrom.mockReturnValue(createChain(null, { code: 'PGRST116' }))

      const result = await subscriptionService.getSubscription('c1')
      expect(result).toBeNull()
    })
  })

  describe('createSubscription', () => {
    it('should create subscription with trial', async () => {
      // No existing subscription
      mockFrom
        .mockReturnValueOnce(createChain(null, { code: 'PGRST116' }))
        .mockReturnValueOnce(createChain({ trial_days: 14 }))
        .mockReturnValueOnce(createChain({ id: 's1', status: 'trialing' }))

      const result = await subscriptionService.createSubscription('c1', 'p1')
      expect(result.status).toBe('trialing')
    })

    it('should throw if active subscription exists', async () => {
      mockFrom.mockReturnValue(createChain({ id: 's1', status: 'active' }))

      await expect(subscriptionService.createSubscription('c1', 'p1')).rejects.toThrow('Active subscription already exists')
    })
  })

  describe('checkUsageLimit', () => {
    it('should check usage via RPC', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: true, current_usage: 5, limit_value: 100, is_unlimited: false }],
        error: null,
      })

      const result = await subscriptionService.checkUsageLimit('c1', 'employees')
      expect(result.allowed).toBe(true)
      expect(result.current_usage).toBe(5)
    })

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC failed') })
      await expect(subscriptionService.checkUsageLimit('c1', 'employees')).rejects.toThrow()
    })
  })

  describe('recordUsage', () => {
    it('should insert usage record', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await subscriptionService.recordUsage('c1', 'ai_messages', 10)
      expect(mockFrom).toHaveBeenCalledWith('usage_records')
    })
  })

  describe('checkModuleEntitlement', () => {
    it('should check module entitlement via RPC', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      const result = await subscriptionService.checkModuleEntitlement('c1', 'payroll')
      expect(result).toBe(true)
    })

    it('should return false if not entitled', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      const result = await subscriptionService.checkModuleEntitlement('c1', 'advanced_reports')
      expect(result).toBe(false)
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      const existing = { id: 's1', status: 'active', company_id: 'c1' }
      const canceled = { id: 's1', status: 'canceled' }

      mockFrom
        .mockReturnValueOnce(createChain(existing))
        .mockReturnValueOnce(createChain(canceled))

      const result = await subscriptionService.cancelSubscription('c1')
      expect(result.status).toBe('canceled')
    })

    it('should throw if no subscription', async () => {
      mockFrom.mockReturnValue(createChain(null, { code: 'PGRST116' }))
      await expect(subscriptionService.cancelSubscription('c1')).rejects.toThrow('No active subscription found')
    })

    it('should throw if already canceled', async () => {
      mockFrom.mockReturnValue(createChain({ id: 's1', status: 'canceled' }))
      await expect(subscriptionService.cancelSubscription('c1')).rejects.toThrow('already canceled')
    })
  })

  describe('getPaymentHistory', () => {
    it('should return payment records', async () => {
      const payments = [{ id: 'p1', amount: 2900, status: 'succeeded' }]
      mockFrom.mockReturnValue(createChain(payments))

      const result = await subscriptionService.getPaymentHistory('c1')
      expect(result).toEqual(payments)
    })
  })

  describe('updateSubscriptionPlan', () => {
    it('should update plan', async () => {
      const existing = { id: 's1', status: 'active' }
      const updated = { id: 's1', plan_id: 'p2' }

      mockFrom
        .mockReturnValueOnce(createChain(existing))
        .mockReturnValueOnce(createChain(updated))

      const result = await subscriptionService.updateSubscriptionPlan('c1', 'p2')
      expect(result.plan_id).toBe('p2')
    })

    it('should throw if subscription not active', async () => {
      mockFrom.mockReturnValue(createChain({ id: 's1', status: 'canceled' }))
      await expect(subscriptionService.updateSubscriptionPlan('c1', 'p2')).rejects.toThrow('Can only update active or trialing')
    })
  })
})
