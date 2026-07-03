import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock supabase ───────────────────────────────────────────

function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: Function, reject?: Function) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error })
  }
  return chain
}

const mockFrom = vi.fn()
const mockGetSession = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getSession: () => mockGetSession() },
  },
}))

// ── Mock fetch ──────────────────────────────────────────────

const mockFetch = vi.fn()
global.fetch = mockFetch

// ── Import after mocks ──────────────────────────────────────

import {
  calculateMatchScore,
  getMatchScores,
  getMatchScoreForJob,
  overrideMatchScore,
  validateMatchScoreResult,
  sanitizeCandidateData,
  SCORING_CRITERIA,
  SENSITIVE_FIELDS,
} from './matchScoreService'

describe('matchScoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
  })

  // ── SCORING_CRITERIA ──────────────────────────────────────

  describe('SCORING_CRITERIA', () => {
    it('should have weights that sum to ~1.0', () => {
      const total = SCORING_CRITERIA.reduce((sum, c) => sum + c.weight, 0)
      expect(total).toBeCloseTo(1.0, 2)
    })

    it('should include all required criteria', () => {
      const keys = SCORING_CRITERIA.map(c => c.key)
      expect(keys).toContain('skill_match')
      expect(keys).toContain('experience')
      expect(keys).toContain('trust_integrity')
      expect(keys).toContain('culture_fit')
      expect(keys).toContain('problem_solving')
      expect(keys).toContain('communication')
      expect(keys).toContain('growth_potential')
    })

    it('should have skill_match as highest weight (40%)', () => {
      const skillMatch = SCORING_CRITERIA.find(c => c.key === 'skill_match')
      expect(skillMatch?.weight).toBe(0.40)
    })

    it('should NOT have hardcoded scores — only weights', () => {
      for (const criterion of SCORING_CRITERIA) {
        expect(criterion).not.toHaveProperty('defaultScore')
        expect(criterion).not.toHaveProperty('fallbackScore')
        expect(criterion).not.toHaveProperty('score')
      }
    })
  })

  // ── SENSITIVE_FIELDS ──────────────────────────────────────

  describe('SENSITIVE_FIELDS', () => {
    it('should include age, gender, religion, marital_status', () => {
      expect(SENSITIVE_FIELDS).toContain('age')
      expect(SENSITIVE_FIELDS).toContain('gender')
      expect(SENSITIVE_FIELDS).toContain('religion')
      expect(SENSITIVE_FIELDS).toContain('marital_status')
    })

    it('should include nationality, disability, pregnancy', () => {
      expect(SENSITIVE_FIELDS).toContain('nationality')
      expect(SENSITIVE_FIELDS).toContain('disability')
      expect(SENSITIVE_FIELDS).toContain('pregnancy')
    })
  })

  // ── sanitizeCandidateData ─────────────────────────────────

  describe('sanitizeCandidateData', () => {
    it('should remove sensitive fields from data', () => {
      const data = {
        full_name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        gender: 'male',
        religion: 'buddhist',
        marital_status: 'single',
        experience_years: 5,
      }

      const { sanitized, excluded } = sanitizeCandidateData(data)

      expect(sanitized).not.toHaveProperty('age')
      expect(sanitized).not.toHaveProperty('gender')
      expect(sanitized).not.toHaveProperty('religion')
      expect(sanitized).not.toHaveProperty('marital_status')
      expect(sanitized).toHaveProperty('full_name')
      expect(sanitized).toHaveProperty('email')
      expect(sanitized).toHaveProperty('experience_years')
      expect(excluded).toContain('age')
      expect(excluded).toContain('gender')
    })

    it('should return empty excluded list when no sensitive fields present', () => {
      const data = { full_name: 'John', email: 'john@example.com' }
      const { sanitized, excluded } = sanitizeCandidateData(data)
      expect(excluded).toHaveLength(0)
      expect(sanitized).toEqual(data)
    })

    it('should handle empty data', () => {
      const { sanitized, excluded } = sanitizeCandidateData({})
      expect(sanitized).toEqual({})
      expect(excluded).toHaveLength(0)
    })
  })

  // ── validateMatchScoreResult ──────────────────────────────

  describe('validateMatchScoreResult', () => {
    it('should pass for valid result with evidence', () => {
      const result = {
        candidateId: 'c1',
        jobId: 'j1',
        companyId: 'co1',
        overallScore: 75,
        confidence: 'medium' as const,
        recommendation: 'review' as const,
        breakdown: [
          {
            criterion: 'skill_match',
            weight: 0.40,
            score: 80,
            confidence: 'high' as const,
            evidence: [{ field: 'skills', label: 'Skills', value: 'React, TypeScript', source: 'resume' as const, status: 'supported' as const, explanation: 'Listed in CV' }],
            missingEvidence: [],
            limitations: [],
          },
          {
            criterion: 'experience',
            weight: 0.25,
            score: 70,
            confidence: 'medium' as const,
            evidence: [{ field: 'experience_years', label: 'Experience', value: 5, source: 'resume' as const, status: 'supported' as const, explanation: '5 years in CV' }],
            missingEvidence: [],
            limitations: [],
          },
          {
            criterion: 'communication',
            weight: 0.03,
            score: 65,
            confidence: 'medium' as const,
            evidence: [{ field: 'cover_letter', label: 'Cover Letter', value: 'Well written', source: 'application_answer' as const, status: 'supported' as const, explanation: 'Good written communication' }],
            missingEvidence: [],
            limitations: [],
          },
        ],
        redFlags: [],
        gaps: [],
        sensitiveFieldsExcluded: [],
        humanOverrideRequired: true as const,
        promptVersion: '1.0.0',
        scoringVersion: '1.0.0',
        createdAt: new Date().toISOString(),
      }

      const { valid, issues } = validateMatchScoreResult(result)
      expect(valid).toBe(true)
      expect(issues).toHaveLength(0)
    })

    it('should FAIL when score has no evidence (fabricated)', () => {
      const result = {
        candidateId: 'c1',
        jobId: 'j1',
        companyId: 'co1',
        overallScore: 75,
        confidence: 'medium' as const,
        recommendation: 'review' as const,
        breakdown: [
          {
            criterion: 'culture_fit',
            weight: 0.10,
            score: 75, // FABRICATED — no evidence
            confidence: 'medium' as const,
            evidence: [], // EMPTY
            missingEvidence: [],
            limitations: [],
          },
        ],
        redFlags: [],
        gaps: [],
        sensitiveFieldsExcluded: [],
        humanOverrideRequired: true as const,
        promptVersion: '1.0.0',
        scoringVersion: '1.0.0',
        createdAt: new Date().toISOString(),
      }

      const { valid, issues } = validateMatchScoreResult(result)
      expect(valid).toBe(false)
      expect(issues.some(i => i.includes('no evidence'))).toBe(true)
    })

    it('should FAIL when overallScore is not null but fewer than 3 criteria scored', () => {
      const result = {
        candidateId: 'c1',
        jobId: 'j1',
        companyId: 'co1',
        overallScore: 50, // Should be null
        confidence: 'low' as const,
        recommendation: 'review' as const,
        breakdown: [
          {
            criterion: 'skill_match',
            weight: 0.40,
            score: 50,
            confidence: 'low' as const,
            evidence: [{ field: 'skills', label: 'Skills', value: null, source: 'resume' as const, status: 'supported' as const, explanation: 'test' }],
            missingEvidence: [],
            limitations: [],
          },
          // Only 1 criterion scored (< 3)
        ],
        redFlags: [],
        gaps: [],
        sensitiveFieldsExcluded: [],
        humanOverrideRequired: true as const,
        promptVersion: '1.0.0',
        scoringVersion: '1.0.0',
        createdAt: new Date().toISOString(),
      }

      const { valid, issues } = validateMatchScoreResult(result)
      expect(valid).toBe(false)
      expect(issues.some(i => i.includes('< 3'))).toBe(true)
    })

    it('should FAIL when humanOverrideRequired is not true', () => {
      const result = {
        candidateId: 'c1',
        jobId: 'j1',
        companyId: 'co1',
        overallScore: null,
        confidence: 'low' as const,
        recommendation: 'not_enough_evidence' as const,
        breakdown: [],
        redFlags: [],
        gaps: [],
        sensitiveFieldsExcluded: [],
        humanOverrideRequired: false as any, // WRONG
        promptVersion: '1.0.0',
        scoringVersion: '1.0.0',
        createdAt: new Date().toISOString(),
      }

      const { valid, issues } = validateMatchScoreResult(result)
      expect(valid).toBe(false)
      expect(issues.some(i => i.includes('humanOverrideRequired'))).toBe(true)
    })

    it('should accept null overallScore for not_enough_evidence', () => {
      const result = {
        candidateId: 'c1',
        jobId: 'j1',
        companyId: 'co1',
        overallScore: null, // Correct when not enough data
        confidence: 'low' as const,
        recommendation: 'not_enough_evidence' as const,
        breakdown: [
          { criterion: 'skill_match', weight: 0.40, score: null, confidence: 'low' as const, evidence: [], missingEvidence: ['No resume provided'], limitations: [] },
          { criterion: 'experience', weight: 0.25, score: null, confidence: 'low' as const, evidence: [], missingEvidence: ['No work history'], limitations: [] },
          { criterion: 'culture_fit', weight: 0.10, score: null, confidence: 'low' as const, evidence: [], missingEvidence: ['No interview'], limitations: [] },
        ],
        redFlags: [],
        gaps: ['No resume', 'No work history'],
        sensitiveFieldsExcluded: [],
        humanOverrideRequired: true as const,
        promptVersion: '1.0.0',
        scoringVersion: '1.0.0',
        createdAt: new Date().toISOString(),
      }

      const { valid, issues } = validateMatchScoreResult(result)
      expect(valid).toBe(true)
    })
  })

  // ── calculateMatchScore ───────────────────────────────────

  describe('calculateMatchScore', () => {
    it('should call edge function and return result', async () => {
      const mockResult = {
        success: true,
        result: {
          candidateId: 'c1',
          jobId: 'j1',
          companyId: 'co1',
          overallScore: 72,
          confidence: 'medium',
          recommendation: 'review',
          breakdown: [
            {
              criterion: 'skill_match',
              weight: 0.40,
              score: 80,
              confidence: 'high',
              evidence: [{ field: 'skills', label: 'Skills', value: 'React', source: 'resume', status: 'supported', explanation: 'Listed' }],
              missingEvidence: [],
              limitations: [],
            },
          ],
          redFlags: [],
          gaps: [],
          sensitiveFieldsExcluded: ['age'],
          humanOverrideRequired: true,
          promptVersion: '1.0.0',
          scoringVersion: '1.0.0',
          createdAt: new Date().toISOString(),
        },
      }

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResult),
      })

      const result = await calculateMatchScore({
        candidateId: 'c1',
        jobId: 'j1',
        companyId: 'co1',
      })

      expect(result.candidateId).toBe('c1')
      expect(result.humanOverrideRequired).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('candidate-match-score'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should throw on edge function error', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ success: false, error: 'AI provider not configured' }),
      })

      await expect(
        calculateMatchScore({ candidateId: 'c1', jobId: 'j1', companyId: 'co1' })
      ).rejects.toThrow('AI provider not configured')
    })
  })

  // ── overrideMatchScore ────────────────────────────────────

  describe('overrideMatchScore', () => {
    it('should require reason with minimum 3 characters', async () => {
      await expect(
        overrideMatchScore({
          scoreId: 's1',
          overrideScore: 85,
          overrideRecommendation: 'shortlist',
          reason: 'ab', // Too short
          companyId: 'co1',
          overriddenBy: 'u1',
        })
      ).rejects.toThrow('Override reason is required')
    })

    it('should update score and create audit log', async () => {
      const chain = createChain({ id: 's1' })
      mockFrom.mockReturnValue(chain)

      const auditChain = createChain({ id: 'log1' })
      mockFrom.mockReturnValueOnce(chain).mockReturnValueOnce(auditChain)

      const result = await overrideMatchScore({
        scoreId: 's1',
        overrideScore: 85,
        overrideRecommendation: 'shortlist',
        reason: 'Strong interview performance demonstrated leadership skills',
        companyId: 'co1',
        overriddenBy: 'u1',
      })

      expect(result.scoreId).toBe('s1')
      expect(result.overrideScore).toBe(85)
      expect(result.reason).toBe('Strong interview performance demonstrated leadership skills')
    })
  })
})
