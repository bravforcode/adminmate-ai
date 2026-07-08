import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase chain mock ──────────────────────────────────────
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'or', 'in', 'order', 'limit']
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

vi.mock('./permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

vi.mock('../lib/subscriptions', () => ({
  checkLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 9, limit: 10 }),
}))

import { jobService } from './jobService'

describe('jobService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── getAll ─────────────────────────────────────────────
  describe('getAll', () => {
    it('should return all jobs for company', async () => {
      const jobs = [{ id: '1', title: 'Engineer', company_id: 'c1' }]
      mockFrom.mockReturnValue(createChain(jobs))

      const result = await jobService.getAll('c1')
      expect(mockFrom).toHaveBeenCalledWith('jobs')
      expect(result).toEqual(jobs)
    })

    it('should filter by status', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await jobService.getAll('c1', { status: 'published' })
      expect(chain.eq).toHaveBeenCalledWith('status', 'published')
    })

    it('should search by title/department', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await jobService.getAll('c1', { search: 'engineer' })
      expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('engineer'))
    })

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))

      await expect(jobService.getAll('c1')).rejects.toThrow('DB error')
    })
  })

  // ─── getById ───────────────────────────────────────────
  describe('getById', () => {
    it('should return job by id', async () => {
      const job = { id: 'j1', title: 'Engineer' }
      const chain = createChain(job)
      mockFrom.mockReturnValue(chain)

      const result = await jobService.getById('j1')
      expect(chain.eq).toHaveBeenCalledWith('id', 'j1')
      expect(chain.single).toHaveBeenCalled()
      expect(result).toEqual(job)
    })

    it('should throw when not found', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Not found')))

      await expect(jobService.getById('missing')).rejects.toThrow('Not found')
    })
  })

  // ─── create ────────────────────────────────────────────
  describe('create', () => {
    it('should create job with permission and limit checks', async () => {
      const job = { title: 'New Job', company_id: 'c1' }
      const created = { id: 'j1', ...job }
      // Return different results per .from() call: company lookup → count → insert
      mockFrom
        .mockReturnValueOnce(createChain({ subscription_tier: 'pro' }))
        .mockReturnValueOnce(createChain(null).then = undefined as any)
        .mockReturnValueOnce(createChain(created))

      const countChain = createChain(null)
      const selectSpy = vi.fn(() => countChain)
      countChain.select = selectSpy

      const companyChain = createChain({ subscription_tier: 'pro' })
      const insertChain = createChain(created)

      mockFrom
        .mockReset()
        .mockReturnValueOnce(companyChain)
        .mockReturnValueOnce(countChain)
        .mockReturnValueOnce(insertChain)

      const result = await jobService.create(job)
      expect(insertChain.insert).toHaveBeenCalledWith(job)
      expect(result).toEqual(created)
    })

    it('should throw when job limit exceeded', async () => {
      const { checkLimit } = await import('../lib/subscriptions')
      vi.mocked(checkLimit).mockReturnValueOnce({ allowed: false, remaining: 0, limit: 1 })

      const job = { title: 'New Job', company_id: 'c1' }
      mockFrom
        .mockReturnValueOnce(createChain({ subscription_tier: 'free' }))
        .mockReturnValueOnce(createChain(null))

      await expect(jobService.create(job)).rejects.toThrow('Job limit reached for free plan')
    })

    it('should throw on insert error', async () => {
      mockFrom
        .mockReturnValueOnce(createChain({ subscription_tier: 'pro' }))
        .mockReturnValueOnce(createChain(null))
        .mockReturnValueOnce(createChain(null, new Error('Insert failed')))

      await expect(jobService.create({ title: 'X', company_id: 'c1' })).rejects.toThrow('Insert failed')
    })
  })

  // ─── update ────────────────────────────────────────────
  describe('update', () => {
    it('should update job with permission check', async () => {
      const updated = { id: 'j1', title: 'Updated' }
      const chain = createChain(updated)
      mockFrom.mockReturnValue(chain)

      const result = await jobService.update('j1', { title: 'Updated' })
      expect(chain.update).toHaveBeenCalledWith({ title: 'Updated' })
      expect(chain.eq).toHaveBeenCalledWith('id', 'j1')
      expect(result).toEqual(updated)
    })
  })

  // ─── delete ────────────────────────────────────────────
  describe('delete', () => {
    it('should delete job with company_id filter', async () => {
      const chain = createChain(null)
      mockFrom.mockReturnValue(chain)

      await jobService.delete('j1', 'c1')
      expect(chain.delete).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenCalledWith('id', 'j1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'c1')
    })
  })

  // ─── updateStatus ──────────────────────────────────────
  describe('updateStatus', () => {
    it('should update status via update method', async () => {
      const chain = createChain({ id: 'j1', status: 'published' })
      mockFrom.mockReturnValue(chain)

      const result = await jobService.updateStatus('j1', 'published')
      expect(chain.update).toHaveBeenCalledWith({ status: 'published' })
    })
  })

  // ─── publish ───────────────────────────────────────────
  describe('publish', () => {
    it('should set status to published with timestamp', async () => {
      const chain = createChain({ id: 'j1', status: 'published' })
      mockFrom.mockReturnValue(chain)

      await jobService.publish('j1')
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }))
    })
  })

  // ─── close ─────────────────────────────────────────────
  describe('close', () => {
    it('should set status to closed with timestamp', async () => {
      const chain = createChain({ id: 'j1', status: 'closed' })
      mockFrom.mockReturnValue(chain)

      await jobService.close('j1')
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'closed' }))
    })
  })

  // ─── generateShareLink ─────────────────────────────────
  describe('generateShareLink', () => {
    it('should generate share link with token', async () => {
      const chain = createChain(null)
      mockFrom.mockReturnValue(chain)

      const link = await jobService.generateShareLink('j1', 'c1')
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ public_token: expect.any(String) }))
      expect(chain.eq).toHaveBeenCalledWith('id', 'j1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'c1')
      expect(link).toContain('/careers/apply/')
    })
  })
})
