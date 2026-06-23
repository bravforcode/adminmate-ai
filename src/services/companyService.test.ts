import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase chainable query builder — chain itself is thenable
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  // Make the chain itself thenable (Supabase chains resolve when awaited)
  chain.then = (resolve: Function, reject?: Function) => {
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

import { companyService } from './companyService'

describe('companyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── getAll ──────────────────────────────────────────────
  describe('getAll', () => {
    it('should return all companies', async () => {
      const companies = [{ id: '1', name: 'Acme' }]
      mockFrom.mockReturnValue(createChain(companies))

      const result = await companyService.getAll()
      expect(mockFrom).toHaveBeenCalledWith('companies')
      expect(result).toEqual(companies)
    })

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))

      await expect(companyService.getAll()).rejects.toThrow('DB error')
    })
  })

  // ─── getById ─────────────────────────────────────────────
  describe('getById', () => {
    it('should return a company by id', async () => {
      const company = { id: 'abc', name: 'Acme' }
      const chain = createChain(company)
      mockFrom.mockReturnValue(chain)

      const result = await companyService.getById('abc')
      expect(result).toEqual(company)
      expect(chain.eq).toHaveBeenCalledWith('id', 'abc')
      expect(chain.single).toHaveBeenCalled()
    })

    it('should throw on error', async () => {
      const chain = createChain(null, new Error('Not found'))
      mockFrom.mockReturnValue(chain)

      await expect(companyService.getById('missing')).rejects.toThrow('Not found')
    })
  })

  // ─── create ──────────────────────────────────────────────
  describe('create', () => {
    it('should create a company with TH defaults (currency, timezone, locale)', async () => {
      const created = { id: 'new1', name: 'Thai Co' }
      const chain = createChain(created)
      mockFrom.mockReturnValue(chain)

      const result = await companyService.create({
        name: 'Thai Co',
        industry: 'Tech',
        country: 'TH',
      })

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Thai Co',
          country: 'TH',
          currency: 'THB',
          timezone: 'Asia/Bangkok',
          locale: 'th-TH',
          industry: 'Tech',
        })
      )
      expect(result).toEqual(created)
    })

    it('should set VN defaults', async () => {
      const chain = createChain({ id: 'new2', name: 'Viet Co' })
      mockFrom.mockReturnValue(chain)

      await companyService.create({ name: 'Viet Co', industry: 'Finance', country: 'VN' })

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'VN', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', locale: 'vi-VN' })
      )
    })

    it('should set ID defaults', async () => {
      const chain = createChain({ id: 'new3', name: 'Indo Co' })
      mockFrom.mockReturnValue(chain)

      await companyService.create({ name: 'Indo Co', industry: 'Manufacturing', country: 'ID' })

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'ID', currency: 'IDR', timezone: 'Asia/Jakarta', locale: 'id-ID' })
      )
    })

    it('should include optional fields when provided', async () => {
      const chain = createChain({ id: 'new4' })
      mockFrom.mockReturnValue(chain)

      await companyService.create({
        name: 'Full Co',
        industry: 'Retail',
        country: 'TH',
        tax_id: '1234567890',
        phone: '+66123456789',
        email: 'contact@full.co',
        address: '123 Main St',
        city: 'Bangkok',
        name_th: 'บริษัท เต็ม',
      })

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tax_id: '1234567890',
          phone: '+66123456789',
          email: 'contact@full.co',
          address: '123 Main St',
          city: 'Bangkok',
          name_th: 'บริษัท เต็ม',
        })
      )
    })

    it('should throw on create error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Insert failed')))

      await expect(
        companyService.create({ name: 'Bad Co', industry: 'X', country: 'TH' })
      ).rejects.toThrow('Insert failed')
    })
  })

  // ─── update ──────────────────────────────────────────────
  describe('update', () => {
    it('should update company by id', async () => {
      const updated = { id: 'u1', name: 'Updated' }
      const chain = createChain(updated)
      mockFrom.mockReturnValue(chain)

      const result = await companyService.update('u1', { name: 'Updated' })
      expect(chain.update).toHaveBeenCalledWith({ name: 'Updated' })
      expect(chain.eq).toHaveBeenCalledWith('id', 'u1')
      expect(result).toEqual(updated)
    })

    it('should throw on update error', async () => {
      const chain = createChain(null, new Error('Update failed'))
      mockFrom.mockReturnValue(chain)

      await expect(companyService.update('u1', { name: 'X' })).rejects.toThrow('Update failed')
    })
  })
})
