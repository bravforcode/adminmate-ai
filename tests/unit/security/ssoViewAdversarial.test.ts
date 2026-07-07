/**
 * Adversarial test for SSO certificate view (sso_provider_configs_decrypted).
 *
 * Verifies the SECURITY INVOKER view enforces tenant isolation through
 * the underlying table's RLS policies.
 *
 * These tests verify APPLICATION-LAYER contracts via source inspection.
 * Database-level proof comes from pgTAP tests (supabase/tests/).
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'

const SSO_SERVICE_PATH = 'src/services/security/ssoService.ts'
const SSO_MIGRATION_PATH = 'supabase/migrations/202406270000011_encrypt_sso_certificates.sql'

describe('SSO view tenant isolation — adversarial contracts', () => {
  const serviceSource = fs.readFileSync(SSO_SERVICE_PATH, 'utf8')

  /**
   * CORE ADVERSARIAL: The SSO service MUST scope queries by company_id.
   * Defense-in-depth — RLS is primary, explicit filtering is secondary.
   * A single RLS policy bug should not expose all tenants' SSO certs.
   */
  it('getSSOConfig scopes query by company_id', () => {
    expect(serviceSource).toContain(".eq('company_id', companyId)")
  })

  /**
   * The SSO service MUST query the raw table, not the decrypted view.
   * The view is for edge functions / server-side. Client-side must use
   * the raw table where RLS is enforced.
   */
  it('getSSOConfig queries raw table, not the decrypted view', () => {
    expect(serviceSource).not.toContain('sso_provider_configs_decrypted')
  })

  /**
   * testSSOConnection must call getSSOConfig (which filters by company_id)
   * BEFORE attempting any external metadata URL fetch. Without this order,
   * an attacker could trigger SSRF by passing a different companyId.
   */
  it('testSSOConnection validates ownership before external fetch', () => {
    const configCallIdx = serviceSource.indexOf('getSSOConfig')
    const fetchIdx = serviceSource.indexOf('fetch(config.metadata_url')
    // getSSOConfig must come before any fetch call
    expect(configCallIdx).toBeLessThan(fetchIdx)
  })
})

describe('SSO decryption key management', () => {
  const migrationSource = fs.readFileSync(SSO_MIGRATION_PATH, 'utf8')

  /**
   * Key contract:
   * - Lives in: PostgreSQL app setting (app.sso_encryption_key)
   * - Set via: Supabase Dashboard, Vault, or ALTER SYSTEM SET
   * - Must NOT be hardcoded in migration or source code
   */
  it('key is read from app settings, not hardcoded', () => {
    expect(migrationSource).toContain("current_setting('app.sso_encryption_key'")
    expect(migrationSource).not.toMatch(/passphrase\s*=\s*['"][^'"]+['"]/i)
  })
})
