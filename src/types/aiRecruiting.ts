/* ============================================================
   AdminMate AI — AI Recruiting Type Contract
   Release 4: Evidence-based, explainable, tenant-scoped AI

   RULES:
   - AI assists, never decides.
   - No auto-reject, no auto-hire, no auto-send.
   - No sensitive fields in scoring.
   - No hardcoded scores.
   - Evidence required for every score.
   - HR can override every AI result.
   ============================================================ */

// ── Confidence & Recommendation ─────────────────────────────

export type AIConfidence = 'low' | 'medium' | 'high'

export type AIRecommendation =
  | 'shortlist'      // Strong evidence supports advancing
  | 'review'         // Some evidence, worth human review
  | 'manual_review'  // Insufficient evidence for automated guidance
  | 'not_enough_evidence' // Too many criteria missing to score

// ── Evidence ────────────────────────────────────────────────

export type EvidenceStatus =
  | 'supported'      // Evidence exists and is reliable
  | 'missing'        // No evidence found
  | 'needs_interview' // Requires interview to evaluate
  | 'manual_review'  // Requires human judgment

export type EvidenceSource =
  | 'application_answer'
  | 'resume'
  | 'interview_note'
  | 'candidate_profile'
  | 'document'
  | 'manual_note'

export interface AIEvidenceItem {
  field: string
  label: string
  value: string | number | boolean | null
  source: EvidenceSource
  status: EvidenceStatus
  explanation: string
}

// ── Score Breakdown ─────────────────────────────────────────

export interface AIScoreBreakdownItem {
  criterion: string
  weight: number           // 0-1, sum of all weights = 1.0
  score: number | null     // null = not enough evidence
  confidence: AIConfidence
  evidence: AIEvidenceItem[]
  missingEvidence: string[]
  limitations: string[]
}

// ── Match Score Result ──────────────────────────────────────

export interface CandidateMatchScoreResult {
  candidateId: string
  jobId: string
  companyId: string
  overallScore: number | null   // null when too many criteria missing
  confidence: AIConfidence
  recommendation: AIRecommendation
  breakdown: AIScoreBreakdownItem[]
  redFlags: string[]            // concerning patterns (all evidence-based)
  gaps: string[]                // missing qualifications
  sensitiveFieldsExcluded: string[]
  humanOverrideRequired: true   // ALWAYS true — AI never replaces HR
  hrOverrideScore?: number | null
  hrOverrideReason?: string | null
  hrOverrideBy?: string | null
  hrOverrideAt?: string | null
  modelName?: string
  promptVersion: string
  scoringVersion: string
  createdAt: string
}

// ── HR Override ─────────────────────────────────────────────

export interface HROverride {
  scoreId: string
  overrideScore: number | null
  overrideRecommendation: AIRecommendation
  reason: string               // required
  overriddenBy: string         // user_id
  overriddenAt: string         // ISO timestamp
}

// ── AI Run Log ──────────────────────────────────────────────

export type AIRunType =
  | 'jd_builder'
  | 'resume_screening'
  | 'candidate_summary'
  | 'match_score'
  | 'interview_questions'
  | 'interview_note_summary'
  | 'offer_letter_draft'

export type AIRunStatus = 'pending' | 'completed' | 'failed'

export interface AIRun {
  id: string
  companyId: string
  jobId?: string
  candidateId?: string
  applicationId?: string
  runType: AIRunType
  status: AIRunStatus
  modelName: string
  promptVersion: string
  inputHash?: string
  outputSummary?: string
  errorMessage?: string
  createdBy?: string
  createdAt: string
  completedAt?: string
}

// ── Candidate AI Summary ────────────────────────────────────

export interface CandidateAISummary {
  id: string
  companyId: string
  candidateId: string
  applicationId?: string
  summary: string
  strengths: string[]
  gaps: string[]
  redFlags: string[]
  evidence: AIEvidenceItem[]
  sensitiveFieldsExcluded: string[]
  confidence: AIConfidence
  promptVersion: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ── Scoring Criteria Defaults ───────────────────────────────

export interface ScoringCriterion {
  key: string
  label: string
  labelTh: string
  weight: number
  description: string
  requiresEvidence: string[]   // what evidence sources are needed
}

export const DEFAULT_SCORING_CRITERIA: ScoringCriterion[] = [
  {
    key: 'skill_match',
    label: 'Job Fit / Skill Match',
    labelTh: 'ความเหมาะสมกับงาน / ทักษะ',
    weight: 0.40,
    description: 'How well candidate skills match job requirements',
    requiresEvidence: ['resume', 'application_answer'],
  },
  {
    key: 'experience',
    label: 'Proven Experience',
    labelTh: 'ประสบการณ์ที่พิสูจน์แล้ว',
    weight: 0.25,
    description: 'Relevant work experience demonstrated in CV or application',
    requiresEvidence: ['resume', 'application_answer'],
  },
  {
    key: 'trust_integrity',
    label: 'Trust & Integrity',
    labelTh: 'ความน่าเชื่อถือและความซื่อสัตย์',
    weight: 0.15,
    description: 'Evidence of reliability and honesty (must NOT infer from protected attributes)',
    requiresEvidence: ['interview_note', 'application_answer', 'manual_note'],
  },
  {
    key: 'culture_fit',
    label: 'Culture Fit',
    labelTh: 'ความเหมาะสมกับวัฒนธรรมองค์กร',
    weight: 0.10,
    description: 'Alignment with company values (requires interview or structured questionnaire)',
    requiresEvidence: ['interview_note', 'application_answer'],
  },
  {
    key: 'problem_solving',
    label: 'Problem-Solving',
    labelTh: 'การแก้ปัญหา',
    weight: 0.05,
    description: 'Analytical and problem-solving ability (requires evidence)',
    requiresEvidence: ['interview_note', 'document', 'application_answer'],
  },
  {
    key: 'communication',
    label: 'Communication',
    labelTh: 'การสื่อสาร',
    weight: 0.03,
    description: 'Written/oral communication skills from job-relevant evidence ONLY',
    requiresEvidence: ['application_answer', 'interview_note'],
  },
  {
    key: 'growth_potential',
    label: 'Growth Potential',
    labelTh: 'ศักยภาพในการเติบโต',
    weight: 0.02,
    description: 'Learning agility and career trajectory (requires explicit evidence)',
    requiresEvidence: ['resume', 'interview_note', 'manual_note'],
  },
]

// ── Sensitive Fields (must never be used in AI scoring) ─────

export const AI_SENSITIVE_FIELDS = [
  'age', 'gender', 'religion', 'race', 'marital_status',
  'nationality', 'disability', 'pregnancy', 'photo',
  'health_data', 'dependent_health_data', 'immigration_status',
  'union_status', 'salary_history',
] as const

// ── Prompt Versioning ───────────────────────────────────────

export interface AIPromptVersion {
  id: string
  companyId?: string          // null = global default
  featureKey: string          // e.g. 'match_score', 'resume_screening'
  promptVersion: string       // e.g. '1.0.0'
  promptName: string          // e.g. 'Match Score v1'
  promptTemplate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Service Input Types ─────────────────────────────────────

export interface MatchScoreInput {
  candidateId: string
  jobId: string
  applicationId?: string
  companyId: string
  createdBy?: string
}

export interface CandidateSummaryInput {
  candidateId: string
  applicationId?: string
  companyId: string
  createdBy?: string
}

export interface OverrideInput {
  scoreId: string
  overrideScore: number | null
  overrideRecommendation: AIRecommendation
  reason: string
  companyId: string
  overriddenBy: string
}
