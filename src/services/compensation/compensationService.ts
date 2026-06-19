import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Compensation & Workforce Planning Service
   Salary bands, cycles, reviews, headcount plans.

   RULES:
   - Salary data is highly sensitive: owner/admin/hr_manager only.
   - Reviews require approval before salary changes take effect.
   - Market data (imported/market_reference) is labeled as such.
   - company_id enforced via RLS on all queries.
   - Audit trail via DB triggers on all compensation tables.
   ============================================================ */

// ── Types ──

export type CycleStatus = 'draft' | 'active' | 'closed'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type DataSource = 'internal' | 'imported' | 'market_reference'

export interface SalaryBand {
  id: string
  company_id: string
  job_family: string
  level: string
  min_salary: number
  mid_salary: number
  max_salary: number
  currency: string
  data_source: DataSource
  effective_from: string
  effective_to?: string
  created_at: string
  updated_at: string
}

export interface CompensationCycle {
  id: string
  company_id: string
  name: string
  cycle_year: number
  status: CycleStatus
  merit_budget_pct?: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CompensationReview {
  id: string
  company_id: string
  cycle_id: string
  employee_id: string
  current_salary: number
  proposed_salary: number
  merit_increase_pct?: number
  reason?: string
  status: ReviewStatus
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface HeadcountPlan {
  id: string
  company_id: string
  department_id: string
  plan_year: number
  planned_headcount: number
  current_headcount: number
  budget?: number
  notes?: string
  created_at: string
  updated_at: string
}

// ── Input Types ──

export interface CreateCycleInput {
  name: string
  cycle_year: number
  status?: CycleStatus
  merit_budget_pct?: number
}

export interface SubmitReviewInput {
  cycle_id: string
  employee_id: string
  current_salary: number
  proposed_salary: number
  merit_increase_pct?: number
  reason?: string
}

export interface CreateHeadcountPlanInput {
  department_id: string
  plan_year: number
  planned_headcount: number
  current_headcount?: number
  budget?: number
  notes?: string
}

// ── Helpers ──

function computeMeritIncrease(currentSalary: number, proposedSalary: number): number {
  if (currentSalary <= 0) return 0
  return Number((((proposedSalary - currentSalary) / currentSalary) * 100).toFixed(2))
}

async function requireCompensationPermission(action: 'read' | 'write' | 'approve'): Promise<void> {
  const allowed = await hasPermission('compensation', action)
  if (!allowed) {
    throw new Error(`Permission denied: compensation_${action} required`)
  }
}

// ── Service ──

export const compensationService = {
  async createCycle(companyId: string, input: CreateCycleInput, createdBy: string): Promise<CompensationCycle> {
    await requireCompensationPermission('write')

    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Cycle name is required')
    }
    if (!input.cycle_year || input.cycle_year < 2000 || input.cycle_year > 2100) {
      throw new Error('Cycle year must be between 2000 and 2100')
    }

    const { data, error } = await supabase
      .from('compensation_cycles')
      .insert({
        company_id: companyId,
        name: input.name.trim(),
        cycle_year: input.cycle_year,
        status: input.status ?? 'draft',
        merit_budget_pct: input.merit_budget_pct,
        created_by: createdBy,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create cycle: ${error.message}`)
    return data as CompensationCycle
  },

  async submitReview(companyId: string, input: SubmitReviewInput): Promise<CompensationReview> {
    await requireCompensationPermission('write')

    // Validate cycle exists and is active
    const { data: cycle } = await supabase
      .from('compensation_cycles')
      .select('id, status')
      .eq('id', input.cycle_id)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!cycle) throw new Error('Compensation cycle not found')
    if (cycle.status !== 'active') throw new Error('Can only submit reviews to active cycles')

    // Validate salaries
    if (input.current_salary <= 0) throw new Error('Current salary must be positive')
    if (input.proposed_salary <= 0) throw new Error('Proposed salary must be positive')

    const meritIncreasePct = input.merit_increase_pct ?? computeMeritIncrease(input.current_salary, input.proposed_salary)

    // Check for duplicate review in same cycle
    const { data: existing } = await supabase
      .from('compensation_reviews')
      .select('id')
      .eq('company_id', companyId)
      .eq('cycle_id', input.cycle_id)
      .eq('employee_id', input.employee_id)
      .maybeSingle()

    if (existing) {
      throw new Error('Review already exists for this employee in this cycle')
    }

    const { data, error } = await supabase
      .from('compensation_reviews')
      .insert({
        company_id: companyId,
        cycle_id: input.cycle_id,
        employee_id: input.employee_id,
        current_salary: input.current_salary,
        proposed_salary: input.proposed_salary,
        merit_increase_pct: meritIncreasePct,
        reason: input.reason,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to submit review: ${error.message}`)
    return data as CompensationReview
  },

  async approveReview(
    companyId: string,
    reviewId: string,
    approvedBy: string,
    approved: boolean
  ): Promise<CompensationReview> {
    await requireCompensationPermission('approve')

    const newStatus: ReviewStatus = approved ? 'approved' : 'rejected'

    const { data, error } = await supabase
      .from('compensation_reviews')
      .update({
        status: newStatus,
        reviewed_by: approvedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .select()
      .single()
    if (error) throw new Error(`Failed to approve review: ${error.message}`)
    if (!data) throw new Error('Review not found or already processed')
    return data as CompensationReview
  },

  async getReviews(companyId: string, cycleId: string): Promise<CompensationReview[]> {
    await requireCompensationPermission('read')

    const { data, error } = await supabase
      .from('compensation_reviews')
      .select('*')
      .eq('company_id', companyId)
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to fetch reviews: ${error.message}`)
    return (data ?? []) as CompensationReview[]
  },

  async createHeadcountPlan(
    companyId: string,
    input: CreateHeadcountPlanInput
  ): Promise<HeadcountPlan> {
    await requireCompensationPermission('write')

    if (!input.department_id) throw new Error('Department ID is required')
    if (!input.plan_year || input.plan_year < 2000 || input.plan_year > 2100) {
      throw new Error('Plan year must be between 2000 and 2100')
    }
    if (input.planned_headcount < 0) throw new Error('Planned headcount cannot be negative')

    // Check for duplicate plan in same department/year
    const { data: existing } = await supabase
      .from('headcount_plans')
      .select('id')
      .eq('company_id', companyId)
      .eq('department_id', input.department_id)
      .eq('plan_year', input.plan_year)
      .maybeSingle()

    if (existing) {
      throw new Error('Headcount plan already exists for this department/year')
    }

    const { data, error } = await supabase
      .from('headcount_plans')
      .insert({
        company_id: companyId,
        department_id: input.department_id,
        plan_year: input.plan_year,
        planned_headcount: input.planned_headcount,
        current_headcount: input.current_headcount ?? 0,
        budget: input.budget,
        notes: input.notes,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create headcount plan: ${error.message}`)
    return data as HeadcountPlan
  },

  async getHeadcountPlans(companyId: string, year: number): Promise<HeadcountPlan[]> {
    await requireCompensationPermission('read')

    const { data, error } = await supabase
      .from('headcount_plans')
      .select('*')
      .eq('company_id', companyId)
      .eq('plan_year', year)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to fetch headcount plans: ${error.message}`)
    return (data ?? []) as HeadcountPlan[]
  },
}
