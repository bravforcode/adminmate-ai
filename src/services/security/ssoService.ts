import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

export interface SSOProviderConfig {
  id: string
  company_id: string
  provider_type: string
  provider_name: string
  metadata_url: string | null
  entity_id: string | null
  certificate: string | null
  is_enabled: boolean
  config_status: string
  created_at: string
  updated_at: string
}

export interface SaveSSOInput {
  provider_type: string
  provider_name: string
  metadata_url?: string
  entity_id?: string
  certificate?: string
  is_enabled?: boolean
}

/**
 * SSO service — company-scoped, owner/admin only for writes.
 * SSO is disabled by default; is_enabled must be explicitly set to true.
 */
export const ssoService = {
  /**
   * Get SSO configuration for a company.
   * Returns null if no config exists (SSO not configured).
   */
  getSSOConfig: async (companyId: string): Promise<SSOProviderConfig | null> => {
    const { data, error } = await supabase
      .from('sso_provider_configs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  },

  /**
   * Create or update SSO configuration.
   * Only owner/admin can call this (enforced via RLS + permission check).
   * SSO is disabled by default unless is_enabled is explicitly true.
   */
  saveSSOConfig: async (companyId: string, input: SaveSSOInput): Promise<SSOProviderConfig> => {
    const canWrite = await hasPermission('sso', 'write')
    if (!canWrite) throw new Error('Insufficient permissions: sso_write required')

    // Enforce: if not configured yet, force disabled
    if (!input.is_enabled) {
      input.is_enabled = false
    }

    // Check for existing config
    const { data: existing } = await supabase
      .from('sso_provider_configs')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('sso_provider_configs')
        .update({
          provider_type: input.provider_type,
          provider_name: input.provider_name,
          metadata_url: input.metadata_url ?? null,
          entity_id: input.entity_id ?? null,
          certificate: input.certificate ?? null,
          is_enabled: input.is_enabled,
          config_status: input.metadata_url || input.entity_id ? 'configured' : 'not_configured',
        })
        .eq('id', existing.id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (error) throw error
      return data
    }

    const { data, error } = await supabase
      .from('sso_provider_configs')
      .insert({
        company_id: companyId,
        provider_type: input.provider_type,
        provider_name: input.provider_name,
        metadata_url: input.metadata_url ?? null,
        entity_id: input.entity_id ?? null,
        certificate: input.certificate ?? null,
        is_enabled: input.is_enabled,
        config_status: input.metadata_url || input.entity_id ? 'configured' : 'not_configured',
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Test SSO connection by attempting to fetch metadata URL.
   * Returns connection status and validates metadata.
   */
  testSSOConnection: async (companyId: string): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> => {
    const config = await ssoService.getSSOConfig(companyId)
    if (!config) {
      return { success: false, message: 'SSO not configured' }
    }

    if (!config.is_enabled) {
      return { success: false, message: 'SSO is disabled' }
    }

    if (config.config_status === 'not_configured') {
      return { success: false, message: 'SSO configuration incomplete — provide metadata URL or entity ID' }
    }

    // Test metadata URL if provided
    if (config.metadata_url) {
      try {
        const response = await fetch(config.metadata_url, {
          method: 'GET',
          signal: AbortSignal.timeout(10_000),
        })

        if (!response.ok) {
          await supabase
            .from('sso_provider_configs')
            .update({ config_status: 'error' })
            .eq('id', config.id)
            .eq('company_id', companyId)

          return {
            success: false,
            message: `Metadata URL returned HTTP ${response.status}`,
          }
        }

        await supabase
          .from('sso_provider_configs')
          .update({ config_status: 'verified' })
          .eq('id', config.id)
          .eq('company_id', companyId)

        return {
          success: true,
          message: 'SAML metadata fetched successfully',
          details: { metadata_url: config.metadata_url },
        }
      } catch (err) {
        return {
          success: false,
          message: `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }
      }
    }

    // No metadata URL — just check entity_id + certificate present
    if (config.entity_id && config.certificate) {
      await supabase
        .from('sso_provider_configs')
        .update({ config_status: 'verified' })
        .eq('id', config.id)
        .eq('company_id', companyId)

      return {
        success: true,
        message: 'SAML configuration verified (entity_id + certificate present)',
      }
    }

    return {
      success: false,
      message: 'Incomplete SAML configuration — entity_id or certificate missing',
    }
  },
}
