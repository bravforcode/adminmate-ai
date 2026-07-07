import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = vi.hoisted(() => ({
  auth: { getSession: vi.fn() },
  functions: { invoke: vi.fn() },
}))

vi.mock('../../../src/lib/supabase', () => ({ supabase: mockSupabase }))

import { onboardingEmailService } from '../../../src/services/onboardingEmailService'

describe('onboardingEmailService', () => {
  beforeEach(() => vi.clearAllMocks())

  const mockNewHire = {
    id: 'u1',
    email: 'new@test.com',
    full_name: 'John Smith',
    start_date: '2024-02-01',
    company_id: 'c1',
  }

  beforeEach(() => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    })
    mockSupabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null })
  })

  describe('sendWelcomeEmail', () => {
    it('invokes send-email with welcome template', async () => {
      await onboardingEmailService.sendWelcomeEmail(mockNewHire)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          to: 'new@test.com',
          template: 'welcome',
          data: { fullName: 'John Smith', startDate: '2024-02-01' },
        },
      })
    })
  })

  describe('sendDocumentRequestEmail', () => {
    it('invokes send-email with document_request template', async () => {
      await onboardingEmailService.sendDocumentRequestEmail(
        { email: 'emp@test.com', full_name: 'Jane Doe' },
        'id_card',
        'https://upload.example.com/token123'
      )
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          to: 'emp@test.com',
          template: 'document_request',
          data: {
            fullName: 'Jane Doe',
            documentType: 'id_card',
            uploadUrl: 'https://upload.example.com/token123',
          },
        },
      })
    })
  })

  describe('sendDayOneEmail', () => {
    it('invokes with day_one_reminder type', async () => {
      await onboardingEmailService.sendDayOneEmail(mockNewHire)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          to: 'new@test.com',
          template: 'welcome',
          data: { fullName: 'John Smith', startDate: '2024-02-01', type: 'day_one_reminder' },
        },
      })
    })
  })

  describe('sendWeekOneCheckin', () => {
    it('invokes with week_one_checkin type', async () => {
      await onboardingEmailService.sendWeekOneCheckin(mockNewHire)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          to: 'new@test.com',
          template: 'welcome',
          data: { fullName: 'John Smith', startDate: '2024-02-01', type: 'week_one_checkin' },
        },
      })
    })
  })

  describe('send30DayReview', () => {
    it('invokes with 30_day_review type', async () => {
      await onboardingEmailService.send30DayReview(mockNewHire)
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          to: 'new@test.com',
          template: 'welcome',
          data: { fullName: 'John Smith', startDate: '2024-02-01', type: '30_day_review' },
        },
      })
    })
  })

  it('throws when not authenticated', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    await expect(onboardingEmailService.sendWelcomeEmail(mockNewHire)).rejects.toThrow('Not authenticated')
  })
})
