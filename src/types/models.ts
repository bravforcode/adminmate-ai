export interface CVParsedSkill {
  name: string
  level?: string
}

export interface CVParsedWorkExperience {
  title: string
  company: string
  start_date?: string
  end_date?: string
  description?: string
}

export interface CVParsedEducation {
  degree: string
  field: string
  institution: string
  start_date?: string
  end_date?: string
}

export interface CVParsedLanguage {
  name: string
  level: string
}

export interface CVParsedContent {
  summary?: string
  skills?: CVParsedSkill[]
  work_experience?: CVParsedWorkExperience[]
  education?: CVParsedEducation[]
  languages?: CVParsedLanguage[]
}

export interface CVDocument {
  id: string
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
  is_current?: boolean
  parsed_content?: CVParsedContent
}

export interface Candidate {
  id: string
  full_name?: string
  current_position?: string
  email?: string
  phone?: string
  location?: string
  linkedin_url?: string
  portfolio_url?: string
  years_experience?: number
  primary_skill?: string
  source?: string
  cv_documents?: CVDocument[]
  applications?: Application[]
}

export interface Job {
  id: string
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
  applications?: { count: number }[]
}

export interface Application {
  id: string
  status?: string
  job_id?: string
  candidate_email?: string
  candidate_name?: string
  company_id?: string
  ai_match_score?: number
  ai_summary?: string
  ai_analysis?: {
    matched_skills?: string[]
    experience_match?: string
    education_match?: string
  }
  ai_missing_skills?: string[]
  ai_suggested_questions?: string[]
  created_at?: string
  updated_at?: string
  candidates?: Partial<Candidate>
  jobs?: Partial<Job>
  cv_documents?: CVDocument[]
}

export interface Interview {
  id: string
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
  applications?: {
    candidates?: Partial<Candidate>
    jobs?: Partial<Job>
  }
}

export interface Offer {
  id: string
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
  company?: { name?: string }
  candidates?: Partial<Candidate>
  jobs?: Partial<Job>
}

export interface OnboardingChecklist {
  id: string
  user_id?: string
  employee_id?: string
  template_name?: string
  status?: string
  progress_percentage?: number
  created_at?: string
  onboarding_tasks?: OnboardingTask[]
  user_profiles?: { full_name?: string }
}

export interface OnboardingTask {
  id: string
  checklist_id?: string
  task_name?: string
  task_name_en?: string | null
  description?: string | null
  category?: string | null
  timeframe?: string | null
  order_index?: number
  is_completed?: boolean
  completed_at?: string | null
  completed_by?: string | null
  assigned_to?: string
}

export interface Document {
  id: string
  document_type?: string
  status?: string
  created_at?: string
  candidates?: { full_name?: string }
}

export interface DataDeletionRequest {
  id: string
  requester_email?: string
  request_type?: string
  status?: string
  created_at?: string
}

export interface UserProfile {
  id: string
  full_name?: string
  full_name_th?: string
  email?: string
  role?: string
  company_id?: string
  language_preference?: string
  phone?: string
  location?: string
  current_position?: string
}

export interface Company {
  id: string
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
}

export interface DashboardStats {
  active_jobs: number
  new_applicants_7d: number
  pending_documents: number
  active_onboarding: number
}

export interface OfferLetterData {
  company?: { name?: string }
  candidates?: { full_name?: string }
  candidate_name?: string
  position_title?: string
  employment_type?: string
  start_date?: string
  work_hours?: string
  salary_offered?: number
  salary_currency?: string
  benefits?: string[]
  special_conditions?: string
}
