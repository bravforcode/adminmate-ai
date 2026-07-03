import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase chainable query builder
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'range', 'or']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: Function, reject?: Function) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error })
  }
  return chain
}

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('../permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

import {
  getTemplates,
  getTemplatesByKey,
  getActiveTemplates,
  createTemplate,
  updateTemplate,
  toggleTemplateActive,
  deleteTemplate,
} from './messageTemplateService'

import {
  getDrafts,
  getMyDrafts,
  getDraftById,
  createDraft,
  updateDraft,
  submitForApproval,
  cancelDraft,
  deleteDraft,
} from './messageDraftService'

import {
  getPendingApprovals,
  getApprovalsByDraft,
  approveMessage,
  rejectMessage,
  sendMessage,
} from './messageApprovalService'

describe('messageTemplateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('should return templates for company', async () => {
      const templates = [{ id: '1', name: 'Welcome', company_id: 'c1' }]
      mockFrom.mockReturnValue(createChain(templates))

      const result = await getTemplates('c1')
      expect(mockFrom).toHaveBeenCalledWith('message_templates')
      expect(result).toEqual(templates)
    })

    it('should throw on error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('DB error')))
      await expect(getTemplates('c1')).rejects.toThrow('DB error')
    })
  })

  describe('getTemplatesByKey', () => {
    it('should filter by template key', async () => {
      const templates = [{ id: '1', template_key: 'welcome', language_code: 'en' }]
      mockFrom.mockReturnValue(createChain(templates))

      const result = await getTemplatesByKey('c1', 'welcome')
      expect(result).toEqual(templates)
    })
  })

  describe('getActiveTemplates', () => {
    it('should filter by is_active', async () => {
      const templates = [{ id: '1', is_active: true }]
      mockFrom.mockReturnValue(createChain(templates))

      const result = await getActiveTemplates('c1')
      expect(result).toEqual(templates)
    })
  })

  describe('createTemplate', () => {
    it('should create template with permission check', async () => {
      const template = { id: '1', name: 'New Template', company_id: 'c1', template_key: 'test', template_type: 'notification', default_channel: 'email' as const, body_template: 'Hello', language_code: 'en', variables_schema: [], is_active: true }
      mockFrom.mockReturnValue(createChain(template))

      const result = await createTemplate(template)
      expect(result).toEqual(template)
    })

    it('should throw on DB error', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Insert failed')))
      await expect(createTemplate({ company_id: 'c1' } as any)).rejects.toThrow()
    })
  })

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const updated = { id: '1', name: 'Updated' }
      mockFrom.mockReturnValue(createChain(updated))

      const result = await updateTemplate('1', { name: 'Updated' })
      expect(result).toEqual(updated)
    })
  })

  describe('toggleTemplateActive', () => {
    it('should toggle active state', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await toggleTemplateActive('1', true)
      expect(mockFrom).toHaveBeenCalledWith('message_templates')
    })
  })

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await deleteTemplate('1')
      expect(mockFrom).toHaveBeenCalledWith('message_templates')
    })
  })
})

describe('messageDraftService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDrafts', () => {
    it('should return drafts for company', async () => {
      const drafts = [{ id: '1', status: 'draft', company_id: 'c1' }]
      mockFrom.mockReturnValue(createChain(drafts))

      const result = await getDrafts('c1')
      expect(result).toEqual(drafts)
    })

    it('should filter by status when provided', async () => {
      const drafts = [{ id: '1', status: 'pending_approval' }]
      mockFrom.mockReturnValue(createChain(drafts))

      const result = await getDrafts('c1', 'pending_approval')
      expect(result).toEqual(drafts)
    })
  })

  describe('getMyDrafts', () => {
    it('should return drafts for specific user', async () => {
      const drafts = [{ id: '1', created_by: 'u1' }]
      mockFrom.mockReturnValue(createChain(drafts))

      const result = await getMyDrafts('u1', 'c1')
      expect(result).toEqual(drafts)
    })
  })

  describe('getDraftById', () => {
    it('should return single draft', async () => {
      const draft = { id: '1', body: 'Hello' }
      mockFrom.mockReturnValue(createChain(draft))

      const result = await getDraftById('1')
      expect(result).toEqual(draft)
    })
  })

  describe('createDraft', () => {
    it('should create draft with draft status', async () => {
      const draft = { id: '1', body: 'Test', status: 'draft' }
      mockFrom.mockReturnValue(createChain(draft))

      const result = await createDraft({ company_id: 'c1', body: 'Test', channel: 'email', recipient_type: 'candidate', language_code: 'en', ai_generated: false } as any)
      expect(result).toEqual(draft)
    })
  })

  describe('submitForApproval', () => {
    it('should submit draft and create approval record', async () => {
      const draft = { id: '1', status: 'draft', company_id: 'c1' }
      const updated = { id: '1', status: 'pending_approval' }

      // First call: getDraftById, Second call: update, Third call: insert approval
      mockFrom
        .mockReturnValueOnce(createChain(draft))
        .mockReturnValueOnce(createChain(updated))
        .mockReturnValueOnce(createChain(null))

      const result = await submitForApproval('1')
      expect(result.status).toBe('pending_approval')
    })

    it('should throw if draft not found', async () => {
      mockFrom.mockReturnValue(createChain(null, new Error('Not found')))
      await expect(submitForApproval('999')).rejects.toThrow()
    })

    it('should throw if draft is already pending', async () => {
      const draft = { id: '1', status: 'pending_approval' }
      mockFrom.mockReturnValue(createChain(draft))
      await expect(submitForApproval('1')).rejects.toThrow('Cannot submit draft in status: pending_approval')
    })
  })

  describe('cancelDraft', () => {
    it('should cancel draft', async () => {
      mockFrom.mockReturnValue(createChain(null))
      await cancelDraft('1')
      expect(mockFrom).toHaveBeenCalledWith('message_drafts')
    })
  })

  describe('deleteDraft', () => {
    it('should delete draft', async () => {
      mockFrom.mockReturnValue(createChain(null))
      await deleteDraft('1')
      expect(mockFrom).toHaveBeenCalledWith('message_drafts')
    })
  })
})

