import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  generateInterviewQuestions,
  validateQuestionInput,
  validateQuestionResult,
} from './interviewQuestionService'

describe('interviewQuestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
  })

  describe('validateQuestionInput', () => {
    it('should pass for valid input', () => {
      const { valid } = validateQuestionInput({
        jobTitle: 'Frontend Developer',
        department: 'Engineering',
      })
      expect(valid).toBe(true)
    })

    it('should fail without jobTitle', () => {
      const { valid } = validateQuestionInput({ jobTitle: '', department: 'Eng' })
      expect(valid).toBe(false)
    })

    it('should fail with questionCount > 20', () => {
      const { valid } = validateQuestionInput({
        jobTitle: 'Dev',
        department: 'Eng',
        questionCount: 25,
      })
      expect(valid).toBe(false)
    })
  })

  describe('validateQuestionResult', () => {
    it('should pass for valid result', () => {
      const result = {
        questions: [
          {
            question: 'Tell me about your React experience',
            category: 'technical' as const,
            difficulty: 'medium' as const,
            expectedAnswer: 'Should describe projects using React hooks',
            evaluationCriteria: 'Depth of React knowledge',
          },
        ],
        role: 'Frontend Developer',
        department: 'Engineering',
      }
      const { valid } = validateQuestionResult(result)
      expect(valid).toBe(true)
    })

    it('should fail with empty questions', () => {
      const result = { questions: [], role: 'Dev', department: 'Eng' }
      const { valid } = validateQuestionResult(result)
      expect(valid).toBe(false)
    })

    it('should fail when question has no evaluation criteria', () => {
      const result = {
        questions: [{
          question: 'Q1',
          category: 'technical' as const,
          difficulty: 'easy' as const,
          expectedAnswer: 'Answer',
          evaluationCriteria: '', // EMPTY
        }],
        role: 'Dev',
        department: 'Eng',
      }
      const { valid, issues } = validateQuestionResult(result)
      expect(valid).toBe(false)
      expect(issues.some(i => i.includes('evaluation criteria'))).toBe(true)
    })

    it('should fail with invalid category', () => {
      const result = {
        questions: [{
          question: 'Q1',
          category: 'invalid',
          difficulty: 'easy' as const,
          expectedAnswer: 'A',
          evaluationCriteria: 'C',
        }],
        role: 'Dev',
        department: 'Eng',
      }
      const { valid } = validateQuestionResult(result)
      expect(valid).toBe(false)
    })
  })

  describe('generateInterviewQuestions', () => {
    it('should call edge function and return questions', async () => {
      const mockResult = {
        success: true,
        data: {
          questions: [{
            question: 'Describe your experience with React',
            category: 'technical',
            difficulty: 'medium',
            expectedAnswer: 'Should describe hooks, state management',
            evaluationCriteria: 'Depth of React knowledge',
          }],
          role: 'Frontend Developer',
          department: 'Engineering',
        },
      }

      mockFetch.mockResolvedValue({ json: () => Promise.resolve(mockResult) })

      const result = await generateInterviewQuestions({
        jobTitle: 'Frontend Developer',
        department: 'Engineering',
      })

      expect(result.questions).toHaveLength(1)
      expect(result.questions[0].evaluationCriteria).toBeTruthy()
    })
  })
})
