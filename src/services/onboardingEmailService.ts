import { supabase } from '../lib/supabase'

interface NewHire {
  id: string
  email: string
  full_name: string
  start_date?: string
  company_id?: string
}

const FN = 'send-email'

async function invokeSendEmail(to: string, template: string, data: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await supabase.functions.invoke(FN, {
    body: { to, template, data },
  })
  if (res.error) throw res.error
  return res.data
}

export const onboardingEmailService = {
  sendWelcomeEmail(newHire: NewHire) {
    return invokeSendEmail(newHire.email, 'welcome', {
      fullName: newHire.full_name,
      startDate: newHire.start_date,
    })
  },

  sendDayOneEmail(newHire: NewHire) {
    return invokeSendEmail(newHire.email, 'welcome', {
      fullName: newHire.full_name,
      startDate: newHire.start_date,
      type: 'day_one_reminder',
    })
  },

  sendWeekOneCheckin(newHire: NewHire) {
    return invokeSendEmail(newHire.email, 'welcome', {
      fullName: newHire.full_name,
      startDate: newHire.start_date,
      type: 'week_one_checkin',
    })
  },

  send30DayReview(newHire: NewHire) {
    return invokeSendEmail(newHire.email, 'welcome', {
      fullName: newHire.full_name,
      startDate: newHire.start_date,
      type: '30_day_review',
    })
  },

  sendDocumentRequestEmail(recipient: { email: string; full_name: string }, documentType: string, uploadUrl: string) {
    return invokeSendEmail(recipient.email, 'document_request', {
      fullName: recipient.full_name,
      documentType,
      uploadUrl,
    })
  },
}
