import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Benefits Administration Service
   Plans, eligibility, enrollment, dependents.

   RULES:
   - company_id is required on all queries (RLS enforced).
   - Enrollments default to 'pending' and require approval.
   - Dependent data is protected: only viewable by company HR.
   - Eligibility checks enforce employment_type + service months.
   - Open enrollment periods gate enrollment windows.
   ============================================================ */

// ── Types ──

export type PlanType = 'health' | 'dental' | 'vision' | 'life' | 'disability' | 'retirement' | 'other'
export type EnrollmentStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'expired'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'probation'
export type DependentRelationship = 'spouse' | 'child' | 'parent' | 'sibling' | 'other'
export type OpenEnrollmentStatus = 'upcoming' | 'active' | 'closed'

export interface BenefitPlan {
  id: string
  company_id: string
  name: string
  plan_type: PlanType
  description?: string
  provider?: string
  monthly_cost: number
  employee_contribution: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BenefitEligibilityRule {
  id: string
  company_id: string
  plan_id: string
  employment_type: EmploymentType
  min_service_months: number
  department_ids: string[]
  created_at: string
}

export interface BenefitEnrollment {
  id: string
  company_id: string
  plan_id: string
  employee_id: string
  status: EnrollmentStatus
  enrolled_at: string
  coverage_start?: string
  coverage_end?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface BenefitDependent {
  id: string
  company_id: string
  enrollment_id: string
  dependent_name: string
  relationship: DependentRelationship
  date_of_birth: string
  is_primary_caregiver: boolean
  created_at: string
  updated_at: string
}

export interface BenefitOpenEnrollmentPeriod {
  id: string
  company_id: string
  name: string
  start_date: string
  end_date: string
  status: OpenEnrollmentStatus
  created_at: string
  updated_at: string
}

// ── Input Types ──

export interface EnrollEmployeeInput {
  plan_id: string
  employee_id: string
  coverage_start?: string
  coverage_end?: string
}

export interface AddDependentInput {
  dependent_name: string
  relationship: DependentRelationship
  date_of_birth: string
  is_primary_caregiver?: boolean
}

// ── Service ──

export const benefitService = {
  async getBenefitPlans(companyId: string): Promise<BenefitPlan[]> {
    const { data, error } = await supabase
      .from('benefit_plans')
      .select('id, company_id, name, plan_type, description, provider, monthly_cost, employee_contribution, is_active, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (error) throw new Error(`Failed to fetch benefit plans: ${error.message}`)
    return (data ?? []) as BenefitPlan[]
  },

  async enrollEmployee(companyId: string, input: EnrollEmployeeInput): Promise<BenefitEnrollment> {
    const canEnroll = await hasPermission('benefit', 'enroll')
    if (!canEnroll) throw new Error('Requires benefit_enroll permission')

    // Check eligibility before enrolling
    const eligible = await this.checkEligibility(companyId, input.employee_id, input.plan_id)
    if (!eligible.eligible) {
      throw new Error(`Employee not eligible: ${eligible.reason}`)
    }

    // Check for existing active enrollment
    const { data: existing } = await supabase
      .from('benefit_enrollments')
      .select('id')
      .eq('company_id', companyId)
      .eq('employee_id', input.employee_id)
      .eq('plan_id', input.plan_id)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (existing) {
      throw new Error('Employee already has an active or pending enrollment for this plan')
    }

    const { data, error } = await supabase
      .from('benefit_enrollments')
      .insert({
        company_id: companyId,
        plan_id: input.plan_id,
        employee_id: input.employee_id,
        status: 'pending',
        coverage_start: input.coverage_start,
        coverage_end: input.coverage_end,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to enroll employee: ${error.message}`)
    return data as BenefitEnrollment
  },

  async approveEnrollment(
    companyId: string,
    enrollmentId: string,
    approvedBy: string
  ): Promise<BenefitEnrollment> {
    const { data, error } = await supabase
      .from('benefit_enrollments')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .select()
      .single()
    if (error) throw new Error(`Failed to approve enrollment: ${error.message}`)
    if (!data) throw new Error('Enrollment not found or already processed')
    return data as BenefitEnrollment
  },

  async getEnrollments(
    companyId: string,
    employeeId?: string
  ): Promise<BenefitEnrollment[]> {
    let query = supabase
      .from('benefit_enrollments')
      .select('id, company_id, plan_id, employee_id, status, enrolled_at, coverage_start, coverage_end, approved_by, approved_at, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch enrollments: ${error.message}`)
    return (data ?? []) as BenefitEnrollment[]
  },

  async addDependent(
    companyId: string,
    enrollmentId: string,
    input: AddDependentInput
  ): Promise<BenefitDependent> {
    // Verify enrollment exists and belongs to company
    const { data: enrollment } = await supabase
      .from('benefit_enrollments')
      .select('id, status')
      .eq('id', enrollmentId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!enrollment) {
      throw new Error('Enrollment not found')
    }
    if (enrollment.status !== 'approved') {
      throw new Error('Dependents can only be added to approved enrollments')
    }

    const { data, error } = await supabase
      .from('benefit_dependents')
      .insert({
        company_id: companyId,
        enrollment_id: enrollmentId,
        dependent_name: input.dependent_name,
        relationship: input.relationship,
        date_of_birth: input.date_of_birth,
        is_primary_caregiver: input.is_primary_caregiver ?? false,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to add dependent: ${error.message}`)
    return data as BenefitDependent
  },

  async checkEligibility(
    companyId: string,
    employeeId: string,
    planId: string
  ): Promise<{ eligible: boolean; reason: string }> {
    // Fetch plan
    const { data: plan } = await supabase
      .from('benefit_plans')
      .select('id, is_active')
      .eq('id', planId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!plan) {
      return { eligible: false, reason: 'Plan not found' }
    }
    if (!plan.is_active) {
      return { eligible: false, reason: 'Plan is not active' }
    }

    // Fetch employee
    const { data: employee } = await supabase
      .from('employees')
      .select('id, employment_type, hire_date, department_id')
      .eq('id', employeeId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!employee) {
      return { eligible: false, reason: 'Employee not found' }
    }

    // Fetch eligibility rules for this plan
    const { data: rules } = await supabase
      .from('benefit_eligibility_rules')
      .select('id, employment_type, min_service_months, department_ids')
      .eq('plan_id', planId)
      .eq('company_id', companyId)

    if (!rules || rules.length === 0) {
      // No rules = eligible by default
      return { eligible: true, reason: 'No eligibility rules configured' }
    }

    // Check employment type match
    const employmentTypeRule = rules.find(r => r.employment_type === employee.employment_type)
    if (!employmentTypeRule) {
      return { eligible: false, reason: `Employment type '${employee.employment_type}' is not eligible for this plan` }
    }

    // Check minimum service months
    if (employee.hire_date) {
      const hireDate = new Date(employee.hire_date)
      const now = new Date()
      const monthsWorked = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth())
      if (monthsWorked < employmentTypeRule.min_service_months) {
        return { eligible: false, reason: `Minimum ${employmentTypeRule.min_service_months} months of service required (current: ${monthsWorked} months)` }
      }
    }

    // Check department restriction
    if (
      employmentTypeRule.department_ids &&
      Array.isArray(employmentTypeRule.department_ids) &&
      employmentTypeRule.department_ids.length > 0
    ) {
      if (employee.department_id && !employmentTypeRule.department_ids.includes(employee.department_id)) {
        return { eligible: false, reason: 'Employee department is not eligible for this plan' }
      }
    }

    return { eligible: true, reason: 'Employee meets all eligibility criteria' }
  },

  async getOpenEnrollmentPeriods(companyId: string): Promise<BenefitOpenEnrollmentPeriod[]> {
    const { data, error } = await supabase
      .from('benefit_open_enrollment_periods')
      .select('id, company_id, name, start_date, end_date, status, created_at, updated_at')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false })
    if (error) throw new Error(`Failed to fetch open enrollment periods: ${error.message}`)
    return (data ?? []) as BenefitOpenEnrollmentPeriod[]
  },

  async isWithinOpenEnrollment(companyId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('benefit_open_enrollment_periods')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle()
    return !!data
  },

  async preparePayrollDeduction(
    companyId: string,
    enrollmentId: string
  ): Promise<{ employee_contribution: number; plan_name: string; monthly_cost: number }> {
    const { data, error } = await supabase
      .from('benefit_enrollments')
      .select(`
        id,
        plan:benefit_plans ( name, monthly_cost, employee_contribution )
      `)
      .eq('id', enrollmentId)
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .maybeSingle()

    if (error) throw new Error(`Failed to prepare payroll deduction: ${error.message}`)
    if (!data) throw new Error('Approved enrollment not found')

    const plan = data.plan as unknown as { name: string; monthly_cost: number; employee_contribution: number }
    return {
      employee_contribution: plan.employee_contribution,
      plan_name: plan.name,
      monthly_cost: plan.monthly_cost,
    }
  },
}
