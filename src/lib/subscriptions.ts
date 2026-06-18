/* ============================================================
   AdminMate AI — Subscription Types & Helpers
   ============================================================ */

export type SubscriptionTier = 'free' | 'growth' | 'pro'
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export interface SubscriptionInfo {
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  trialEnd?: string
}

export interface PlanLimits {
  hrUsers: number
  employees: number
  jobs: number
  candidates: number
  aiMessagesPerMonth: number
  documentSigning: boolean
  pdpaTools: boolean
  auditLogDays: number
  bulkImport: boolean
  customReports: boolean
  prioritySupport: boolean
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: {
    hrUsers: 1,
    employees: 50,
    jobs: 1,
    candidates: 5,
    aiMessagesPerMonth: 10,
    documentSigning: false,
    pdpaTools: false,
    auditLogDays: 0,
    bulkImport: false,
    customReports: false,
    prioritySupport: false,
  },
  growth: {
    hrUsers: 5,
    employees: 500,
    jobs: 10,
    candidates: 100,
    aiMessagesPerMonth: 100,
    documentSigning: true,
    pdpaTools: true,
    auditLogDays: 90,
    bulkImport: false,
    customReports: false,
    prioritySupport: false,
  },
  pro: {
    hrUsers: 20,
    employees: 5000,
    jobs: Infinity,
    candidates: 1000,
    aiMessagesPerMonth: Infinity,
    documentSigning: true,
    pdpaTools: true,
    auditLogDays: 365,
    bulkImport: true,
    customReports: true,
    prioritySupport: true,
  },
}

export const PLAN_PRICES = {
  growth: { monthly: 2900, annual: 29000 },
  pro: { monthly: 7900, annual: 79000 },
} as const

export const PLAN_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  growth: 'Growth',
  pro: 'Pro',
}

/**
 * Check if a feature is available for the given tier.
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof PlanLimits): boolean {
  const limits = PLAN_LIMITS[tier]
  const value = limits[feature]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  return false
}

/**
 * Check if usage is within limits for the given tier.
 * Returns { allowed, remaining, limit }.
 */
export function checkLimit(
  tier: SubscriptionTier,
  feature: keyof PlanLimits,
  currentUsage: number
): { allowed: boolean; remaining: number; limit: number } {
  const limits = PLAN_LIMITS[tier]
  const limit = limits[feature]
  if (typeof limit !== 'number') return { allowed: true, remaining: Infinity, limit: Infinity }
  if (limit === Infinity) return { allowed: true, remaining: Infinity, limit: Infinity }
  const remaining = Math.max(0, limit - currentUsage)
  return { allowed: currentUsage < limit, remaining, limit }
}

/**
 * Get upgrade prompt message for a given tier.
 */
export function getUpgradeMessage(tier: SubscriptionTier): string | null {
  if (tier === 'pro') return null
  if (tier === 'free') return 'Upgrade to Growth to unlock more features'
  return 'Upgrade to Pro for unlimited access'
}

/**
 * Format price in THB.
 */
export function formatPrice(amount: number): string {
  return `฿${amount.toLocaleString()}`
}