describe('messageApprovalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPendingApprovals', () => {
    it('should return pending approvals', async () => {
      const approvals = [{ id: '1', approval_status: 'pending' }]
      mockFrom.mockReturnValue(createChain(approvals))

      const result = await getPendingApprovals('c1')
      expect(result).toEqual(approvals)
    })
  })

  describe('getApprovalsByDraft', () => {
    it('should return approvals for draft', async () => {
      const approvals = [{ id: '1', message_draft_id: 'd1' }]
      mockFrom.mockReturnValue(createChain(approvals))

      const result = await getApprovalsByDraft('d1')
      expect(result).toEqual(approvals)
    })
  })

  describe('approveMessage', () => {
    it('should approve and update draft status', async () => {
      const approval = { id: 'a1', approval_status: 'pending', company_id: 'c1', message_draft_id: 'd1' }
      const updated = { id: 'a1', approval_status: 'approved' }

      mockFrom
        .mockReturnValueOnce(createChain(approval))
        .mockReturnValueOnce(createChain(updated))
        .mockReturnValueOnce(createChain(null))
        .mockReturnValueOnce(createChain(null))

      const result = await approveMessage('a1', 'u1', 'Looks good')
      expect(result.approval_status).toBe('approved')
    })

    it('should throw if already approved', async () => {
      const approval = { id: 'a1', approval_status: 'approved' }
      mockFrom.mockReturnValue(createChain(approval))
      await expect(approveMessage('a1', 'u1')).rejects.toThrow('Cannot approve: already approved')
    })
  })

  describe('rejectMessage', () => {
    it('should reject with reason', async () => {
      const approval = { id: 'a1', approval_status: 'pending', company_id: 'c1', message_draft_id: 'd1' }
      const updated = { id: 'a1', approval_status: 'rejected' }

      mockFrom
        .mockReturnValueOnce(createChain(approval))
        .mockReturnValueOnce(createChain(updated))
        .mockReturnValueOnce(createChain(null))
        .mockReturnValueOnce(createChain(null))

      const result = await rejectMessage('a1', 'u1', 'Needs revision')
      expect(result.approval_status).toBe('rejected')
    })

    it('should throw if reason too short', async () => {
      await expect(rejectMessage('a1', 'u1', 'ab')).rejects.toThrow('Rejection reason is required')
    })
  })

  describe('sendMessage', () => {
    it('should send approved draft', async () => {
      const draft = { id: 'd1', status: 'approved', company_id: 'c1', channel: 'email', recipient_type: 'candidate', candidate_id: 'c1' }
      const log = { id: 'l1' }

      mockFrom
        .mockReturnValueOnce(createChain(draft))
        .mockReturnValueOnce(createChain(log))
        .mockReturnValueOnce(createChain(null))
        .mockReturnValueOnce(createChain(null))

      const result = await sendMessage('d1', 'u1')
      expect(result.success).toBe(true)
      expect(result.logId).toBe('l1')
    })

    it('should reject non-approved drafts', async () => {
      const draft = { id: 'd1', status: 'draft' }
      mockFrom.mockReturnValue(createChain(draft))

      const result = await sendMessage('d1', 'u1')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Only approved drafts can be sent')
    })

    it('should return error if draft not found', async () => {
      // Supabase returns {data: null, error} not a rejection
      const chain: Record<string, any> = {}
      const methods = ['select', 'eq', 'single']
      methods.forEach((m) => { chain[m] = vi.fn(() => chain) })
      chain.then = (resolve: Function) => resolve({ data: null, error: { message: 'Not found' } })
      mockFrom.mockReturnValue(chain)

      const result = await sendMessage('999', 'u1')
      expect(result.success).toBe(false)
    })
  })
})
