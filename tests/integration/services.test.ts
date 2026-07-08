import { describe, it, expect, vi } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), signInWithOAuth: vi.fn(), getUser: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), getSession: vi.fn() },
  storage: { from: vi.fn() },
  functions: { invoke: vi.fn() },
  channel: vi.fn(() => ({ on: vi.fn(), subscribe: vi.fn(() => ({})) })),
}))

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }))

// Auth service tests
describe('authService', () => {
  it('signIn calls supabase.auth.signInWithPassword', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: '1' } }, error: null })
    const { authService } = await import('../../src/services/authService')
    const result = await authService.signIn('test@test.com', 'pass123')
    expect(result.data.user.id).toBe('1')
  })

  it('signIn throws on error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: new Error('Invalid credentials') })
    const { authService } = await import('../../src/services/authService')
    await expect(authService.signIn('test@test.com', 'wrong')).rejects.toThrow()
  })

  it('signOut calls supabase.auth.signOut', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })
    const { authService } = await import('../../src/services/authService')
    await authService.signOut()
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })
})

// Job service tests
describe('jobService', () => {
  it('getAll filters by companyId', async () => {
    const { jobService } = await import('../../src/services/jobService')
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [{ id: 'j1', title: 'Dev' }], error: null }),
        }),
      }),
    })
    const jobs = await jobService.getAll('c1')
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe('Dev')
  })
})

// Candidate service tests — mass assignment protection
describe('candidateService', () => {
  it('create accepts typed CreateCandidateInput', async () => {
    const { candidateService } = await import('../../src/services/candidateService')
    const mockSelect = vi.fn()
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ count: 0, error: null }) })
      .mockReturnValueOnce({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', full_name: 'Somchai' }, error: null }) })
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'companies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { subscription_tier: 'pro' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'candidates') {
        return {
          select: mockSelect,
          insert: vi.fn().mockReturnValue({ select: mockSelect }),
        }
      }
      return {}
    })
    const result = await candidateService.create({ full_name: 'Somchai', company_id: 'c1' })
    expect(result.full_name).toBe('Somchai')
  })

  it('getById filters by company_id', async () => {
    const { candidateService } = await import('../../src/services/candidateService')
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'c1', full_name: 'Somchai' }, error: null })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: mockEq }),
      }),
    })
    const result = await candidateService.getById('c1', 'company-1')
    expect(result.id).toBe('c1')
    expect(mockEq).toHaveBeenCalledWith('company_id', 'company-1')
  })

  it('update accepts typed UpdateCandidateInput', async () => {
    const { candidateService } = await import('../../src/services/candidateService')
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', full_name: 'Updated' }, error: null }) }),
        }),
      }),
    })
    const result = await candidateService.update('c1', { full_name: 'Updated' })
    expect(result.full_name).toBe('Updated')
  })

})

// Application service tests — mass assignment protection
describe('applicationService', () => {
  it('create accepts typed CreateApplicationInput', async () => {
    const { applicationService } = await import('../../src/services/applicationService')
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'a1', job_id: 'j1' }, error: null }) }),
      }),
    })
    const result = await applicationService.create({ job_id: 'j1', candidate_email: 'a@b.com', company_id: 'c1' })
    expect(result.job_id).toBe('j1')
  })

  it('updateStatus scopes by companyId when provided', async () => {
    const { applicationService } = await import('../../src/services/applicationService')
    const mockSelect = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'a1', status: 'hired' }, error: null }) })
    const mockEq2 = vi.fn().mockReturnValue({ select: mockSelect })
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: mockEq1 }),
    })
    const result = await applicationService.updateStatus('a1', 'hired', 'Great fit', 'company-1')
    expect(result.status).toBe('hired')
    expect(mockEq2).toHaveBeenCalledWith('company_id', 'company-1')
  })

  it('updateStatus works without companyId (backward compat)', async () => {
    const { applicationService } = await import('../../src/services/applicationService')
    const mockSelect = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'a1', status: 'rejected' }, error: null }) })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: mockEq }),
    })
    const result = await applicationService.updateStatus('a1', 'rejected')
    expect(result.status).toBe('rejected')
  })
})

// Chat service tests — mass assignment protection
describe('chatService', () => {
  it('sendMessage accepts typed SendMessageInput', async () => {
    const { chatService } = await import('../../src/services/chatService')
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'm1', content: 'hello' }, error: null }) }),
      }),
    })
    const result = await chatService.sendMessage({ user_id: 'u1', company_id: 'c1', session_id: 's1', sender: 'user', content: 'hello' })
    expect(result.content).toBe('hello')
  })

  it('getMessages scopes by company_id', async () => {
    const { chatService } = await import('../../src/services/chatService')
    const mockOrder = vi.fn().mockResolvedValue({ data: [{ id: 'm1', content: 'hi' }], error: null })
    const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder })
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq1 }),
    })
    const result = await chatService.getMessages('s1', 'company-1')
    expect(result).toHaveLength(1)
    expect(mockEq2).toHaveBeenCalledWith('company_id', 'company-1')
  })
})
