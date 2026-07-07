import { supabase } from '@/lib/supabase'

export interface UsageMetric {
  id: string
  company_id: string
  metric_name: string
  metric_value: number
  metric_unit: string
  recorded_at: string
}

export interface TenantQuota {
  id: string
  company_id: string
  quota_name: string
  quota_limit: number
  current_usage: number
  period_start: string
  period_end: string
}

export interface CostAttribution {
  id: string
  company_id: string
  service_name: string
  cost_cents: number
  period: string
}

export const metricsService = {
  async recordMetric(
    companyId: string,
    name: string,
    value: number,
    unit: string
  ): Promise<void> {
    const { error } = await supabase.from('usage_metrics').insert({
      company_id: companyId,
      metric_name: name,
      metric_value: value,
      metric_unit: unit,
      recorded_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  async getMetrics(companyId: string, days = 30): Promise<UsageMetric[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('usage_metrics')
      .select('*')
      .eq('company_id', companyId)
      .gte('recorded_at', since.toISOString())
      .order('recorded_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as UsageMetric[]
  },

  async getQuotas(companyId: string): Promise<TenantQuota[]> {
    const { data, error } = await supabase
      .from('tenant_quotas')
      .select('*')
      .eq('company_id', companyId)
      .order('quota_name', { ascending: true })

    if (error) throw error
    return (data ?? []) as TenantQuota[]
  },

  async checkQuotaWarning(
    companyId: string
  ): Promise<{ quota: string; usage: number; limit: number }[]> {
    const quotas = await this.getQuotas(companyId)
    return quotas
      .filter((q) => q.quota_limit > 0 && q.current_usage / q.quota_limit > 0.8)
      .map((q) => ({
        quota: q.quota_name,
        usage: q.current_usage,
        limit: q.quota_limit,
      }))
  },

  async getCosts(
    companyId: string,
    days = 30
  ): Promise<CostAttribution[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('cost_attribution')
      .select('*')
      .eq('company_id', companyId)
      .gte('period', since.toISOString().slice(0, 7))
      .order('period', { ascending: false })

    if (error) throw error
    return (data ?? []) as CostAttribution[]
  },

  async getTotalCost(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const startPeriod = startDate.slice(0, 7)
    const endPeriod = endDate.slice(0, 7)

    const { data, error } = await supabase
      .from('cost_attribution')
      .select('cost_cents')
      .eq('company_id', companyId)
      .gte('period', startPeriod)
      .lte('period', endPeriod)

    if (error) throw error
    return (data ?? []).reduce(
      (sum, row) => sum + ((row as CostAttribution).cost_cents ?? 0),
      0
    )
  },
}
