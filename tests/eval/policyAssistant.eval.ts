import { describe, it, expect } from 'vitest'
import { queryPolicyAssistant, type PolicyQuery } from '../../src/services/ai/policyAssistantService'

/**
 * Eval harness for AI Policy Assistant.
 * Tests that the assistant answers policy questions with relevant content.
 *
 * Run: npx vitest run tests/eval/policyAssistant.eval.ts
 *
 * NOTE: These tests require a configured Supabase + Gemini environment.
 * Skip in CI if GEMINI_API_KEY is not set.
 */

const skipIfNoApiKey = !!import.meta.env.VITE_GEMINI_API_KEY

describe.skipIf(!skipIfNoApiKey)('Policy Assistant Eval', () => {
  const baseQuery: Omit<PolicyQuery, 'question'> = {
    companyId: process.env.E2E_TEST_COMPANY_ID || 'test-company-id',
    userId: process.env.E2E_TEST_USER_ID || 'test-user-id',
    userRole: 'employee',
  }

  const testCases = [
    {
      question: 'How many annual leave days am I entitled to?',
      expectedKeywords: ['annual', 'leave', 'days', 'entitled'],
      category: 'leave',
    },
    {
      question: 'What is the sick leave policy?',
      expectedKeywords: ['sick', 'leave', 'policy', 'medical'],
      category: 'leave',
    },
    {
      question: 'How do I request time off?',
      expectedKeywords: ['request', 'time off', 'apply', 'submit'],
      category: 'leave',
    },
    {
      question: 'What benefits am I eligible for?',
      expectedKeywords: ['benefits', 'eligible', 'insurance', 'provident'],
      category: 'benefits',
    },
    {
      question: 'What is the company dress code?',
      expectedKeywords: ['dress', 'code', 'attire', 'clothing'],
      category: 'conduct',
    },
    {
      question: 'How does overtime work?',
      expectedKeywords: ['overtime', 'ot', 'hours', 'rate'],
      category: 'compensation',
    },
  ]

  it('should answer policy questions with relevant content', async () => {
    for (const tc of testCases) {
      const result = await queryPolicyAssistant({
        ...baseQuery,
        question: tc.question,
      })

      expect(result.answer).toBeDefined()
      expect(result.answer.length).toBeGreaterThan(0)

      // Should contain at least one expected keyword
      const hasKeyword = tc.expectedKeywords.some(kw =>
        result.answer.toLowerCase().includes(kw)
      )
      expect(hasKeyword).toBe(true)
    }
  })

  it('should respect role-based access', async () => {
    const result = await queryPolicyAssistant({
      ...baseQuery,
      question: 'What is the executive compensation policy?',
      userRole: 'employee', // Should NOT see exec-level docs
    })

    // Should not return exec-level information
    expect(result.sources.every(s => s.category !== 'executive')).toBe(true)
  })

  it('should hand off when confidence is low', async () => {
    const result = await queryPolicyAssistant({
      ...baseQuery,
      question: 'xyzzy foobarbaz nocontext',
    })

    expect(result.handoffNeeded).toBe(true)
    expect(result.confidence).toBeLessThan(0.5)
  })

  it('should return sources for answerable questions', async () => {
    const result = await queryPolicyAssistant({
      ...baseQuery,
      question: 'What is the annual leave policy?',
    })

    if (result.confidence > 0.3) {
      expect(result.sources.length).toBeGreaterThan(0)
      expect(result.sources[0].title).toBeDefined()
      expect(result.sources[0].category).toBeDefined()
    }
  })

  it('should handle Thai language questions', async () => {
    const result = await queryPolicyAssistant({
      ...baseQuery,
      question: 'นโยบายลาพักร้อนมีกี่วัน',
    })

    expect(result.answer).toBeDefined()
    expect(result.answer.length).toBeGreaterThan(0)
  })
})
