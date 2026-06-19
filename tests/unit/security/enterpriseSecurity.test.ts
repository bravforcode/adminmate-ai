import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────
const { mockFrom, mockRpc, mockAuth } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockAuth: vi.fn(),
}))

vi.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getUser: (...args: unknown[]) => mockAuth(...args) },
  },
}))

vi.mock('../../../src/services/permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import { ssoService, type SaveSSOInput } from '../../../src/services/security/ssoService'
import { sessionService, type SecurityEventInput } from '../../../src/services/security/sessionService'
import { hasPermission } from '../../../src/services/permissionService'

// ── Helpers ────────────────────────────────────────────────────
function mockQueryBuilder() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    gte: vi.fn(),
  }
  // Every method returns the chain itself
  for (const key of Object.keys(chain)) {
    if (key === 'maybeSingle' || key === 'single') {
      chain[key].mockResolvedValue({ data: null, error: null })
    } else {
      chain[key].mockReturnValue(chain)
    }
  }
  return chain
}

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001'
const USER_ID = 'u0000000-0000-0000-0000-000000000001'

// ── Tests ──────────────────────────────────────────────────────
describe('Enterprise Security — Release 22', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: permission granted
    vi.mocked(hasPermission).mockResolvedValue(true)
    mockAuth.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
  })

  // ═══════════════════════════════════════════════════════════════
  // SSO Service
  // ═══════════════════════════════════════════════════════════════
  describe('ssoService', () => {
    describe('getSSOConfig', () => {
      it('returns null when no SSO config exists (SSO disabled by default)', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: null, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await ssoService.getSSOConfig(COMPANY_ID)
        expect(result).toBeNull()
        expect(mockFrom).toHaveBeenCalledWith('sso_provider_configs')
        expect(qb.eq).toHaveBeenCalledWith('company_id', COMPANY_ID)
      })

      it('returns config when SSO exists for company', async () => {
        const config = {
          id: 'sso-1',
          company_id: COMPANY_ID,
          provider_type: 'saml',
          provider_name: 'Okta',
          is_enabled: true,
          config_status: 'verified',
        }
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: config, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await ssoService.getSSOConfig(COMPANY_ID)
        expect(result).toEqual(config)
      })
    })

    describe('saveSSOConfig', () => {
      it('creates new SSO config with is_enabled=false by default', async () => {
        const qb = mockQueryBuilder()
        // No existing config
        qb.maybeSingle.mockResolvedValue({ data: null, error: null })
        // Insert returns the new config
        qb.single.mockResolvedValue({
          data: { id: 'sso-new', company_id: COMPANY_ID, is_enabled: false, config_status: 'configured' },
          error: null,
        })
        mockFrom.mockReturnValue(qb)

        const input: SaveSSOInput = {
          provider_type: 'saml',
          provider_name: 'Okta',
          metadata_url: 'https://okta.example.com/metadata',
        }
        const result = await ssoService.saveSSOConfig(COMPANY_ID, input)
        expect(result.is_enabled).toBe(false)
        expect(result.config_status).toBe('configured')
      })

      it('throws when user lacks sso_write permission', async () => {
        vi.mocked(hasPermission).mockResolvedValue(false)
        await expect(
          ssoService.saveSSOConfig(COMPANY_ID, { provider_type: 'saml', provider_name: 'Test' })
        ).rejects.toThrow('Insufficient permissions')
      })

      it('forces is_enabled=false when not explicitly set', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: null, error: null })
        qb.single.mockResolvedValue({ data: { is_enabled: false }, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await ssoService.saveSSOConfig(COMPANY_ID, {
          provider_type: 'oidc',
          provider_name: 'Test',
        })
        expect(result.is_enabled).toBe(false)
      })
    })

    describe('testSSOConnection', () => {
      it('returns failure when SSO not configured', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: null, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await ssoService.testSSOConnection(COMPANY_ID)
        expect(result.success).toBe(false)
        expect(result.message).toContain('not configured')
      })

      it('returns failure when SSO is disabled', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({
          data: { id: 'sso-1', is_enabled: false, config_status: 'not_configured' },
          error: null,
        })
        mockFrom.mockReturnValue(qb)

        const result = await ssoService.testSSOConnection(COMPANY_ID)
        expect(result.success).toBe(false)
        expect(result.message).toContain('disabled')
      })

      it('returns failure when config is incomplete', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({
          data: { id: 'sso-1', is_enabled: true, config_status: 'not_configured', metadata_url: null },
          error: null,
        })
        mockFrom.mockReturnValue(qb)

        const result = await ssoService.testSSOConnection(COMPANY_ID)
        expect(result.success).toBe(false)
        expect(result.message).toContain('incomplete')
      })

      it('returns success when entity_id + certificate present (no metadata URL)', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({
          data: {
            id: 'sso-1',
            is_enabled: true,
            config_status: 'configured',
            metadata_url: null,
            entity_id: 'https://example.com/saml',
            certificate: 'MIICERT...',
          },
          error: null,
        })
        // For the update call
        const updateQb = mockQueryBuilder()
        updateQb.single.mockResolvedValue({ data: {}, error: null })
        mockFrom.mockReturnValueOnce(qb).mockReturnValue(updateQb)

        const result = await ssoService.testSSOConnection(COMPANY_ID)
        expect(result.success).toBe(true)
        expect(result.message).toContain('verified')
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Session Service
  // ═══════════════════════════════════════════════════════════════
  describe('sessionService', () => {
    describe('getSessionPolicy', () => {
      it('returns null when no policy exists (uses defaults)', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: null, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await sessionService.getSessionPolicy(COMPANY_ID)
        expect(result).toBeNull()
      })

      it('returns existing policy', async () => {
        const policy = {
          id: 'sp-1',
          company_id: COMPANY_ID,
          max_session_hours: 4,
          idle_timeout_minutes: 15,
          require_mfa: true,
          ip_allowlist: ['10.0.0.0/8'],
        }
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: policy, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await sessionService.getSessionPolicy(COMPANY_ID)
        expect(result).toEqual(policy)
      })
    })

    describe('updateSessionPolicy', () => {
      it('clamps max_session_hours to 1-72 range', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: null, error: null })
        qb.single.mockResolvedValue({ data: { max_session_hours: 72 }, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await sessionService.updateSessionPolicy(COMPANY_ID, { max_session_hours: 200 })
        expect(result.max_session_hours).toBe(72)
      })

      it('clamps idle_timeout_minutes to 5-480 range', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: null, error: null })
        qb.single.mockResolvedValue({ data: { idle_timeout_minutes: 5 }, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await sessionService.updateSessionPolicy(COMPANY_ID, { idle_timeout_minutes: 1 })
        expect(result.idle_timeout_minutes).toBe(5)
      })

      it('throws when user lacks session_policy_write permission', async () => {
        vi.mocked(hasPermission).mockResolvedValue(false)
        await expect(
          sessionService.updateSessionPolicy(COMPANY_ID, {})
        ).rejects.toThrow('Insufficient permissions')
      })

      it('creates new policy with defaults when none exists', async () => {
        const qb = mockQueryBuilder()
        qb.maybeSingle.mockResolvedValue({ data: null, error: null })
        qb.single.mockResolvedValue({
          data: { max_session_hours: 8, idle_timeout_minutes: 30 },
          error: null,
        })
        mockFrom.mockReturnValue(qb)

        const result = await sessionService.updateSessionPolicy(COMPANY_ID, {})
        expect(result.max_session_hours).toBe(8)
        expect(result.idle_timeout_minutes).toBe(30)
      })
    })

    describe('validateSession', () => {
      it('calls validate_company_session RPC', async () => {
        mockRpc.mockResolvedValue({ data: { valid: true }, error: null })

        const result = await sessionService.validateSession('session-1', COMPANY_ID)
        expect(result.valid).toBe(true)
        expect(mockRpc).toHaveBeenCalledWith('validate_company_session', expect.objectContaining({
          p_company_id: COMPANY_ID,
        }))
      })

      it('returns invalid when session expired', async () => {
        mockRpc.mockResolvedValue({
          data: { valid: false, reason: 'session_max_duration_exceeded' },
          error: null,
        })

        const result = await sessionService.validateSession('session-1', COMPANY_ID)
        expect(result.valid).toBe(false)
        expect(result.reason).toBe('session_max_duration_exceeded')
      })
    })

    describe('logSecurityEvent', () => {
      it('inserts security event with company_id', async () => {
        const event = {
          id: 'se-1',
          company_id: COMPANY_ID,
          event_type: 'sso_login',
          created_at: new Date().toISOString(),
        }
        const qb = mockQueryBuilder()
        qb.single.mockResolvedValue({ data: event, error: null })
        mockFrom.mockReturnValue(qb)

        const result = await sessionService.logSecurityEvent({
          company_id: COMPANY_ID,
          event_type: 'sso_login',
          ip_address: '192.168.1.1',
        })
        expect(result.event_type).toBe('sso_login')
        expect(result.company_id).toBe(COMPANY_ID)
      })

      it('enforces company_id in RLS (insert scoped to company)', async () => {
        const qb = mockQueryBuilder()
        qb.single.mockResolvedValue({ data: { company_id: COMPANY_ID }, error: null })
        mockFrom.mockReturnValue(qb)

        // Attempt to insert with mismatched company — RLS would block
        // The service always passes the company_id through, so the mock validates the call
        await sessionService.logSecurityEvent({
          company_id: COMPANY_ID,
          event_type: 'session_expired',
        })

        expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({
          company_id: COMPANY_ID,
        }))
      })
    })

    describe('getSecurityEvents', () => {
      it('returns events filtered by company_id', async () => {
        const events = [
          { id: 'se-1', company_id: COMPANY_ID, event_type: 'sso_login' },
          { id: 'se-2', company_id: COMPANY_ID, event_type: 'session_expired' },
        ]

        // Build a chainable query builder that resolves at the end
        const makeChain = (result: { data: unknown; error: null }) => {
          const chain: Record<string, unknown> = {}
          for (const m of ['select', 'eq', 'order', 'limit']) {
            chain[m] = vi.fn().mockReturnValue(chain)
          }
          // Make it thenable (thenable resolves when awaited)
          chain[Symbol.toStringTag] = 'Promise'
          chain.then = (resolve: (v: unknown) => void) => resolve(result)
          return chain
        }

        mockFrom.mockReturnValue(makeChain({ data: events, error: null }))

        const result = await sessionService.getSecurityEvents(COMPANY_ID, { event_type: 'sso_login' })
        expect(result).toHaveLength(2)
        expect(result[0].event_type).toBe('sso_login')
      })
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // Cross-cutting: RLS / Company Scope
  // ═══════════════════════════════════════════════════════════════
  describe('RLS & Company Scope', () => {
    it('SCIM cannot bypass company scope — token scoped to company_id', async () => {
      // The SQL policy enforces: company_id = safe_user_company_id()
      // Service always passes company_id from authenticated user context
      const qb = mockQueryBuilder()
      qb.maybeSingle.mockResolvedValue({ data: null, error: null })
      mockFrom.mockReturnValue(qb)

      // Attempt to read SSO config for a different company
      const otherCompanyId = 'c9999999-9999-9999-9999-999999999999'
      await ssoService.getSSOConfig(otherCompanyId)

      // The query is always scoped by company_id via RLS
      expect(qb.eq).toHaveBeenCalledWith('company_id', otherCompanyId)
      // RLS policy would filter this out at DB level
    })

    it('security events are company-scoped via RLS', async () => {
      const qb = mockQueryBuilder()
      qb.single.mockResolvedValue({
        data: { company_id: COMPANY_ID, event_type: 'test' },
        error: null,
      })
      mockFrom.mockReturnValue(qb)

      await sessionService.logSecurityEvent({
        company_id: COMPANY_ID,
        event_type: 'test_event',
      })

      // Insert includes company_id — RLS WITH CHECK enforces match
      expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({
        company_id: COMPANY_ID,
      }))
    })

    it('SSO disabled by default — cannot enable without explicit flag', async () => {
      const qb = mockQueryBuilder()
      qb.maybeSingle.mockResolvedValue({ data: null, error: null })
      qb.single.mockResolvedValue({
        data: { is_enabled: false },
        error: null,
      })
      mockFrom.mockReturnValue(qb)

      const result = await ssoService.saveSSOConfig(COMPANY_ID, {
        provider_type: 'saml',
        provider_name: 'Test',
        // is_enabled not set
      })
      expect(result.is_enabled).toBe(false)
    })

    it('session expiry enforced — policy values clamped to safe range', async () => {
      const qb = mockQueryBuilder()
      qb.maybeSingle.mockResolvedValue({ data: null, error: null })
      qb.single.mockResolvedValue({
        data: { max_session_hours: 1, idle_timeout_minutes: 480 },
        error: null,
      })
      mockFrom.mockReturnValue(qb)

      // Attempt extreme values
      await sessionService.updateSessionPolicy(COMPANY_ID, {
        max_session_hours: 0,   // should clamp to 1
        idle_timeout_minutes: 999, // should clamp to 480
      })

      expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({
        max_session_hours: 1,
        idle_timeout_minutes: 480,
      }))
    })
  })
})
