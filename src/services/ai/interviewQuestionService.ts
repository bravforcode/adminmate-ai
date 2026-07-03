import { supabase } from '../../lib/supabase'

/* ============================================================
   Interview Question Service — AI-powered question generation
   
   Uses Gemini AI via edge function.
   Generates role-specific, evidence-based questions.
   ============================================================ */

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Interview question generation failed')
  return json
}

// ── Types ───────────────────────────────────────────────────

export interface InterviewQuestionInput {
  jobTitle: string
  department: string
  experienceLevel?: string
  skills?: string[]
  language?: 'th' | 'en' | 'vi' | 'id'
  questionCount?: number
}

export interface InterviewQuestion {
  question: string
  category: 'technical' | 'behavioral' | 'situational' | 'culture_fit'
  difficulty: 'easy' | 'medium' | 'hard'
  expectedAnswer: string
  evaluationCriteria: string
}

export interface InterviewQuestionResult {
  questions: InterviewQuestion[]
  role: string
  department: string
}

// ── Validation ──────────────────────────────────────────────

export function validateQuestionInput(input: InterviewQuestionInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!input.jobTitle || typeof input.jobTitle !== 'string') {
    errors.push('jobTitle is required')
  }
  if (!input.department || typeof input.department !== 'string') {
    errors.push('department is required')
  }
  if (input.questionCount && (input.questionCount < 1 || input.questionCount > 20)) {
    errors.push('questionCount must be 1-20')
  }

  return { valid: errors.length === 0, errors }
}

export function validateQuestionResult(result: InterviewQuestionResult): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
    issues.push('Missing or empty questions array')
    return { valid: false, issues }
  }

  for (const q of result.questions) {
    if (!q.question || q.question.trim().length === 0) {
      issues.push('Empty question text')
    }
    if (!q.category || !['technical', 'behavioral', 'situational', 'culture_fit'].includes(q.category)) {
      issues.push(`Invalid category: ${q.category}`)
    }
    if (!q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
      issues.push(`Invalid difficulty: ${q.difficulty}`)
    }
    if (!q.evaluationCriteria || q.evaluationCriteria.trim().length === 0) {
      issues.push(`Missing evaluation criteria for: "${q.question}"`)
    }
  }

  return { valid: issues.length === 0, issues }
}

// ── API ─────────────────────────────────────────────────────

/**
 * Generate interview questions for a job position.
 * Returns categorized questions with evaluation criteria.
 */
export async function generateInterviewQuestions(input: InterviewQuestionInput): Promise<InterviewQuestionResult> {
  const validation = validateQuestionInput(input)
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`)
  }

  const result = await invokeFunction<{ data: InterviewQuestionResult }>('generate-interview-questions', {
    job_title: input.jobTitle,
    department: input.department,
    experience_level: input.experienceLevel,
    skills: input.skills,
    language: input.language,
    question_count: input.questionCount ?? 10,
  })

  // Validate AI output
  const outputValidation = validateQuestionResult(result.data)
  if (!outputValidation.valid) {
    console.warn('[interviewQuestionService] Output validation issues:', outputValidation.issues)
  }

  return result.data
}
