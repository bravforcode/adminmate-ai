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

// Candidate service tests
describe('candidateService', () => {
  it('create returns new candidate', async () => {
    const { candidateService } = await import('../../src/services/candidateService')
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'c1', full_name: 'Somchai' }, error: null }) }),
      }),
    })
    const result = await candidateService.create({ full_name: 'Somchai', company_id: 'c1' })
    expect(result.full_name).toBe('Somchai')
  })
})
