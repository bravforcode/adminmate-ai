import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
  },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  screenResume,
  validateScreeningInput,
  validateScreeningResult,
} from './resumeScreeningService'

describe('resumeScreeningService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
  })

  describe('validateScreeningInput', () => {
    it('should pass for valid input', () => {
      const { valid, errors } = validateScreeningInput({
        applicationId: 'a1',
        jobId: 'j1',
        cvDocumentId: 'cv1',
      })
      expect(valid).toBe(true)
    })

    it('should fail without applicationId', () => {
      const { valid } = validateScreeningInput({
        applicationId: '',
        jobId: 'j1',
        cvDocumentId: 'cv1',
      })
      expect(valid).toBe(false)
    })

    it('should fail without jobId', () => {
      const { valid } = validateScreeningInput({
        applicationId: 'a1',
        jobId: '',
        cvDocumentId: 'cv1',
      })
      expect(valid).toBe(false)
    })
  })

  describe('validateScreeningResult', () => {
    it('should pass for valid result with evidence', () => {
      const result = {
        match_score: 75,
        skill_match: [
          { skill: 'React', score: 80, evidence: 'Listed in CV with 3 years experience' },
        ],
        experience_match: 'Strong match',
        missing_skills: ['Docker'],
        suggested_interview_questions: ['Tell me about your React experience'],
        overall_summary: 'Strong frontend developer',
        strengths: ['React expertise'],
        concerns: ['No Docker experience'],
      }
      const { valid, issues } = validateScreeningResult(result)
      expect(valid).toBe(true)
    })

    it('should FAIL when skill has no evidence', () => {
      const result = {
        match_score: 75,
        skill_match: [
          { skill: 'React', score: 80, evidence: '' }, // EMPTY evidence
        ],
        experience_match: 'Match',
        missing_skills: [],
        suggested_interview_questions: [],
        overall_summary: 'Summary',
        strengths: [],
        concerns: [],
      }
      const { valid, issues } = validateScreeningResult(result)
      expect(valid).toBe(false)
      expect(issues.some(i => i.includes('no evidence'))).toBe(true)
    })

    it('should FAIL when match_score out of range', () => {
      const result = {
        match_score: 150, // INVALID
        skill_match: [],
        experience_match: '',
        missing_skills: [],
        suggested_interview_questions: [],
        overall_summary: 'Summary',
        strengths: [],
        concerns: [],
      }
      const { valid, issues } = validateScreeningResult(result)
      expect(valid).toBe(false)
      expect(issues.some(i => i.includes('0-100'))).toBe(true)
    })

    it('should FAIL when overall_summary missing', () => {
      const result = {
        match_score: 50,
        skill_match: [],
        experience_match: '',
        missing_skills: [],
        suggested_interview_questions: [],
        overall_summary: '',
        strengths: [],
        concerns: [],
      }
      const { valid, issues } = validateScreeningResult(result)
      expect(valid).toBe(false)
      expect(issues.some(i => i.includes('overall_summary'))).toBe(true)
    })
  })

  describe('screenResume', () => {
    it('should call edge function and return result', async () => {
      const mockResult = {
        success: true,
        data: {
          match_score: 72,
          skill_match: [{ skill: 'React', score: 80, evidence: 'In CV' }],
          experience_match: 'Good',
          missing_skills: [],
          suggested_interview_questions: ['Q1'],
          overall_summary: 'Strong candidate',
          strengths: ['React'],
          concerns: [],
        },
      }

      mockFetch.mockResolvedValue({ json: () => Promise.resolve(mockResult) })

      const result = await screenResume({
        applicationId: 'a1',
        jobId: 'j1',
        cvDocumentId: 'cv1',
      })

      expect(result.match_score).toBe(72)
      expect(result.skill_match[0].evidence).toBe('In CV')
    })

    it('should throw on invalid input', async () => {
      await expect(
        screenResume({ applicationId: '', jobId: '', cvDocumentId: '' })
      ).rejects.toThrow('Invalid input')
    })
  })
})
