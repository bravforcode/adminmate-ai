import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { checkConfigurationReadiness } from '../../../src/services/config/configurationReadinessService'

function chainResolve(result: { data?: unknown; error?: unknown; count?: number }) {
  const resolved = Promise.resolve(result)

  const builder: Record<string, unknown> = {}
  builder.eq = vi.fn().mockReturnValue(builder)
  builder.neq = vi.fn().mockReturnValue(builder)
  builder.gt = vi.fn().mockReturnValue(builder)
  builder.gte = vi.fn().mockReturnValue(builder)
  builder.lt = vi.fn().mockReturnValue(builder)
  builder.lte = vi.fn().mockReturnValue(builder)
  builder.like = vi.fn().mockReturnValue(builder)
  builder.ilike = vi.fn().mockReturnValue(builder)
  builder.is = vi.fn().mockReturnValue(builder)
  builder.not = vi.fn().mockReturnValue(builder)
  builder.in = vi.fn().mockReturnValue(builder)
  builder.or = vi.fn().mockReturnValue(builder)
  builder.and = vi.fn().mockReturnValue(builder)
  builder.filter = vi.fn().mockReturnValue(builder)
  builder.select = vi.fn().mockReturnValue(builder)
  builder.insert = vi.fn().mockReturnValue(builder)
  builder.update = vi.fn().mockReturnValue(builder)
  builder.delete = vi.fn().mockReturnValue(builder)
  builder.upsert = vi.fn().mockReturnValue(builder)
  builder.order = vi.fn().mockReturnValue(builder)
  builder.range = vi.fn().mockReturnValue(builder)
  builder.limit = vi.fn().mockReturnValue(builder)
  builder.single = vi.fn().mockResolvedValue(result)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)
  builder.then = resolved.then.bind(resolved)

  return builder
}

function mockFrom(results: Array<{ data?: unknown; error?: unknown; count?: number }>) {
  const queue = [...results]
  mockSupabase.from.mockImplementation(() => chainResolve(queue.shift()!))
}

// Promise.all runs all checks concurrently. Each check is async and
// executes synchronously up to its first await. The from() call order is:
//
// Sync (array order): 1-9, one per check
// Async (after first await): checks 7+8 make a second from()
//
// Check 7 (provider): sync=integration_providers, async=integration_configs
// Check 8 (payroll): sync=companies, async=payroll_country_packs
//
// So mock order for "all pass" case:
// [0] legal_entities     (check 1 - sync)
// [1] companies          (check 2 - locale/tz)
// [2] roles              (check 3 - sync)
// [3] companies          (check 4 - data retention)
// [4] message_templates  (check 5 - sync)
// [5] approval_workflows (check 6 - sync)
// [6] integration_providers (check 7 - sync)
// [7] companies          (check 8 - payroll country, sync)
// [8] subscriptions      (check 9 - sync)
// [9] integration_configs (check 7 - async, after provider found)
// [10] payroll_country_packs (check 8 - async)

describe('configurationReadinessService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ready=true when all hard checks pass', async () => {
    mockFrom([
      { data: { id: '1', name: 'Test Co', tax_id: '123', registration_number: 'REG1', country_code: 'TH', status: 'active' } },
      { data: { locale: 'th-TH', timezone: 'Asia/Bangkok' } },
      { data: [{ id: '1' }] },
      { data: { id: '1' } },
      { data: null, count: 2 },
      { data: { id: 'wf-1' } },
      { data: { id: 'prov-1' } },
      { data: { country: 'TH' } },
      { data: { status: 'active' } },
      { data: { id: 'cfg-1' } },
      { data: { id: 'pack-1' } },
    ])

    const result = await checkConfigurationReadiness('company-1')

    expect(result.ready).toBe(true)
    expect(result.hardBlockers).toHaveLength(0)
    expect(result.allChecks).toHaveLength(9)
  })

  it('returns ready=false when legal entity is missing', async () => {
    mockFrom([
      { data: null },
      { data: { locale: 'th-TH', timezone: 'Asia/Bangkok' } },
      { data: [{ id: '1' }] },
      { data: { id: '1' } },
      { data: null, count: 1 },
      { data: { id: 'wf-1' } },
      { data: { id: 'prov-1' } },
      { data: { country: 'TH' } },
      { data: { status: 'active' } },
      { data: { id: 'cfg-1' } },
      { data: { id: 'pack-1' } },
    ])

    const result = await checkConfigurationReadiness('company-1')

    expect(result.ready).toBe(false)
    const legalCheck = result.hardBlockers.find((c) => c.key === 'legal_entity')
    expect(legalCheck).toBeDefined()
    expect(legalCheck?.passed).toBe(false)
  })

  it('returns ready=false when subscription is missing', async () => {
    mockFrom([
      { data: { id: '1', name: 'Test Co', tax_id: '123', registration_number: 'REG1', country_code: 'TH', status: 'active' } },
      { data: { locale: 'th-TH', timezone: 'Asia/Bangkok' } },
      { data: [{ id: '1' }] },
      { data: { id: '1' } },
      { data: null, count: 1 },
      { data: { id: 'wf-1' } },
      { data: { id: 'prov-1' } },
      { data: { country: 'TH' } },
      { data: null },
      { data: { id: 'cfg-1' } },
      { data: { id: 'pack-1' } },
    ])

    const result = await checkConfigurationReadiness('company-1')

    expect(result.ready).toBe(false)
    const billingCheck = result.hardBlockers.find((c) => c.key === 'billing_entitlement')
    expect(billingCheck).toBeDefined()
    expect(billingCheck?.passed).toBe(false)
  })

  it('marks soft blockers separately from hard blockers', async () => {
    mockFrom([
      { data: { id: '1', name: 'Test Co', tax_id: '123', registration_number: 'REG1', country_code: 'TH', status: 'active' } },
      { data: { locale: 'th-TH', timezone: 'Asia/Bangkok' } },
      { data: [{ id: '1' }] },
      { data: { id: '1' } },
      { data: null, count: 0 },
      { data: null },
      { data: null },
      { data: { country: 'TH' } },
      { data: { status: 'active' } },
      { data: { id: 'pack-1' } },
    ])

    const result = await checkConfigurationReadiness('company-1')

    expect(result.hardBlockers).toHaveLength(0)
    expect(result.softBlockers.length).toBeGreaterThanOrEqual(2)
    expect(result.ready).toBe(true)
  })
})
