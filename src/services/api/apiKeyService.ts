import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'
import { logger } from '../../lib/logger'
import crypto from 'crypto'

export interface ApiClientInput {
  client_name: string
  client_type?: string
}

export interface ApiClient {
  id: string
  company_id: string
  client_name: string
  client_type: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiKeyRecord {
  id: string
  client_id: string
  key_hash: string
  key_prefix: string
  scopes: string[]
  expires_at: string | null
  last_used_at: string | null
  is_active: boolean
  created_at: string
}

export interface GeneratedApiKey {
  raw_key: string
  key_prefix: string
  key_hash: string
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function generateRawKey(): string {
  const bytes = crypto.randomBytes(32)
  return `am_${bytes.toString('hex')}`
}

export const apiKeyService = {
  createClient: async (companyId: string, input: ApiClientInput): Promise<ApiClient> => {
    if (!(await hasPermission('api_key', 'write'))) {
      throw new Error('Insufficient permissions: api_key_write required')
    }

    const { data, error } = await supabase
      .from('api_clients')
      .insert({
        company_id: companyId,
        client_name: input.client_name,
        client_type: input.client_type ?? 'external',
      })
      .select()
      .single()

    if (error) throw error
    return data as ApiKeyRecord & ApiClient
  },

  generateApiKey: async (
    clientId: string,
    scopes: string[] = [],
    expiresAt?: string
  ): Promise<GeneratedApiKey> => {
    if (!(await hasPermission('api_key', 'write'))) {
      throw new Error('Insufficient permissions: api_key_write required')
    }

    const rawKey = generateRawKey()
    const keyHash = sha256(rawKey)
    const keyPrefix = rawKey.substring(0, 8)

    const { error } = await supabase.from('api_keys').insert({
      client_id: clientId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
      expires_at: expiresAt ?? null,
    })

    if (error) throw error

    return { raw_key: rawKey, key_prefix: keyPrefix, key_hash: keyHash }
  },

  validateApiKey: async (keyHash: string): Promise<ApiKeyRecord | null> => {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (error) {
      logger.error('Failed to validate API key', { error: error.message })
      return null
    }
    if (!data) return null

    const key = data as ApiKeyRecord
    if (key.expires_at && new Date(key.expires_at) < new Date()) return null

    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', key.id)

    return key
  },

  revokeApiKey: async (keyId: string): Promise<void> => {
    if (!(await hasPermission('api_key', 'write'))) {
      throw new Error('Insufficient permissions: api_key_write required')
    }

    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)

    if (error) throw error
  },

  listClients: async (companyId: string): Promise<ApiClient[]> => {
    if (!(await hasPermission('api_key', 'read'))) {
      throw new Error('Insufficient permissions: api_key_read required')
    }

    const { data, error } = await supabase
      .from('api_clients')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ApiClient[]
  },

  listKeys: async (clientId: string): Promise<ApiKeyRecord[]> => {
    if (!(await hasPermission('api_key', 'read'))) {
      throw new Error('Insufficient permissions: api_key_read required')
    }

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ApiKeyRecord[]
  },
}
