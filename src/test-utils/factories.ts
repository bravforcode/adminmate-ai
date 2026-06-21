/**
 * Deterministic data factory for AdminMate AI tests.
 *
 * Every helper returns a plain object that mirrors the Supabase row shape.
 * All IDs are deterministic (uuid-v4-style strings derived from a seed) so
 * snapshot tests and integration assertions stay stable across runs.
 *
 * Usage:
 *   import { createCompany, createUser, createEmployee, createCandidate } from '@/test-utils/factories'
 *   const company = createCompany({ name: 'Acme' })
 */

// ---------------------------------------------------------------------------
// Deterministic ID generator
// ---------------------------------------------------------------------------

let _counter = 0

/** Reset the internal counter (call in beforeEach for isolation). */
export function resetFactoryCounter(seed = 0): void {
  _counter = seed
}

/** Generate a deterministic UUID-like string. */
function nextId(_prefix: string): string {
  _counter++
  const hex = _counter.toString(16).padStart(8, '0')
  return `${hex}-0000-4000-8000-000000000000`
}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

export interface CompanyFactoryInput {
  id?: string
  name?: string
  name_th?: string
  country?: string
  industry?: string
  tax_id?: string
  phone?: string
  email?: string
  city?: string
  website_url?: string
  subscription_tier?: string
  currency?: string
  locale?: string
}

