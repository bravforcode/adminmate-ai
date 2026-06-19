import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

export interface PeopleAnalyticsModel {
  id: string
  company_id: string
  model_key: string
  model_name: string
  model_type: string
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PeopleAnalyticsRun {
  id: string
  company_id: string
  model_id: string
  run_date: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results_summary: Record<string, unknown> | null
  created_by: string
  created_at: string
  completed_at: string | null
}

export interface RiskIndicator {
  id: string
  company_id: string
  employee_id: string
  indicator_type: string
  risk_score: number
  confidence: 'low' | 'medium' | 'high'
  evidence: unknown[]
  model_run_id: string
  created_at: string
  updated_at: string
}

export interface PredictiveInsight {
  id: string
  company_id: string
  employee_id: string
  insight_type: string
  insight_text: string
  confidence: 'low' | 'medium' | 'high'
  evidence: unknown[]
  model_run_id: string
  requires_review: boolean
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

const SENSITIVE_FIELDS = [
  'email', 'phone', 'address', 'national_id', 'passport_number',
  'bank_account', 'salary', 'date_of_birth', 'social_security_number',
]

function excludeSensitiveFields<T extends Record<string, unknown>>(row: T): T {
  const result = { ...row }
  for (const field of SENSITIVE_FIELDS) {
    if (field in result) {
      delete result[field]
    }
  }
  return result
}

function stripSensitiveFromInsights(insights: PredictiveInsight[]): PredictiveInsight[] {
  return insights.map(insight => ({
    ...insight,
    evidence: (insight.evidence ?? []).map((e: unknown) => {
      if (typeof e === 'object' && e !== null) {
        return excludeSensitiveFields(e as Record<string, unknown>)
      }
      return e
    }),
  }))
}

export const peopleAnalyticsService = {
  runAnalytics: async (
    modelId: string,
    companyId: string,
    createdBy: string,
  ): Promise<PeopleAnalyticsRun> => {
    const allowed = await hasPermission('people_analytics', 'run')
    if (!allowed) throw new Error('Insufficient permissions to run analytics')

    const { data: model, error: modelError } = await supabase
      .from('people_analytics_models')
      .select('id, config')
      .eq('id', modelId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()
    if (modelError || !model) throw new Error('Model not found or inactive')

    const { data: run, error: runError } = await supabase
      .from('people_analytics_runs')
      .insert({
        company_id: companyId,
        model_id: modelId,
        run_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        created_by: createdBy,
      })
      .select()
      .single()
    if (runError) throw runError

    return run as PeopleAnalyticsRun
  },

  getRiskIndicators: async (
    companyId: string,
    employeeId?: string,
  ): Promise<RiskIndicator[]> => {
    const allowed = await hasPermission('people_analytics', 'read')
    if (!allowed) throw new Error('Insufficient permissions to read risk indicators')

    let query = supabase
      .from('risk_indicators')
      .select('*')
      .eq('company_id', companyId)
      .order('risk_score', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row) => excludeSensitiveFields(row as unknown as Record<string, unknown>) as unknown as RiskIndicator)
  },

  getInsights: async (
    companyId: string,
    filters?: {
      employeeId?: string
      insightType?: string
      requiresReview?: boolean
      confidence?: string
      page?: number
      limit?: number
    },
  ): Promise<{ insights: PredictiveInsight[]; total: number }> => {
    const allowed = await hasPermission('people_analytics', 'read')
    if (!allowed) throw new Error('Insufficient permissions to read insights')

    const { page = 1, limit = 25 } = filters ?? {}
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('predictive_insights')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId)
    }
    if (filters?.insightType) {
      query = query.eq('insight_type', filters.insightType)
    }
    if (filters?.requiresReview !== undefined) {
      query = query.eq('requires_review', filters.requiresReview)
    }
    if (filters?.confidence) {
      query = query.eq('confidence', filters.confidence)
    }

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    return {
      insights: stripSensitiveFromInsights((data ?? []) as PredictiveInsight[]),
      total: count ?? 0,
    }
  },

  reviewInsight: async (
    insightId: string,
    reviewedBy: string,
    action: 'approve' | 'dismiss' | 'flag_for_review',
  ): Promise<PredictiveInsight> => {
    const allowed = await hasPermission('people_analytics', 'run')
    if (!allowed) throw new Error('Insufficient permissions to review insights')

    if (!['approve', 'dismiss', 'flag_for_review'].includes(action)) {
      throw new Error('Invalid review action')
    }

    const updateFields: Record<string, unknown> = {
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    }

    if (action === 'approve' || action === 'dismiss') {
      updateFields.requires_review = false
    }

    const { data, error } = await supabase
      .from('predictive_insights')
      .update(updateFields)
      .eq('id', insightId)
      .select()
      .single()
    if (error) throw error

    return data as PredictiveInsight
  },
}
