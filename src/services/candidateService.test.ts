import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase chain mock ──────────────────────────────────────
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'or', 'in', 'order', 'limit', 'lt', 'gte']
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
const mockRpc = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { candidateService } from './candidateService'

describe('candidateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── getAll ─────────────────────────────────────────────
  describe('getAll', () => {
    it('should return paginated candidates with company_id filter', async () => {
      const candidates = [
        { id: '1', full_name: 'Alice', created_at: '2024-01-01' },
        { id: '2', full_name: 'Bob', created_at: '2024-01-02' },
      ]
      mockFrom.mockReturnValue(createChain(candidates))

      const result = await candidateService.getAll('company-1')
      expect(mockFrom).toHaveBeenCalledWith('candidates')
      expect(result.data).toEqual(candidates)
      expect(result.hasMore).toBe(false)
    })

    it('should apply cursor pagination', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await candidateService.getAll('company-1', { cursor: '2024-01-01', limit: 10 })
      expect(chain.lt).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(chain.limit).toHaveBeenCalledWith(11) // limit + 1
    })

    it('should detect hasMore when results exceed limit', async () => {
      const items = Array.from({ length: 6 }, (_, i) => ({ id: String(i), created_at: `2024-01-0${i}` }))
      mockFrom.mockReturnValue(createChain(items))

      const result = await candidateService.getAll('company-1', { limit: 5 })
      expect(result.hasMore).toBe(true)
      expect(result.data.length).toBe(5)
      expect(result.cursor).toBeTruthy()
    })

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))

      await expect(candidateService.getAll('company-1')).rejects.toThrow('DB error')
    })
  })

  // ─── search ────────────────────────────────────────────
  describe('search', () => {
    it('should search by name/email/position with ilike', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await candidateService.search('company-1', { search: 'alice' })
      expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('alice'))
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
    })

    it('should filter by source', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await candidateService.search('company-1', { source: 'linkedin' })
      expect(chain.eq).toHaveBeenCalledWith('source', 'linkedin')
    })

    it('should not call or() when no search term', async () => {
      const chain = createChain([])
      mockFrom.mockReturnValue(chain)

      await candidateService.search('company-1', {})
      expect(chain.or).not.toHaveBeenCalled()
    })
  })

  // ─── getById ───────────────────────────────────────────
  describe('getById', () => {
    it('should return candidate with company_id filter', async () => {
      const candidate = { id: 'c1', full_name: 'Alice', company_id: 'company-1' }
      const chain = createChain(candidate)
      mockFrom.mockReturnValue(chain)

      const result = await candidateService.getById('c1', 'company-1')
      expect(result).toEqual(candidate)
      expect(chain.eq).toHaveBeenCalledWith('id', 'c1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(chain.single).toHaveBeenCalled()
    })

    it('should throw when not found', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Not found')))

      await expect(candidateService.getById('missing', 'company-1')).rejects.toThrow('Not found')
    })
  })

  // ─── create ────────────────────────────────────────────
  describe('create', () => {
    it('should create candidate with input', async () => {
      const input = { full_name: 'New Candidate', company_id: 'company-1', email: 'new@example.com' }
      const created = { id: 'new1', ...input }
      const chain = createChain(created)
      mockFrom.mockReturnValue(chain)

      const result = await candidateService.create(input)
      expect(chain.insert).toHaveBeenCalledWith(input)
      expect(result).toEqual(created)
    })

    it('should throw on create error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Insert failed')))

      await expect(candidateService.create({ full_name: 'X', company_id: 'c1' })).rejects.toThrow('Insert failed')
    })
  })

  // ─── update ────────────────────────────────────────────
  describe('update', () => {
    it('should update candidate by id', async () => {
      const updated = { id: 'c1', full_name: 'Updated' }
      const chain = createChain(updated)
      mockFrom.mockReturnValue(chain)

      const result = await candidateService.update('c1', { full_name: 'Updated' })
      expect(chain.update).toHaveBeenCalledWith({ full_name: 'Updated' })
      expect(chain.eq).toHaveBeenCalledWith('id', 'c1')
      expect(result).toEqual(updated)
    })
  })

  // ─── delete ────────────────────────────────────────────
  describe('delete', () => {
    it('should delete candidate with company_id filter', async () => {
      const chain = createChain(null)
      mockFrom.mockReturnValue(chain)

      await candidateService.delete('c1', 'company-1')
      expect(chain.delete).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenCalledWith('id', 'c1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
    })

    it('should throw on delete error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Delete failed')))

      await expect(candidateService.delete('c1', 'company-1')).rejects.toThrow('Delete failed')
    })
  })

  // ─── bulkUpdateStatus ──────────────────────────────────
  describe('bulkUpdateStatus', () => {
    it('should update multiple candidates status', async () => {
      const chain = createChain(null)
      mockFrom.mockReturnValue(chain)

      await candidateService.bulkUpdateStatus(['c1', 'c2'], 'archived', 'company-1')
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'archived' }))
      expect(chain.in).toHaveBeenCalledWith('id', ['c1', 'c2'])
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
    })

    it('should do nothing for empty ids', async () => {
      await candidateService.bulkUpdateStatus([], 'archived', 'company-1')
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  // ─── notes ─────────────────────────────────────────────
  describe('addNote', () => {
    it('should insert a note with company_id', async () => {
      const note = { id: 'n1', content: 'Great candidate', candidate_id: 'c1', company_id: 'company-1' }
      const chain = createChain(note)
      mockFrom.mockReturnValue(chain)

      const result = await candidateService.addNote('c1', 'company-1', 'user-1', 'Great candidate')
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
        candidate_id: 'c1',
        company_id: 'company-1',
        author_id: 'user-1',
        content: 'Great candidate',
      }))
      expect(result).toEqual(note)
    })
  })

  describe('getNotes', () => {
    it('should fetch notes with company_id filter', async () => {
      const notes = [{ id: 'n1', content: 'Note 1' }]
      const chain = createChain(notes)
      mockFrom.mockReturnValue(chain)

      const result = await candidateService.getNotes('c1', 'company-1')
      expect(chain.eq).toHaveBeenCalledWith('candidate_id', 'c1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(result).toEqual(notes)
    })
  })

  // ─── timeline ──────────────────────────────────────────
  describe('getTimeline', () => {
    it('should fetch timeline with company_id filter', async () => {
      const events = [{ id: 'e1', event_type: 'applied', description: 'Applied to job' }]
      const chain = createChain(events)
      mockFrom.mockReturnValue(chain)

      const result = await candidateService.getTimeline('c1', 'company-1')
      expect(chain.eq).toHaveBeenCalledWith('candidate_id', 'c1')
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(result).toEqual(events)
    })
  })

  // ─── getAllWithApplications ────────────────────────────
  describe('getAllWithApplications', () => {
    it('should call RPC with company_id', async () => {
      const data = [{ id: '1', full_name: 'Alice', application_count: 2 }]
      mockRpc.mockResolvedValue({ data, error: null })

      const result = await candidateService.getAllWithApplications('company-1')
      expect(mockRpc).toHaveBeenCalledWith('get_candidates_with_applications', { p_company_id: 'company-1' })
      expect(result).toEqual(data)
    })
  })
})
