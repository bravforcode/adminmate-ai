import { supabase } from '../../lib/supabase'

/* ============================================================
   Learning & Development Service
   Courses, enrollments, module completion, training assignments,
   certifications, skill profiles.

   AI RULES:
   - AI CAN recommend courses based on skill gaps.
   - AI CAN remind about expiring certifications.
   - AI CANNOT decide mandatory training policy.
   - AI CANNOT use skill data for adverse employment decisions.
   ============================================================ */

// ── Types ──

export type CourseType = 'self_paced' | 'instructor_led' | 'blended' | 'virtual'
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped'
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue'
export type CertificationStatus = 'active' | 'expired' | 'revoked'

export interface LearningCourse {
  id: string
  company_id: string
  title: string
  description?: string
  course_type: CourseType
  duration_hours?: number
  is_mandatory: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LearningModule {
  id: string
  company_id: string
  course_id: string
  title: string
  content_url?: string
  order_index: number
  created_at: string
}

export interface LearningEnrollment {
  id: string
  company_id: string
  course_id: string
  employee_id: string
  status: EnrollmentStatus
  progress_pct: number
  enrolled_at: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface TrainingAssignment {
  id: string
  company_id: string
  course_id: string
  employee_id: string
  assigned_by: string
  due_date: string
  status: AssignmentStatus
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface Certification {
  id: string
  company_id: string
  employee_id: string
  cert_name: string
  issuing_org?: string
  issue_date?: string
  expiry_date?: string
  document_id?: string
  status: CertificationStatus
  created_at: string
  updated_at: string
}

export interface SkillProfile {
  id: string
  company_id: string
  employee_id: string
  skills: SkillEntry[]
  last_assessed_at?: string
  created_at: string
  updated_at: string
}

export interface SkillEntry {
  name: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  assessed_at?: string
}

// ── Input Types ──

export interface EnrollEmployeeInput {
  course_id: string
  employee_id: string
}

export interface AssignTrainingInput {
  course_id: string
  employee_id: string
  assigned_by: string
  due_date: string
}

// ── Sensitive field check for skill data ──

const SENSITIVE_SKILL_TAGS = ['race', 'religion', 'gender', 'age', 'disability', 'sexual_orientation', 'marital_status', 'political_affiliation', 'national_origin']

function containsSensitiveSkillData(skills: SkillEntry[]): boolean {
  return skills.some(s => SENSITIVE_SKILL_TAGS.includes(s.name.toLowerCase()))
}

// ── Service ──

export const learningService = {
  async getCourses(companyId: string): Promise<LearningCourse[]> {
    const { data, error } = await supabase
      .from('learning_courses')
      .select('id, company_id, title, description, course_type, duration_hours, is_mandatory, is_active, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('title')
    if (error) throw new Error(`Failed to fetch courses: ${error.message}`)
    return (data ?? []) as LearningCourse[]
  },

  async enrollEmployee(input: EnrollEmployeeInput, companyId: string): Promise<LearningEnrollment> {
    const { data, error } = await supabase
      .from('learning_enrollments')
      .insert({
        company_id: companyId,
        course_id: input.course_id,
        employee_id: input.employee_id,
        status: 'enrolled',
        progress_pct: 0,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to enroll employee: ${error.message}`)
    return data as LearningEnrollment
  },

  async completeModule(enrollmentId: string, _moduleId: string, companyId: string): Promise<LearningEnrollment> {
    // Fetch enrollment to validate ownership
    const { data: enrollment, error: fetchErr } = await supabase
      .from('learning_enrollments')
      .select('id, company_id, course_id, progress_pct')
      .eq('id', enrollmentId)
      .eq('company_id', companyId)
      .single()
    if (fetchErr || !enrollment) throw new Error('Enrollment not found')

    // Count modules in the course
    const { count: totalModules, error: countErr } = await supabase
      .from('learning_modules')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', enrollment.course_id)
    if (countErr) throw new Error(`Failed to count modules: ${countErr.message}`)

    // Count completed modules (simplified: progress increments by module)
    const completedCount = Math.min(
      Math.floor(enrollment.progress_pct / (100 / (totalModules || 1))) + 1,
      totalModules || 1
    )
    const newPct = Math.round((completedCount / (totalModules || 1)) * 100)
    const isComplete = newPct >= 100

    const { data, error } = await supabase
      .from('learning_enrollments')
      .update({
        progress_pct: Math.min(newPct, 100),
        status: isComplete ? 'completed' : 'in_progress',
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq('id', enrollmentId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to complete module: ${error.message}`)
    return data as LearningEnrollment
  },

  async getEnrollments(employeeId: string): Promise<LearningEnrollment[]> {
    const { data, error } = await supabase
      .from('learning_enrollments')
      .select('id, company_id, course_id, employee_id, status, progress_pct, enrolled_at, completed_at, created_at, updated_at')
      .eq('employee_id', employeeId)
      .order('enrolled_at', { ascending: false })
    if (error) throw new Error(`Failed to fetch enrollments: ${error.message}`)
    return (data ?? []) as LearningEnrollment[]
  },

  async assignTraining(input: AssignTrainingInput, companyId: string): Promise<TrainingAssignment> {
    const { data, error } = await supabase
      .from('training_assignments')
      .insert({
        company_id: companyId,
        course_id: input.course_id,
        employee_id: input.employee_id,
        assigned_by: input.assigned_by,
        due_date: input.due_date,
        status: 'assigned',
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to assign training: ${error.message}`)
    return data as TrainingAssignment
  },

  async getCertifications(employeeId: string): Promise<Certification[]> {
    const { data, error } = await supabase
      .from('certifications')
      .select('id, company_id, employee_id, cert_name, issuing_org, issue_date, expiry_date, document_id, status, created_at, updated_at')
      .eq('employee_id', employeeId)
      .order('expiry_date', { ascending: true })
    if (error) throw new Error(`Failed to fetch certifications: ${error.message}`)
    return (data ?? []) as Certification[]
  },

  async checkExpiringCertifications(companyId: string, daysAhead: number = 30): Promise<Certification[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('certifications')
      .select('id, company_id, employee_id, cert_name, issuing_org, issue_date, expiry_date, status, created_at, updated_at')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .gte('expiry_date', today)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })
    if (error) throw new Error(`Failed to check expiring certifications: ${error.message}`)
    return (data ?? []) as Certification[]
  },

  async getSkillProfile(employeeId: string): Promise<SkillProfile | null> {
    const { data, error } = await supabase
      .from('skill_profiles')
      .select('id, company_id, employee_id, skills, last_assessed_at, created_at, updated_at')
      .eq('employee_id', employeeId)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(`Failed to fetch skill profile: ${error.message}`)
    return data as SkillProfile | null
  },

  async upsertSkillProfile(
    employeeId: string,
    companyId: string,
    skills: SkillEntry[]
  ): Promise<SkillProfile> {
    if (containsSensitiveSkillData(skills)) {
      throw new Error('Skill data cannot contain sensitive fields (race, religion, gender, age, disability, etc.)')
    }

    const { data, error } = await supabase
      .from('skill_profiles')
      .upsert(
        {
          company_id: companyId,
          employee_id: employeeId,
          skills,
          last_assessed_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,employee_id' }
      )
      .select()
      .single()
    if (error) throw new Error(`Failed to upsert skill profile: ${error.message}`)
    return data as SkillProfile
  },
}
