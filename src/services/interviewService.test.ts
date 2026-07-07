import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase chain mock ──────────────────────────────────────
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'or', 'in', 'order', 'limit', 'gte']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error })
  }
  return chain
}

const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { interviewService } from './interviewService'

describe('interviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── getByApplication ──────────────────────────────────
  describe('getByApplication', () => {
    it('should return interviews for application', async () => {
      const interviews = [{ id: 'i1', application_id: 'a1', status: 'scheduled' }]
      const chain = createChain(interviews)
      mockFrom.mockReturnValue(chain)

      const result = await interviewService.getByApplication('a1')
      expect(chain.eq).toHaveBeenCalledWith('application_id', 'a1')
      expect(result).toEqual(interviews)
    })

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))

      await expect(interviewService.getByApplication('a1')).rejects.toThrow('DB error')
    })
  })

  // ─── getUpcoming ───────────────────────────────────────
  describe('getUpcoming', () => {
    it('should return upcoming scheduled interviews', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await interviewService.getUpcoming('company-1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(chain.eq).toHaveBeenCalledWith('status', 'scheduled')
    })
  })

  // ─── getPast ───────────────────────────────────────────
  describe('getPast', () => {
    it('should return past interviews with status filter', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await interviewService.getPast('company-1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(chain.in).toHaveBeenCalledWith('status', ['completed', 'cancelled', 'no_show'])
    })
  })

  // ─── getById ───────────────────────────────────────────
  describe('getById', () => {
    it('should return interview by id with company_id filter', async () => {
      const interview = { id: 'i1', company_id: 'company-1' }
      const chain = createChain(interview)
      mockFrom.mockReturnValue(chain)

      const result = await interviewService.getById('i1', 'company-1')
      expect(chain.eq).toHaveBeenCalledWith('id', 'i1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(result).toEqual(interview)
    })
  })

  // ─── create ────────────────────────────────────────────
  describe('create', () => {
    it('should create interview', async () => {
      const input = { application_id: 'a1', company_id: 'c1', scheduled_at: '2024-06-01T10:00:00Z' }
      const created = { id: 'i1', ...input }
      const chain = createChain(created)
      mockFrom.mockReturnValue(chain)

      const result = await interviewService.create(input)
      expect(chain.insert).toHaveBeenCalledWith(input)
      expect(result).toEqual(created)
    })

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Insert failed')))

      await expect(interviewService.create({ application_id: 'a1', company_id: 'c1', scheduled_at: '' })).rejects.toThrow('Insert failed')
    })
  })

  // ─── update ────────────────────────────────────────────
  describe('update', () => {
    it('should update interview with company_id filter', async () => {
      const updated = { id: 'i1', feedback: 'Good' }
      const chain = createChain(updated)
      mockFrom.mockReturnValue(chain)

      const result = await interviewService.update('i1', { feedback: 'Good' }, 'company-1')
      expect(chain.update).toHaveBeenCalledWith({ feedback: 'Good' })
      expect(chain.eq).toHaveBeenCalledWith('id', 'i1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(result).toEqual(updated)
    })
  })

  // ─── reschedule ────────────────────────────────────────
  describe('reschedule', () => {
    it('should reschedule interview with new time', async () => {
      const rescheduled = { id: 'i1', status: 'rescheduled', scheduled_at: '2024-07-01T10:00:00Z' }
      const chain = createChain(rescheduled)
      mockFrom.mockReturnValue(chain)

      const result = await interviewService.reschedule('i1', { scheduled_at: '2024-07-01T10:00:00Z' }, 'company-1')
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
        scheduled_at: '2024-07-01T10:00:00Z',
        status: 'rescheduled',
      }))
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(result).toEqual(rescheduled)
    })
  })

  // ─── cancel ────────────────────────────────────────────
  describe('cancel', () => {
    it('should cancel interview and create audit log', async () => {
      const cancelled = { id: 'i1', status: 'cancelled' }
      // First call: update interview
      // Second call: insert audit log
      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        callCount++
        if (table === 'interviews') return createChain(cancelled)
        if (table === 'audit_logs') return createChain({ id: 'log1' })
        return createChain(null)
      })

      const result = await interviewService.cancel('i1', { reason: 'Candidate unavailable', cancelled_by: 'user-1' }, 'company-1')
      expect(result).toEqual(cancelled)
      expect(mockFrom).toHaveBeenCalledWith('audit_logs')
    })
  })

  // ─── markNoShow ────────────────────────────────────────
  describe('markNoShow', () => {
    it('should mark interview as no_show', async () => {
      const noShow = { id: 'i1', status: 'no_show' }
      const chain = createChain(noShow)
      mockFrom.mockReturnValue(chain)

      const result = await interviewService.markNoShow('i1', 'company-1')
      expect(chain.update).toHaveBeenCalledWith({ status: 'no_show' })
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(result).toEqual(noShow)
    })
  })

  // ─── submitScorecard ───────────────────────────────────
  describe('submitScorecard', () => {
    it('should insert scorecard with company_id', async () => {
      const scorecard = {
        id: 'sc1',
        interview_id: 'i1',
        company_id: 'company-1',
        evaluator_id: 'user-1',
        criteria: [{ criterion: 'Technical', score: 4, comment: 'Good' }],
        overall_rating: 4,
        recommendation: 'hire',
      }
      const chain = createChain(scorecard)
      mockFrom.mockReturnValue(chain)

      const result = await interviewService.submitScorecard('i1', 'company-1', 'user-1', {
        criteria: [{ criterion: 'Technical', score: 4, comment: 'Good' }],
        overall_rating: 4,
        recommendation: 'hire',
      })
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        interview_id: 'i1',
        company_id: 'company-1',
        evaluator_id: 'user-1',
      }))
      expect(result).toEqual(scorecard)
    })
  })

  // ─── getScorecard ──────────────────────────────────────
  describe('getScorecard', () => {
    it('should return scorecard for interview', async () => {
      const scorecard = { id: 'sc1', interview_id: 'i1', overall_rating: 4 }
      const chain = createChain(scorecard)
      mockFrom.mockReturnValue(chain)

      const result = await interviewService.getScorecard('i1', 'company-1')
      expect(chain.eq).toHaveBeenCalledWith('interview_id', 'i1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(result).toEqual(scorecard)
    })
  })

  // ─── delete ────────────────────────────────────────────
  describe('delete', () => {
    it('should delete interview with company_id filter', async () => {
      const chain = createChain(null)
      mockFrom.mockReturnValue(chain)

      await interviewService.delete('i1', 'company-1')
      expect(chain.delete).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenCalledWith('id', 'i1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
    })
  })
})
