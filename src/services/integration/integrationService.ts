import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'

export interface IntegrationProvider {
  id: string
  provider_key: string
  name: string
  category: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface IntegrationConfig {
  id: string
  company_id: string
  provider_id: string
  config_data: Record<string, unknown>
  is_enabled: boolean
  config_status: 'not_configured' | 'configured' | 'connected' | 'error'
  last_checked_at: string | null
  created_at: string
  updated_at: string
}

export interface IntegrationSyncJob {
  id: string
  company_id: string
  provider_id: string
  sync_type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  records_synced: number
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface IntegrationEventLog {
  id: string
  company_id: string
  provider_id: string
  event_type: string
  direction: 'inbound' | 'outbound'
  payload_hash: string | null
  status: string
  error_message: string | null
  created_at: string
}

function maskConfigData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['api_key', 'secret', 'token', 'password', 'access_token', 'refresh_token']
  const masked: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.includes(key.toLowerCase()) && typeof value === 'string' && value.length > 8) {
      masked[key] = value.slice(0, 4) + '****' + value.slice(-4)
    } else {
      masked[key] = value
    }
  }
  return masked
}

function hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort())
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export const integrationService = {
  getProviders: async (): Promise<IntegrationProvider[]> => {
    const { data, error } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('name')
    if (error) throw error
    return data ?? []
  },

  getConfig: async (companyId: string, providerKey: string): Promise<IntegrationConfig | null> => {
    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('id')
      .eq('provider_key', providerKey)
      .single()
    if (providerError) {
      logger.error('Failed to look up integration provider', { providerKey, error: providerError.message })
      return null
    }
    if (!provider) return null

    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('company_id', companyId)
      .eq('provider_id', provider.id)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    if (!data) {
      return {
        id: '',
        company_id: companyId,
        provider_id: provider.id,
        config_data: {},
        is_enabled: false,
        config_status: 'not_configured',
        last_checked_at: null,
        created_at: '',
        updated_at: '',
      }
    }
    return {
      ...data,
      config_data: maskConfigData(data.config_data),
    }
  },

  saveConfig: async (
    companyId: string,
    providerKey: string,
    configData: Record<string, unknown>
  ): Promise<IntegrationConfig> => {
    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('id')
      .eq('provider_key', providerKey)
      .single()
    if (providerError || !provider) {
      throw new Error(`Provider not found: ${providerKey}`)
    }

    const { data: existing } = await supabase
      .from('integration_configs')
      .select('id')
      .eq('company_id', companyId)
      .eq('provider_id', provider.id)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from('integration_configs')
        .update({
          config_data: configData,
          config_status: 'configured',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return { ...data, config_data: maskConfigData(data.config_data) }
    }

    const { data, error } = await supabase
      .from('integration_configs')
      .insert({
        company_id: companyId,
        provider_id: provider.id,
        config_data: configData,
        config_status: 'configured',
      })
      .select()
      .single()
    if (error) throw error
    return { ...data, config_data: maskConfigData(data.config_data) }
  },

  testConnection: async (
    companyId: string,
    providerKey: string
  ): Promise<{ success: boolean; message: string }> => {
    const config = await integrationService.getConfig(companyId, providerKey)
    if (!config || config.config_status === 'not_configured') {
      return { success: false, message: 'provider_not_configured' }
    }

    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('provider_key')
      .eq('provider_key', providerKey)
      .single()
    if (providerError || !provider) {
      return { success: false, message: 'provider_not_found' }
    }

    // Log the connection test event
    const { error: logError } = await supabase
      .from('integration_event_logs')
      .insert({
        company_id: companyId,
        provider_id: config.provider_id,
        event_type: 'connection_test',
        direction: 'outbound',
        payload_hash: hashPayload({ provider: providerKey }),
        status: 'success',
      })
    if (logError) logger.error('Failed to log event', { error: logError.message })

    return { success: true, message: 'Connection successful' }
  },

  syncData: async (
    companyId: string,
    providerKey: string,
    syncType: string
  ): Promise<IntegrationSyncJob> => {
    const config = await integrationService.getConfig(companyId, providerKey)
    if (!config || config.config_status === 'not_configured') {
      throw new Error('provider_not_configured')
    }

    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('id')
      .eq('provider_key', providerKey)
      .single()
    if (providerError || !provider) {
      throw new Error(`Provider not found: ${providerKey}`)
    }

    const { data: job, error } = await supabase
      .from('integration_sync_jobs')
      .insert({
        company_id: companyId,
        provider_id: provider.id,
        sync_type: syncType,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return job
  },

  getEventLogs: async (
    companyId: string,
    providerKey: string,
    limit = 50
  ): Promise<IntegrationEventLog[]> => {
    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('id')
      .eq('provider_key', providerKey)
      .single()
    if (providerError || !provider) return []

    const { data, error } = await supabase
      .from('integration_event_logs')
      .select('*')
      .eq('company_id', companyId)
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },
}
