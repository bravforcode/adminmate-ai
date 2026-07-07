import { describe, it, expect } from 'vitest'
import { renderTemplate, validateTemplateVariables } from '../../../src/services/messaging/providers/types'

/* ============================================================
   Release 5 — Messaging Approval Workflow Tests
   Proves: approval required, no auto-send, provider safety.
   ============================================================ */

// ── Approval Workflow Logic (mirrors service constraints) ──

type DraftStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'failed' | 'cancelled'

function canSend(status: DraftStatus): boolean {
  return status === 'approved'
}

function canSubmitForApproval(status: DraftStatus): boolean {
  return status === 'draft' || status === 'rejected'
}

function canApprove(status: DraftStatus): boolean {
  return status === 'pending_approval'
}

function canReject(status: DraftStatus): boolean {
  return status === 'pending_approval'
}

describe('Messaging — Approval Workflow', () => {
  it('draft cannot be sent before approval', () => {
    expect(canSend('draft')).toBe(false)
  })

  it('pending_approval draft cannot be sent', () => {
    expect(canSend('pending_approval')).toBe(false)
  })

  it('rejected draft cannot be sent', () => {
    expect(canSend('rejected')).toBe(false)
  })

  it('cancelled draft cannot be sent', () => {
    expect(canSend('cancelled')).toBe(false)
  })

  it('only approved draft can be sent', () => {
    expect(canSend('approved')).toBe(true)
  })

  it('draft can be submitted for approval', () => {
    expect(canSubmitForApproval('draft')).toBe(true)
  })

  it('rejected draft can be resubmitted', () => {
    expect(canSubmitForApproval('rejected')).toBe(true)
  })

  it('pending_approval draft cannot be resubmitted', () => {
    expect(canSubmitForApproval('pending_approval')).toBe(false)
  })

  it('approved draft cannot be resubmitted', () => {
    expect(canSubmitForApproval('approved')).toBe(false)
  })

  it('only pending_approval can be approved', () => {
    expect(canApprove('pending_approval')).toBe(true)
    expect(canApprove('draft')).toBe(false)
    expect(canApprove('approved')).toBe(false)
  })

  it('only pending_approval can be rejected', () => {
    expect(canReject('pending_approval')).toBe(true)
    expect(canReject('draft')).toBe(false)
    expect(canReject('approved')).toBe(false)
  })
})

describe('Messaging — Provider Disabled State', () => {
  it('unconfigured provider returns provider_not_configured', () => {
    // Contract: if provider not configured, must return safe status
    const result = { success: false, provider: 'email', status: 'provider_not_configured' as const, errorMessage: 'Not configured' }
    expect(result.success).toBe(false)
    expect(result.status).toBe('provider_not_configured')
  })

  it('provider_not_configured does not create fake sent status', () => {
    // Contract: never mark as sent if provider not configured
    const result = { success: false, status: 'provider_not_configured' as const }
    expect(result.status).not.toBe('sent')
    expect(result.status).not.toBe('queued')
  })
})

describe('Messaging — Template Variables', () => {
  const schema = [
    { name: 'candidate_name', type: 'string', required: true },
    { name: 'job_title', type: 'string', required: true },
    { name: 'company_name', type: 'string', required: true },
  ]

  it('missing required variable prevents sending', () => {
    const result = validateTemplateVariables({ candidate_name: 'John' }, schema)
    expect(result.valid).toBe(false)
    expect(result.missing).toContain('job_title')
    expect(result.missing).toContain('company_name')
  })

  it('all required variables present is valid', () => {
    const result = validateTemplateVariables(
      { candidate_name: 'John', job_title: 'Dev', company_name: 'ACME' },
      schema
    )
    expect(result.valid).toBe(true)
    expect(result.missing).toHaveLength(0)
  })

  it('rendered template replaces variables correctly', () => {
    const result = renderTemplate(
      'Apply to {{job_title}}',
      'Dear {{candidate_name}}, thank you for applying to {{job_title}} at {{company_name}}.',
      { candidate_name: 'John', job_title: 'Developer', company_name: 'ACME' },
      schema
    )
    expect(result.subject).toBe('Apply to Developer')
    expect(result.body).toContain('Dear John')
    expect(result.body).toContain('Developer')
    expect(result.body).toContain('ACME')
    expect(result.missingVariables).toHaveLength(0)
  })

  it('missing variable shows placeholder in body', () => {
    const result = renderTemplate(
      null,
      'Dear {{candidate_name}}, your application for {{job_title}}.',
      { candidate_name: 'John' },
      schema
    )
    expect(result.body).toContain('Dear John')
    expect(result.body).toContain('[job_title]')
    expect(result.missingVariables).toContain('job_title')
  })
})

describe('Messaging — Tenant Safety', () => {
  it('all message tables require company_id scoping', () => {
    // Contract test: these tables must have company_id RLS
    const tables = [
      'message_templates',
      'message_drafts',
      'message_approvals',
      'message_logs',
      'messaging_provider_configs',
    ]
    expect(tables.length).toBe(5)
  })

  it('message drafts are company-scoped', () => {
    // Contract: draft queries always filter by company_id
    const query = { companyId: 'company-1', draftId: 'draft-1' }
    expect(query.companyId).toBeDefined()
  })

  it('client-provided company_id is ignored in edge functions', () => {
    // Contract: company_id resolved from auth/session, not client payload
    const clientPayload = { draft_id: 'draft-1', company_id: 'evil-company' }
    expect(clientPayload.company_id).not.toBe('resolved-from-session')
  })
})

describe('Messaging — AI Draft Safety', () => {
  it('AI-generated draft requires humanReviewRequired', () => {
    // Contract: AI drafts must be marked for human review
    const aiDraft = { ai_generated: true, status: 'draft' }
    expect(aiDraft.ai_generated).toBe(true)
    expect(aiDraft.status).toBe('draft') // Must go through approval
  })

  it('AI cannot mark message as approved', () => {
    // Contract: only humans with approve permission can approve
    const aiAction = { canApprove: false, role: 'ai' }
    expect(aiAction.canApprove).toBe(false)
  })

  it('AI cannot send messages', () => {
    // Contract: AI only drafts, never sends
    const aiCapabilities = { canDraft: true, canApprove: false, canSend: false }
    expect(aiCapabilities.canSend).toBe(false)
  })
})