export function createCompany(overrides: CompanyFactoryInput = {}) {
  const id = overrides.id ?? nextId('comp')
  return {
    id,
    name: 'Test Company',
    name_th: 'บริษัททดสอบ',
    country: 'TH',
    industry: 'Technology',
    tax_id: '1234567890',
    phone: '+66812345678',
    email: `admin@company-${id.slice(0, 8)}.com`,
    city: 'Bangkok',
    website_url: 'https://example.com',
    subscription_tier: 'pro',
    currency: 'THB',
    locale: 'th-TH',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// User / UserProfile
// ---------------------------------------------------------------------------

export interface UserFactoryInput {
  id?: string
  email?: string
  full_name?: string
  full_name_th?: string
  role?: string
  company_id?: string
  language_preference?: string
  phone?: string
  location?: string
  current_position?: string
  is_active?: boolean
  avatar_url?: string
}

export function createUser(overrides: UserFactoryInput = {}) {
  const id = overrides.id ?? nextId('user')
  const companyId = overrides.company_id ?? '00000000-0000-4000-8000-000000000001'
  return {
    id,
    email: `user-${id.slice(0, 8)}@test.com`,
    full_name: 'Somchai Jaidee',
    full_name_th: 'สมชาย ใจดี',
    role: 'admin',
    company_id: companyId,
    language_preference: 'en',
    phone: '+66812345678',
    location: 'Bangkok',
    current_position: 'HR Manager',
    is_active: true,
    avatar_url: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Employee (HRIS)
// ---------------------------------------------------------------------------

export interface EmployeeFactoryInput {
  id?: string
  company_id?: string
  user_id?: string
  employee_id?: string
  full_name?: string
  full_name_th?: string
  email?: string
  phone?: string
  department?: string
  position?: string
  employment_type?: string
  status?: string
  hire_date?: string
  location?: string
  cost_center?: string
}

export function createEmployee(overrides: EmployeeFactoryInput = {}) {
  const id = overrides.id ?? nextId('empl')
  const companyId = overrides.company_id ?? '00000000-0000-4000-8000-000000000001'
  return {
    id,
    company_id: companyId,
    user_id: overrides.user_id ?? `00000000-0000-4000-8000-${id.slice(0, 12).padStart(12, '0')}`,
    employee_id: `EMP-${id.slice(0, 4).toUpperCase()}`,
    full_name: 'Somying Makmuang',
    full_name_th: 'สมหญิง มากเหมือง',
    email: `employee-${id.slice(0, 8)}@test.com`,
    phone: '+66898765432',
    department: 'Engineering',
    position: 'Senior Developer',
    employment_type: 'full_time',
    status: 'active',
    hire_date: '2024-01-15',
    location: 'Bangkok',
    cost_center: 'CC-ENG',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Candidate
// ---------------------------------------------------------------------------

export interface CandidateFactoryInput {
  id?: string
  company_id?: string
  full_name?: string
  email?: string
  phone?: string
  location?: string
  current_position?: string
  years_experience?: number
  primary_skill?: string
  source?: string
  linkedin_url?: string
  portfolio_url?: string
}

export function createCandidate(overrides: CandidateFactoryInput = {}) {
  const id = overrides.id ?? nextId('cand')
  return {
    id,
    full_name: 'Pornpilas Srisuk',
    email: `candidate-${id.slice(0, 8)}@test.com`,
    phone: '+66876543210',
    location: 'Chiang Mai',
    current_position: 'Frontend Developer',
    years_experience: 5,
    primary_skill: 'React',
    source: 'linkedin',
    linkedin_url: `https://linkedin.com/in/candidate-${id.slice(0, 8)}`,
    portfolio_url: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export interface JobFactoryInput {
  id?: string
  company_id?: string
  title?: string
  department?: string
  location?: string
  employment_type?: string
  status?: string
  description?: string
  requirements?: string
  responsibilities?: string
  skills_required?: string[]
  salary_min?: number
  salary_max?: number
  headcount?: number
  created_at?: string
}

export function createJob(overrides: JobFactoryInput = {}) {
  const id = overrides.id ?? nextId('job')
  return {
    id,
    title: 'Senior React Developer',
    department: 'Engineering',
    location: 'Bangkok',
    employment_type: 'full_time',
    status: 'active',
    description: 'Build amazing UIs.',
    requirements: '5+ years React, TypeScript.',
    responsibilities: 'Lead frontend architecture.',
    skills_required: ['React', 'TypeScript', 'Tailwind CSS'],
    salary_min: 80000,
    salary_max: 120000,
    headcount: 1,
    created_at: '2024-06-01T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export interface ApplicationFactoryInput {
  id?: string
  company_id?: string
  job_id?: string
  candidate_id?: string
  candidate_email?: string
  candidate_name?: string
  status?: string
  ai_match_score?: number
  created_at?: string
  updated_at?: string
}

export function createApplication(overrides: ApplicationFactoryInput = {}) {
  const id = overrides.id ?? nextId('appl')
  return {
    id,
    company_id: overrides.company_id ?? '00000000-0000-4000-8000-000000000001',
    job_id: overrides.job_id ?? '00000000-0000-4000-8000-000000000002',
    candidate_id: overrides.candidate_id ?? '00000000-0000-4000-8000-000000000003',
    candidate_email: 'applicant@test.com',
    candidate_name: 'Pornpilas Srisuk',
    status: 'applied',
    ai_match_score: 85,
    ai_summary: null,
    ai_analysis: null,
    ai_missing_skills: null,
    ai_suggested_questions: null,
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Interview
// ---------------------------------------------------------------------------

export interface InterviewFactoryInput {
  id?: string
  company_id?: string
  application_id?: string
  status?: string
  scheduled_at?: string
  duration_minutes?: number
  interview_type?: string
  interviewer_name?: string
  location?: string
  meeting_link?: string
  rating?: number
  recommendation?: string
  feedback?: string
}

export function createInterview(overrides: InterviewFactoryInput = {}) {
  const id = overrides.id ?? nextId('intr')
  return {
    id,
    company_id: overrides.company_id ?? '00000000-0000-4000-8000-000000000001',
    application_id: overrides.application_id ?? '00000000-0000-4000-8000-000000000002',
    status: 'scheduled',
    scheduled_at: '2024-07-01T10:00:00Z',
    duration_minutes: 60,
    interview_type: 'technical',
    interviewer_name: 'Kittisak Test',
    location: 'Room 3A',
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    rating: null,
    recommendation: null,
    feedback: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Offer
// ---------------------------------------------------------------------------

export interface OfferFactoryInput {
  id?: string
  company_id?: string
  candidate_id?: string
  job_id?: string
  position_title?: string
  status?: string
  salary_offered?: number
  salary_currency?: string
  start_date?: string
  work_hours?: string
  benefits?: string[]
  special_conditions?: string
}

export function createOffer(overrides: OfferFactoryInput = {}) {
  const id = overrides.id ?? nextId('offr')
  return {
    id,
    company_id: overrides.company_id ?? '00000000-0000-4000-8000-000000000001',
    candidate_id: overrides.candidate_id ?? '00000000-0000-4000-8000-000000000002',
    job_id: overrides.job_id ?? '00000000-0000-4000-8000-000000000003',
    position_title: 'Senior Developer',
    status: 'pending',
    salary_offered: 100000,
    salary_currency: 'THB',
    start_date: '2024-08-01',
    work_hours: 'Mon-Fri 09:00-18:00',
    benefits: ['Health Insurance', 'Annual Leave 15 days'],
    special_conditions: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// OnboardingChecklist
// ---------------------------------------------------------------------------

export interface OnboardingFactoryInput {
  id?: string
  company_id?: string
  user_id?: string
  employee_id?: string
  template_name?: string
  status?: string
  progress_percentage?: number
  created_at?: string
}

export function createOnboardingChecklist(overrides: OnboardingFactoryInput = {}) {
  const id = overrides.id ?? nextId('onbd')
  return {
    id,
    user_id: overrides.user_id ?? '00000000-0000-4000-8000-000000000001',
    employee_id: overrides.employee_id ?? '00000000-0000-4000-8000-000000000002',
    template_name: 'Standard Onboarding',
    status: 'in_progress',
    progress_percentage: 30,
    created_at: '2024-06-15T00:00:00Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

/** Create N companies with unique deterministic IDs. */
export function createCompanies(count: number, overrides: CompanyFactoryInput = {}) {
  return Array.from({ length: count }, (_, i) =>
    createCompany({ ...overrides, id: overrides.id ?? `batch-comp-${i}` })
  )
}

/** Create N users bound to the same company. */
export function createUsers(count: number, companyId: string, overrides: UserFactoryInput = {}) {
  return Array.from({ length: count }, (_, i) =>
    createUser({ ...overrides, company_id: companyId, id: overrides.id ?? `batch-user-${i}` })
  )
}

/** Create N candidates. */
export function createCandidates(count: number, overrides: CandidateFactoryInput = {}) {
  return Array.from({ length: count }, (_, i) =>
    createCandidate({ ...overrides, id: overrides.id ?? `batch-cand-${i}` })
  )
}
