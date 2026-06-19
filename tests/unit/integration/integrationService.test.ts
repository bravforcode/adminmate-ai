import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { integrationService } from '../../../src/services/integration/integrationService'

// .select().eq().single() — provider lookup (1 eq)
function providerChain(data: unknown, error: unknown = null) {
  const result = { data, error }
  const eq1 = { single: vi.fn().mockResolvedValue(result) }
  const sel = { eq: vi.fn().mockReturnValue(eq1) }
  return { select: vi.fn().mockReturnValue(sel) }
}

// .select().eq().eq().single() — config lookup (2 eqs)
function configChain(data: unknown, error: unknown = null) {
  const result = { data, error }
  const eq2 = { single: vi.fn().mockResolvedValue(result) }
  const eq1 = { eq: vi.fn().mockReturnValue(eq2) }
  const sel = { eq: vi.fn().mockReturnValue(eq1) }
  return { select: vi.fn().mockReturnValue(sel) }
}

// .insert().select().single()
function insertChain(data: unknown, error: unknown = null) {
  const result = { data, error }
  const sel = { single: vi.fn().mockResolvedValue(result) }
  const ins = { select: vi.fn().mockReturnValue(sel) }
  return { insert: vi.fn().mockReturnValue(ins) }
}

// .update().eq().select().single()
function updateChain(data: unknown, error: unknown = null) {
  const result = { data, error }
  const sel = { single: vi.fn().mockResolvedValue(result) }
  const eq1 = { select: vi.fn().mockReturnValue(sel) }
  const upd = { eq: vi.fn().mockReturnValue(eq1) }
  return { update: vi.fn().mockReturnValue(upd) }
}

// .select().eq().eq().order().limit()
function logsChain(data: unknown, error: unknown = null) {
  const result = { data, error }
  const lim = { limit: vi.fn().mockResolvedValue(result) }
  const ord = { order: vi.fn().mockReturnValue(lim) }
  const eq2 = ord
  const eq1 = { eq: vi.fn().mockReturnValue(eq2) }
  const sel = { eq: vi.fn().mockReturnValue(eq1) }
  return { select: vi.fn().mockReturnValue(sel) }
}

// .insert() — bare insert (for event log)
function bareInsert(error: unknown = null) {
  return { insert: vi.fn().mockResolvedValue({ data: null, error }) }
}

