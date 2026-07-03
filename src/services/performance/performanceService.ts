import { supabase } from '../../lib/supabase'

/* ============================================================
   Performance Management Service
   Cycles, reviews, OKRs, PIP, 9-box assessments.

   AI RULES:
   - AI CAN summarize feedback (comments field).
   - AI CAN draft development plans (outcome field).
   - AI CANNOT decide overall_rating.
   - AI CANNOT recommend termination.
   - evidence + confidence required on review_responses.
   ============================================================ */

// ── Types ──

export type CycleStatus = 'draft' | 'active' | 'closed'
export type ReviewStatus = 'pending' | 'in_progress' | 'submitted' | 'approved'
export type ReviewType = 'self' | 'manager' | 'peer' | 'skip_level' | '360'
export type OkrStatus = 'on_track' | 'at_risk' | 'behind' | 'completed'
export type PipStatus = 'active' | 'completed' | 'extended' | 'cancelled'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface PerformanceCycle {
  id: string
  company_id: string
  name: string
  cycle_type: string
  start_date: string
  end_date: string
  status: CycleStatus
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PerformanceTemplate {
  id: string
  company_id: string
  name: string
  template_type: string
  criteria: Array<{ key: string; label: string; description?: string }>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OkrObjective {
  id: string
  company_id: string
  employee_id: string
  cycle_id: string
  title: string
  progress: number
  status: OkrStatus
  created_at: string
  updated_at: string
}

export interface OkrKeyResult {
  id: string
  company_id: string
  objective_id: string
  title: string
  target_value: number
  current_value: number
  unit?: string
  created_at: string
  updated_at: string
}

export interface PerformanceReview {
  id: string
  company_id: string
  employee_id: string
  cycle_id: string
  reviewer_id: string
  review_type: ReviewType
  status: ReviewStatus
  overall_rating?: number
  comments?: string
  submitted_at?: string
  created_at: string
  updated_at: string
}

export interface ReviewResponse {
  id: string
  company_id: string
  review_id: string
  criterion_key: string
  rating?: number
  evidence?: string
  confidence?: ConfidenceLevel
  created_at: string
}

export interface PipCase {
  id: string
  company_id: string
  employee_id: string
  manager_id: string
  reason: string
  start_date: string
  end_date: string
  status: PipStatus
  outcome?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface NineBoxAssessment {
  id: string
  company_id: string
  employee_id: string
  cycle_id: string
  performance_score?: number
  potential_score?: number
  box_position?: number
  assessed_by: string
  notes?: string
  created_at: string
}

// ── Input Types ──

export interface CreateCycleInput {
  name: string
  cycle_type: string
  start_date: string
  end_date: string
  status?: CycleStatus
}

export interface CreateReviewInput {
  employee_id: string
  cycle_id: string
  reviewer_id: string
  review_type: ReviewType
}

export interface ReviewResponseInput {
  criterion_key: string
  rating?: number
  evidence?: string
  confidence?: ConfidenceLevel
}

export interface CreatePipInput {
  employee_id: string
  manager_id: string
  reason: string
  start_date: string
  end_date: string
}

export interface CreateNineBoxInput {
  employee_id: string
  cycle_id: string
  performance_score?: number
  potential_score?: number
  box_position?: number
  notes?: string
}

// ── Sensitive field check ──
const SENSITIVE_FIELDS = ['race', 'religion', 'gender', 'age', 'disability', 'sexual_orientation', 'marital_status', 'political_affiliation']

function containsSensitiveField(input: Record<string, unknown>): boolean {
  for (const key of Object.keys(input)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) return true
  }
  return false
}

function computeBoxPosition(performanceScore?: number, potentialScore?: number): number | undefined {
  if (performanceScore == null || potentialScore == null) return undefined
  const perf = performanceScore <= 2.5 ? 1 : performanceScore <= 3.75 ? 2 : 3
  const pot = potentialScore <= 2.5 ? 1 : potentialScore <= 3.75 ? 2 : 3
  return (pot - 1) * 3 + perf
}

// ── Service ──

export const performanceService = {
  async createCycle(companyId: string, input: CreateCycleInput): Promise<PerformanceCycle> {
    const { data, error } = await supabase
      .from('performance_cycles')
      .insert({ ...input, company_id: companyId })
      .select()
      .single()
    if (error) throw new Error(`Failed to create cycle: ${error.message}`)
    return data as PerformanceCycle
  },

  async createReview(companyId: string, input: CreateReviewInput): Promise<PerformanceReview> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .insert({ ...input, company_id: companyId, status: 'pending' })
      .select()
      .single()
    if (error) throw new Error(`Failed to create review: ${error.message}`)
    return data as PerformanceReview
  },

  async submitReview(
    companyId: string,
    reviewId: string,
    responses: ReviewResponseInput[],
    overallRating?: number,
    comments?: string
  ): Promise<PerformanceReview> {
    // Validate: evidence + confidence required on each response
    for (const r of responses) {
      if (r.rating != null && (!r.evidence || !r.confidence)) {
        throw new Error(`Criterion ${r.criterion_key} requires both evidence and confidence when rating is provided`)
      }
    }

    // Insert responses
    const responseRows = responses.map(r => ({
      ...r,
      company_id: companyId,
      review_id: reviewId,
    }))

    const { error: respErr } = await supabase
      .from('review_responses')
      .insert(responseRows)
    if (respErr) throw new Error(`Failed to save responses: ${respErr.message}`)

    // Update review
    const { data, error } = await supabase
      .from('performance_reviews')
      .update({
        overall_rating: overallRating,
        comments,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to submit review: ${error.message}`)
    return data as PerformanceReview
  },

  async getEmployeeReviews(employeeId: string): Promise<PerformanceReview[]> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to fetch reviews: ${error.message}`)
    return (data ?? []) as PerformanceReview[]
  },

  async createPip(companyId: string, input: CreatePipInput, createdBy: string): Promise<PipCase> {
    if (!input.reason || input.reason.trim().length === 0) {
      throw new Error('PIP requires a reason')
    }
    const { data, error } = await supabase
      .from('pip_cases')
      .insert({ ...input, company_id: companyId, created_by: createdBy, status: 'active' })
      .select()
      .single()
    if (error) throw new Error(`Failed to create PIP: ${error.message}`)
    return data as PipCase
  },

  async completePip(companyId: string, pipId: string, outcome: string): Promise<PipCase> {
    if (!outcome || outcome.trim().length === 0) {
      throw new Error('PIP completion requires an outcome')
    }
    const { data, error } = await supabase
      .from('pip_cases')
      .update({ status: 'completed', outcome })
      .eq('id', pipId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to complete PIP: ${error.message}`)
    return data as PipCase
  },

  async createNineBoxAssessment(
    companyId: string,
    input: CreateNineBoxInput,
    assessedBy: string
  ): Promise<NineBoxAssessment> {
    if (containsSensitiveField(input as unknown as Record<string, unknown>)) {
      throw new Error('9-box assessment cannot use sensitive fields (race, religion, gender, etc.)')
    }
    const boxPosition = input.box_position ?? computeBoxPosition(input.performance_score, input.potential_score)
    const { data, error } = await supabase
      .from('nine_box_assessments')
      .insert({ ...input, company_id: companyId, assessed_by: assessedBy, box_position: boxPosition })
      .select()
      .single()
    if (error) throw new Error(`Failed to create 9-box assessment: ${error.message}`)
    return data as NineBoxAssessment
  },

  // ── OKR CRUD ──

  async createObjective(
    companyId: string,
    input: { employee_id: string; cycle_id: string; title: string }
  ): Promise<OkrObjective> {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Objective title is required')
    }
    const { data, error } = await supabase
      .from('okr_objectives')
      .insert({
        company_id: companyId,
        employee_id: input.employee_id,
        cycle_id: input.cycle_id,
        title: input.title.trim(),
        progress: 0,
        status: 'on_track',
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create objective: ${error.message}`)
    return data as OkrObjective
  },

  async updateObjectiveProgress(
    companyId: string,
    objectiveId: string,
    progress: number,
    status?: OkrStatus
  ): Promise<OkrObjective> {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100')
    }
    const update: Record<string, unknown> = { progress }
    if (status) update.status = status
    const { data, error } = await supabase
      .from('okr_objectives')
      .update(update)
      .eq('id', objectiveId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to update objective: ${error.message}`)
    return data as OkrObjective
  },

  async addKeyResult(
    companyId: string,
    input: { objective_id: string; title: string; target_value: number; unit?: string }
  ): Promise<OkrKeyResult> {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Key result title is required')
    }
    if (input.target_value <= 0) {
      throw new Error('Target value must be positive')
    }
    const { data, error } = await supabase
      .from('okr_key_results')
      .insert({
        company_id: companyId,
        objective_id: input.objective_id,
        title: input.title.trim(),
        target_value: input.target_value,
        current_value: 0,
        unit: input.unit ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to add key result: ${error.message}`)
    return data as OkrKeyResult
  },

  async updateKeyResultProgress(
    companyId: string,
    keyResultId: string,
    currentValue: number
  ): Promise<OkrKeyResult> {
    if (currentValue < 0) {
      throw new Error('Current value cannot be negative')
    }
    const { data, error } = await supabase
      .from('okr_key_results')
      .update({ current_value: currentValue })
      .eq('id', keyResultId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to update key result: ${error.message}`)
    return data as OkrKeyResult
  },

  // ── Review Confidentiality ──

  async getReviewById(
    companyId: string,
    reviewId: string,
    viewerId: string,
    viewerRole: string
  ): Promise<PerformanceReview | null> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('company_id', companyId)
      .single()

    if (error) return null
    if (!data) return null

    // Confidentiality: only employee, reviewer, HR, admin, auditor can view
    const allowed = ['owner', 'admin', 'hr_manager', 'auditor']
    if (allowed.includes(viewerRole)) return data as PerformanceReview
    if (data.employee_id === viewerId) return data as PerformanceReview
    if (data.reviewer_id === viewerId) return data as PerformanceReview

    // Deny access
    return null
  },

  async getReviewsByCycle(
    companyId: string,
    cycleId: string
  ): Promise<PerformanceReview[]> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .select('*')
      .eq('company_id', companyId)
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to fetch reviews: ${error.message}`)
    return (data ?? []) as PerformanceReview[]
  },

  // ── Feedback ──

  async addFeedback(
    companyId: string,
    reviewId: string,
    _reviewerId: string,
    feedback: { criterion_key: string; rating: number; evidence: string; confidence: ConfidenceLevel }
  ): Promise<ReviewResponse> {
    if (!feedback.evidence || feedback.evidence.trim().length === 0) {
      throw new Error('Evidence is required when providing feedback')
    }
    if (!feedback.confidence) {
      throw new Error('Confidence level is required when providing feedback')
    }
    if (feedback.rating < 1 || feedback.rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }
    const { data, error } = await supabase
      .from('review_responses')
      .insert({
        company_id: companyId,
        review_id: reviewId,
        criterion_key: feedback.criterion_key,
        rating: feedback.rating,
        evidence: feedback.evidence.trim(),
        confidence: feedback.confidence,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to add feedback: ${error.message}`)
    return data as ReviewResponse
  },

  async getFeedbackForReview(
    companyId: string,
    reviewId: string
  ): Promise<ReviewResponse[]> {
    const { data, error } = await supabase
      .from('review_responses')
      .select('*')
      .eq('company_id', companyId)
      .eq('review_id', reviewId)
      .order('created_at')
    if (error) throw new Error(`Failed to fetch feedback: ${error.message}`)
    return (data ?? []) as ReviewResponse[]
  },
}
