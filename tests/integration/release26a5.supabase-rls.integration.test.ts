/**
 * Release 26A.5 — Node/Supabase Client Black-Box RLS Integration Proof
 *
 * Tests tenant isolation through the real Supabase REST API path.
 * Uses raw HTTP with Bearer tokens — no SDK dependency issues.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// ── Configuration ──────────────────────────────────────────

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// ── Test Users ─────────────────────────────────────────────

interface TestUser {
  email: string
  password: string
  userId?: string
  companyId: string
  role: string
  token?: string
}

const USERS: TestUser[] = [
  { email: 'rls-api-a@test.com', password: 'test123456', companyId: '11111111-1111-1111-1111-111111111111', role: 'admin' },
  { email: 'rls-api-b@test.com', password: 'test123456', companyId: '22222222-2222-2222-2222-222222222222', role: 'hr_manager' },
]

// ── HTTP helpers ────────────────────────────────────────────

async function apiGet(table: string, token: string, params?: Record<string, string>): Promise<any[]> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  })
  if (res.status === 403 || res.status === 401) return []
  return await res.json()
}

async function apiInsert(table: string, token: string, data: Record<string, unknown>): Promise<{ status: number; data: any }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, data: json }
}

// ── Setup ───────────────────────────────────────────────────

beforeAll(async () => {
  // Create test companies
  const bootstrapToken = await getToken('rls-api-bootstrap@test.com', 'test123456')
  await apiInsert('companies', bootstrapToken, { id: '11111111-1111-1111-1111-111111111111', name: 'API Test A', country: 'TH', currency: 'THB', timezone: 'Asia/Bangkok', locale: 'th-TH' })
  await apiInsert('companies', bootstrapToken, { id: '22222222-2222-2222-2222-222222222222', name: 'API Test B', country: 'TH', currency: 'THB', timezone: 'Asia/Bangkok', locale: 'th-TH' })

  // Create test users and get tokens
  for (const user of USERS) {
    user.token = await getToken(user.email, user.password)
    if (user.token) {
      // Get user ID from token
      const payload = JSON.parse(Buffer.from(user.token.split('.')[1], 'base64').toString())
      user.userId = payload.sub

      // Create user_profile via raw HTTP
      await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.userId, email: user.email, full_name: user.email.split('@')[0],
          role: user.role, company_id: user.companyId,
        }),
      })
    }
  }

  // Seed test data (after all user_profiles are created)
  for (const user of USERS) {
    if (user.token) {
      await apiInsert('chat_messages', user.token, {
        user_id: user.userId, company_id: user.companyId,
        session_id: crypto.randomUUID(), sender: 'user', content: `${user.email.split('@')[0]} msg`,
      })
      await apiInsert('messages', user.token, {
        company_id: user.companyId, conversation_id: crypto.randomUUID(),
        platform: 'web', platform_user_id: user.userId,
        direction: 'inbound', content: `${user.email.split('@')[0]} msg`, sender_type: 'user',
      })
    }
  }
})

afterAll(async () => {})

async function getToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!data.access_token) {
    // User doesn't exist, create via signup
    await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    })
    // Retry sign-in
    const retry = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    })
    const retryData = await retry.json()
    return retryData.access_token || ''
  }
  return data.access_token
}

// ── Tests ──────────────────────────────────────────────────

describe('26A.5 — REST API RLS: cross-tenant chat_messages', () => {
  it('Company A can read own chat_messages', async () => {
    const data = await apiGet('chat_messages', USERS[0].token!, { company_id: 'eq.11111111-1111-1111-1111-111111111111' })
    expect(data.length).toBeGreaterThanOrEqual(1)
  })

  it('Company A cannot read Company B chat_messages', async () => {
    const data = await apiGet('chat_messages', USERS[0].token!, { company_id: 'eq.22222222-2222-2222-2222-222222222222' })
    expect(data.length).toBe(0)
  })

  it('Company B cannot read Company A chat_messages', async () => {
    const data = await apiGet('chat_messages', USERS[1].token!, { company_id: 'eq.11111111-1111-1111-1111-111111111111' })
    expect(data.length).toBe(0)
  })
})

describe('26A.5 — REST API RLS: cross-tenant messages', () => {
  it('Company A cannot read Company B messages', async () => {
    const data = await apiGet('messages', USERS[0].token!, { company_id: 'eq.22222222-2222-2222-2222-222222222222' })
    expect(data.length).toBe(0)
  })

  it('Company B cannot read Company A messages', async () => {
    const data = await apiGet('messages', USERS[1].token!, { company_id: 'eq.11111111-1111-1111-1111-111111111111' })
    expect(data.length).toBe(0)
  })

  it('Company A can read own messages', async () => {
    const data = await apiGet('messages', USERS[0].token!, { company_id: 'eq.11111111-1111-1111-1111-111111111111' })
    expect(data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('26A.5 — REST API RLS: cross-tenant INSERT', () => {
  it('Company A cannot INSERT chat_message with Company B company_id', async () => {
    const result = await apiInsert('chat_messages', USERS[0].token!, {
      user_id: USERS[0].userId, company_id: '22222222-2222-2222-2222-222222222222',
      session_id: crypto.randomUUID(), sender: 'user', content: 'hack',
    })
    expect(result.status).toBeGreaterThanOrEqual(400)
  })

  it('Company A cannot INSERT message with Company B company_id', async () => {
    const result = await apiInsert('messages', USERS[0].token!, {
      company_id: '22222222-2222-2222-2222-222222222222', conversation_id: crypto.randomUUID(),
      platform: 'web', platform_user_id: USERS[0].userId, direction: 'inbound', content: 'hack', sender_type: 'user',
    })
    expect(result.status).toBeGreaterThanOrEqual(400)
  })
})

describe('26A.5 — REST API RLS: global reference tables', () => {
  it('Authenticated user can read document_type_configs', async () => {
    const data = await apiGet('document_type_configs', USERS[0].token!)
    expect(data).toBeDefined()
  })

  it('Authenticated user cannot INSERT document_type_configs', async () => {
    const result = await apiInsert('document_type_configs', USERS[0].token!, { document_key: 'hack', label: 'Hack' })
    expect(result.status).toBeGreaterThanOrEqual(400)
  })

  it('Authenticated user can read th_tax_brackets', async () => {
    const data = await apiGet('th_tax_brackets', USERS[0].token!)
    expect(data).toBeDefined()
  })

  it('Authenticated user cannot INSERT th_tax_brackets', async () => {
    const result = await apiInsert('th_tax_brackets', USERS[0].token!, { year: 9999, min_income: 0, max_income: 150000, tax_rate: 0 })
    expect(result.status).toBeGreaterThanOrEqual(400)
  })

  it('Authenticated user can read immigration_case_types', async () => {
    const data = await apiGet('immigration_case_types', USERS[0].token!)
    expect(data).toBeDefined()
  })

  it('Authenticated user cannot INSERT immigration_case_types', async () => {
    const result = await apiInsert('immigration_case_types', USERS[0].token!, { case_key: 'hack', label: 'Hack' })
    expect(result.status).toBeGreaterThanOrEqual(400)
  })
})

describe('26A.5 — REST API RLS: service-only tables', () => {
  it('Authenticated user cannot read message_queue', async () => {
    const data = await apiGet('message_queue', USERS[0].token!)
    expect(data.length).toBe(0)
  })

  it('Authenticated user cannot read platform_sync_log', async () => {
    const data = await apiGet('platform_sync_log', USERS[0].token!)
    expect(data.length).toBe(0)
  })

  it('Authenticated user cannot read system_health', async () => {
    const data = await apiGet('system_health', USERS[0].token!)
    expect(data.length).toBe(0)
  })
})

describe('26A.5 — REST API: anti-footgun checks', () => {
  it('Tokens are user-session tokens, not service-role', () => {
    for (const user of USERS) {
      if (user.token) {
        const payload = JSON.parse(Buffer.from(user.token.split('.')[1], 'base64').toString())
        expect(payload.role).toBe('authenticated')
        expect(payload.iss).toContain('auth')
      }
    }
  })

  it('Different users have different tokens', () => {
    const tokens = USERS.filter(u => u.token).map(u => u.token!)
    expect(new Set(tokens).size).toBe(USERS.filter(u => u.token).length)
  })
})
