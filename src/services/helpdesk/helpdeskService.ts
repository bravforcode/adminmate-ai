import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   HR Helpdesk & Case Management Service
   Cases, comments (internal/private HR), knowledge base.

   RBAC:
   - helpdesk_read: view cases (employee sees own via RLS)
   - helpdesk_write: create/edit cases
   - helpdesk_assign: assign/reassign cases

   Employee sees own case. HR sees assigned/company cases.
   Private HR comments (is_internal=true) hidden from employees.
   SLA escalation sets status to 'escalated' when past due.
   ============================================================ */

// ── Types ──

export type CasePriority = 'low' | 'medium' | 'high' | 'urgent'
export type CaseStatus = 'open' | 'in_progress' | 'escalated' | 'resolved' | 'closed'

export interface HrCaseCategory {
  id: string
  company_id: string
  name: string
  description?: string
  default_priority: CasePriority
  sla_hours: number
  is_active: boolean
  created_at: string
}

export interface HrHelpdeskCase {
  id: string
  company_id: string
  requester_id: string
  assignee_id?: string
  category_id?: string
  subject: string
  description?: string
  priority: CasePriority
  status: CaseStatus
  sla_due_at?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface HrCaseComment {
  id: string
  company_id: string
  case_id: string
  author_id: string
  content: string
  is_internal: boolean
  created_at: string
}

export interface KbArticle {
  id: string
  company_id: string
  title: string
  content: string
  category?: string
  tags: string[]
  is_published: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

// ── Input Types ──

export interface CreateCaseInput {
  subject: string
  description?: string
  category_id?: string
  priority?: CasePriority
  assignee_id?: string
}

export interface CaseFilters {
  status?: CaseStatus
  priority?: CasePriority
  assignee_id?: string
  requester_id?: string
}

// ── Service ──

export const helpdeskService = {
  async createCase(input: CreateCaseInput, requesterId: string, companyId: string): Promise<HrHelpdeskCase> {
    if (!(await hasPermission('helpdesk', 'write'))) {
      throw new Error('Insufficient permissions: helpdesk_write required')
    }

    let priority = input.priority ?? 'medium'
    let slaHours = 24

    if (input.category_id) {
      const { data: cat } = await supabase
        .from('hr_case_categories')
        .select('default_priority, sla_hours')
        .eq('id', input.category_id)
        .eq('company_id', companyId)
        .single()
      if (cat) {
        priority = input.priority ?? cat.default_priority as CasePriority
        slaHours = cat.sla_hours
      }
    }

    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('hr_helpdesk_cases')
      .insert({
        company_id: companyId,
        requester_id: requesterId,
        assignee_id: input.assignee_id,
        category_id: input.category_id,
        subject: input.subject,
        description: input.description,
        priority,
        status: 'open',
        sla_due_at: slaDueAt,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create case: ${error.message}`)
    return data as HrHelpdeskCase
  },

  async getCase(caseId: string, userId: string, companyId: string): Promise<HrHelpdeskCase> {
    if (!(await hasPermission('helpdesk', 'read'))) {
      throw new Error('Insufficient permissions: helpdesk_read required')
    }
    const { data, error } = await supabase
      .from('hr_helpdesk_cases')
      .select('id, company_id, requester_id, assignee_id, category_id, subject, description, priority, status, sla_due_at, resolved_at, created_at, updated_at')
      .eq('id', caseId)
      .eq('company_id', companyId)
      .single()
    if (error || !data) throw new Error('Case not found')
    // RLS enforces employee sees only own; service adds extra guard
    const c = data as HrHelpdeskCase
    if (c.requester_id !== userId && c.assignee_id !== userId) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role:roles(name)')
        .eq('user_id', userId)
        .eq('company_id', companyId)
      const names = (roles as any[])?.map(r => r.role?.name) ?? []
      const isHr = names.some(n => ['owner', 'admin', 'hr_manager', 'hr_staff'].includes(n))
      if (!isHr) throw new Error('Access denied: not your case')
    }
    return c
  },

  async listCases(companyId: string, filters: CaseFilters = {}): Promise<HrHelpdeskCase[]> {
    if (!(await hasPermission('helpdesk', 'read'))) {
      throw new Error('Insufficient permissions: helpdesk_read required')
    }
    let query = supabase
      .from('hr_helpdesk_cases')
      .select('id, company_id, requester_id, assignee_id, category_id, subject, priority, status, sla_due_at, resolved_at, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id)
    if (filters.requester_id) query = query.eq('requester_id', filters.requester_id)

    const { data, error } = await query
    if (error) throw new Error(`Failed to list cases: ${error.message}`)
    return (data ?? []) as HrHelpdeskCase[]
  },

  async addComment(
    caseId: string,
    authorId: string,
    content: string,
    isInternal: boolean,
    companyId: string
  ): Promise<HrCaseComment> {
    if (!(await hasPermission('helpdesk', 'write'))) {
      throw new Error('Insufficient permissions: helpdesk_write required')
    }
    // Non-HR users cannot post internal comments
    if (isInternal) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role:roles(name)')
        .eq('user_id', authorId)
        .eq('company_id', companyId)
      const names = (roles as any[])?.map(r => r.role?.name) ?? []
      const isHr = names.some(n => ['owner', 'admin', 'hr_manager', 'hr_staff'].includes(n))
      if (!isHr) throw new Error('Only HR can post internal comments')
    }

    const { data, error } = await supabase
      .from('hr_case_comments')
      .insert({
        company_id: companyId,
        case_id: caseId,
        author_id: authorId,
        content,
        is_internal: isInternal,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to add comment: ${error.message}`)
    return data as HrCaseComment
  },

  async resolveCase(caseId: string, _resolvedBy: string, companyId: string): Promise<HrHelpdeskCase> {
    if (!(await hasPermission('helpdesk', 'write'))) {
      throw new Error('Insufficient permissions: helpdesk_write required')
    }
    const { data: existing } = await supabase
      .from('hr_helpdesk_cases')
      .select('status')
      .eq('id', caseId)
      .eq('company_id', companyId)
      .single()
    if (!existing) throw new Error('Case not found')
    if (existing.status === 'resolved' || existing.status === 'closed') {
      throw new Error(`Case is already ${existing.status}`)
    }

    const { data, error } = await supabase
      .from('hr_helpdesk_cases')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to resolve case: ${error.message}`)
    return data as HrHelpdeskCase
  },

  async escalateCase(caseId: string, companyId: string): Promise<HrHelpdeskCase> {
    if (!(await hasPermission('helpdesk', 'write'))) {
      throw new Error('Insufficient permissions: helpdesk_write required')
    }
    const { data: existing } = await supabase
      .from('hr_helpdesk_cases')
      .select('status, sla_due_at')
      .eq('id', caseId)
      .eq('company_id', companyId)
      .single()
    if (!existing) throw new Error('Case not found')
    if (existing.status === 'resolved' || existing.status === 'closed') {
      throw new Error(`Cannot escalate: case is ${existing.status}`)
    }

    const { data, error } = await supabase
      .from('hr_helpdesk_cases')
      .update({ status: 'escalated' })
      .eq('id', caseId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to escalate case: ${error.message}`)
    return data as HrHelpdeskCase
  },

  async listComments(caseId: string, userId: string, companyId: string): Promise<HrCaseComment[]> {
    if (!(await hasPermission('helpdesk', 'read'))) {
      throw new Error('Insufficient permissions: helpdesk_read required')
    }

    const isHr = await this.isHrRole(userId, companyId)

    let query = supabase
      .from('hr_case_comments')
      .select('id, company_id, case_id, author_id, content, is_internal, created_at')
      .eq('case_id', caseId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })

    if (!isHr) {
      query = query.eq('is_internal', false)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to list comments: ${error.message}`)
    return (data ?? []) as HrCaseComment[]
  },

  async isHrRole(userId: string, companyId: string): Promise<boolean> {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', userId)
      .eq('company_id', companyId)
    const names = (roles as any[])?.map(r => r.role?.name) ?? []
    return names.some(n => ['owner', 'admin', 'hr_manager', 'hr_staff'].includes(n))
  },
}
