import { supabase } from '../../lib/supabase'

export interface Plan {
  id: string
  name: string
  tier: string
  price_monthly: number
  price_currency: string
  trial_days: number
  is_active: boolean
}

export interface PlanFeature {
  id: string
  plan_id: string
  feature_key: string
  limit_value: number
  is_unlimited: boolean
}

export interface Subscription {
  id: string
  company_id: string
  plan_id: string
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at: string | null
}

export interface UsageCheckResult {
  allowed: boolean
  current_usage: number
  limit_value: number
  is_unlimited: boolean
}

export const subscriptionService = {
  async getPlans(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async getPlanFeatures(planId: string): Promise<PlanFeature[]> {
    const { data, error } = await supabase
      .from('plan_features')
      .select('*')
      .eq('plan_id', planId)
    if (error) throw error
    return data ?? []
  },

  async getSubscription(companyId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async createSubscription(companyId: string, planId: string): Promise<Subscription> {
    // Prevent duplicate active/trialing subscriptions
    const existing = await this.getSubscription(companyId)
    if (existing && ['active', 'trialing'].includes(existing.status)) {
      throw new Error('Active subscription already exists for this company')
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('trial_days')
      .eq('id', planId)
      .single()
    if (planError) throw planError

    const now = new Date()
    const trialEnds = new Date(now.getTime() + (plan.trial_days ?? 14) * 86400000)

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        company_id: companyId,
        plan_id: planId,
        status: 'trialing',
        trial_ends_at: trialEnds.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnds.toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async checkUsageLimit(companyId: string, featureKey: string): Promise<UsageCheckResult> {
    const { data, error } = await supabase.rpc('check_usage_limit', {
      p_company_id: companyId,
      p_feature_key: featureKey,
    })
    if (error) throw error
    return {
      allowed: data[0]?.allowed ?? false,
      current_usage: Number(data[0]?.current_usage ?? 0),
      limit_value: Number(data[0]?.limit_value ?? 0),
      is_unlimited: data[0]?.is_unlimited ?? false,
    }
  },

  async recordUsage(companyId: string, featureKey: string, count: number): Promise<void> {
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const { error } = await supabase
      .from('usage_records')
      .insert({
        company_id: companyId,
        feature_key: featureKey,
        usage_count: count,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
      })
    if (error) throw error
  },

  async checkModuleEntitlement(companyId: string, moduleKey: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_module_entitlement', {
      p_company_id: companyId,
      p_module_key: moduleKey,
    })
    if (error) throw error
    return data === true
  },
}