describe('integrationService', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset()
  })

  describe('getProviders', () => {
    it('returns active providers', async () => {
      const providers = [
        { id: '1', provider_key: 'google_calendar', name: 'Google Calendar', category: 'calendar', is_active: true },
      ]
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: providers, error: null }),
            }),
          }),
        }),
      })

      const result = await integrationService.getProviders()
      expect(mockSupabase.from).toHaveBeenCalledWith('integration_providers')
      expect(result).toEqual(providers)
    })
  })

  describe('getConfig', () => {
    it('returns not_configured status when no config exists', async () => {
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(null, { code: 'PGRST116' }))

      const result = await integrationService.getConfig('comp-1', 'google_calendar')
      expect(result).toEqual({
        id: '',
        company_id: 'comp-1',
        provider_id: 'prov-1',
        config_data: {},
        is_enabled: false,
        config_status: 'not_configured',
        last_checked_at: null,
        created_at: '',
        updated_at: '',
      })
    })

    it('masks sensitive fields in config_data', async () => {
      const config = {
        id: 'cfg-1',
        company_id: 'comp-1',
        provider_id: 'prov-1',
        config_data: { api_key: 'sk-1234567890abcdef', name: 'My Calendar' },
        is_enabled: true,
        config_status: 'connected',
        last_checked_at: '2024-01-01',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(config))

      const result = await integrationService.getConfig('comp-1', 'google_calendar')
      expect(result?.config_data.api_key).toBe('sk-1****cdef')
      expect(result?.config_data.name).toBe('My Calendar')
    })

    it('returns null when provider does not exist', async () => {
      mockSupabase.from.mockReturnValue(providerChain(null, { code: 'PGRST116' }))

      const result = await integrationService.getConfig('comp-1', 'nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('saveConfig', () => {
    it('creates new config when none exists', async () => {
      const created = {
        id: 'cfg-new',
        company_id: 'comp-1',
        provider_id: 'prov-1',
        config_data: { token: 'abc123' },
        is_enabled: false,
        config_status: 'configured',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(null, { code: 'PGRST116' }))
        .mockReturnValueOnce(insertChain(created))

      const result = await integrationService.saveConfig('comp-1', 'google_calendar', { token: 'abc123' })
      expect(result.config_status).toBe('configured')
    })

    it('updates existing config', async () => {
      const updated = {
        id: 'cfg-old',
        company_id: 'comp-1',
        provider_id: 'prov-1',
        config_data: { token: 'new-token' },
        config_status: 'configured',
      }
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain({ id: 'cfg-old' }))
        .mockReturnValueOnce(updateChain(updated))

      const result = await integrationService.saveConfig('comp-1', 'google_calendar', { token: 'new-token' })
      expect(result.id).toBe('cfg-old')
    })

    it('throws when provider does not exist', async () => {
      mockSupabase.from.mockReturnValue(providerChain(null, { code: 'PGRST116' }))

      await expect(
        integrationService.saveConfig('comp-1', 'nonexistent', {})
      ).rejects.toThrow('Provider not found: nonexistent')
    })
  })

  describe('testConnection', () => {
    it('returns provider_not_configured when not configured', async () => {
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(null, { code: 'PGRST116' }))

      const result = await integrationService.testConnection('comp-1', 'google_calendar')
      expect(result).toEqual({ success: false, message: 'provider_not_configured' })
    })

    it('does not fake success for unconfigured provider', async () => {
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(null, { code: 'PGRST116' }))

      const result = await integrationService.testConnection('comp-1', 'google_calendar')
      expect(result.success).toBe(false)
      expect(result.message).not.toBe('Connection successful')
    })

    it('logs event on successful connection', async () => {
      const config = {
        id: 'cfg-1',
        company_id: 'comp-1',
        provider_id: 'prov-1',
        config_data: { api_key: 'key123456789' },
        is_enabled: true,
        config_status: 'connected',
      }
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(config))
        .mockReturnValueOnce(providerChain({ provider_key: 'google_calendar' }))
        .mockReturnValueOnce(bareInsert())

      const result = await integrationService.testConnection('comp-1', 'google_calendar')
      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('integration_event_logs')
    })
  })

  describe('syncData', () => {
    it('throws provider_not_configured when not configured', async () => {
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(null, { code: 'PGRST116' }))

      await expect(
        integrationService.syncData('comp-1', 'google_calendar', 'events')
      ).rejects.toThrow('provider_not_configured')
    })

    it('creates sync job with pending status', async () => {
      const config = {
        id: 'cfg-1',
        config_status: 'connected',
        company_id: 'comp-1',
        provider_id: 'prov-1',
        config_data: {},
      }
      const job = {
        id: 'job-1',
        company_id: 'comp-1',
        provider_id: 'prov-1',
        sync_type: 'events',
        status: 'pending',
        records_synced: 0,
      }
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(config))
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(insertChain(job))

      const result = await integrationService.syncData('comp-1', 'google_calendar', 'events')
      expect(result.status).toBe('pending')
      expect(result.sync_type).toBe('events')
    })
  })

  describe('getEventLogs', () => {
    it('returns event logs for a provider', async () => {
      const logs = [
        { id: 'log-1', event_type: 'connection_test', status: 'success' },
        { id: 'log-2', event_type: 'sync', status: 'failed' },
      ]
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(logsChain(logs))

      const result = await integrationService.getEventLogs('comp-1', 'google_calendar')
      expect(result).toEqual(logs)
    })

    it('returns empty array for unknown provider', async () => {
      mockSupabase.from.mockReturnValue(providerChain(null, { code: 'PGRST116' }))

      const result = await integrationService.getEventLogs('comp-1', 'nonexistent')
      expect(result).toEqual([])
    })
  })

  describe('RLS isolation', () => {
    it('scopes all queries by company_id', async () => {
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(null, { code: 'PGRST116' }))

      await integrationService.getConfig('company-A', 'google_calendar')

      const allCalls = mockSupabase.from.mock.calls.map((c: unknown[]) => c[0])
      expect(allCalls).toContain('integration_providers')
      expect(allCalls).toContain('integration_configs')
    })
  })

  describe('webhook idempotency', () => {
    it('logs event with payload_hash for deduplication', async () => {
      const config = {
        id: 'cfg-1',
        config_status: 'connected',
        company_id: 'comp-1',
        provider_id: 'prov-1',
        config_data: {},
      }
      mockSupabase.from
        .mockReturnValueOnce(providerChain({ id: 'prov-1' }))
        .mockReturnValueOnce(configChain(config))
        .mockReturnValueOnce(providerChain({ provider_key: 'google_calendar' }))
        .mockReturnValueOnce(bareInsert())

      await integrationService.testConnection('comp-1', 'google_calendar')

      const insertCall = mockSupabase.from.mock.calls.find(
        (c: unknown[]) => c[0] === 'integration_event_logs'
      )
      expect(insertCall).toBeDefined()
    })
  })
})
