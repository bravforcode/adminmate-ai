export const APP_NAME = 'AdminMate AI'
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173'

export const PIPELINE_STAGES = [
  { id: 'applied', labelKey: 'pipeline.applied', color: 'blue' },
  { id: 'ai_screening', labelKey: 'pipeline.screening', color: 'purple' },
  { id: 'shortlisted', labelKey: 'pipeline.shortlisted', color: 'yellow' },
  { id: 'interviewing', labelKey: 'pipeline.interviewing', color: 'orange' },
  { id: 'offered', labelKey: 'pipeline.offered', color: 'teal' },
  { id: 'hired', labelKey: 'pipeline.hired', color: 'green' },
  { id: 'rejected', labelKey: 'pipeline.rejected', color: 'red' },
] as const

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', labelKey: 'employment.full_time' },
  { value: 'part_time', labelKey: 'employment.part_time' },
  { value: 'contract', labelKey: 'employment.contract' },
  { value: 'internship', labelKey: 'employment.internship' },
  { value: 'freelance', labelKey: 'employment.freelance' },
]

export const EXPERIENCE_LEVELS = [
  { value: 'entry', labelKey: 'experience.entry' },
  { value: 'junior', labelKey: 'experience.junior' },
  { value: 'mid', labelKey: 'experience.mid' },
  { value: 'senior', labelKey: 'experience.senior' },
  { value: 'lead', labelKey: 'experience.lead' },
  { value: 'executive', labelKey: 'experience.executive' },
]

export const DOCUMENT_TYPES = [
  'employment_contract', 'nda', 'tax_pnd1', 'tax_pnd50',
  'social_security', 'health_insurance', 'bpjs_tk', 'bpjs_kes',
  'work_permit', 'visa', 'company_policy', 'handbook',
  'warning_letter', 'termination_letter', 'onboarding_checklist',
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_CV_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
