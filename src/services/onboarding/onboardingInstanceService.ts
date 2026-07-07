import { supabase } from '../../lib/supabase'

/* ============================================================
   Onboarding Instance Service
   Creates onboarding from hired candidates, tracks progress.
   ============================================================ */

export type OnboardingStatus = 'draft' | 'active' | 'waiting_for_candidate' | 'waiting_for_hr' | 'completed' | 'cancelled'
export type ItemStatus = 'pending' | 'requested' | 'uploaded' | 'verified' | 'rejected' | 'missing' | 'completed' | 'skipped'

export interface OnboardingInstance {
  id: string
  company_id: string
  candidate_id?: string
  application_id?: string
  employee_id?: string
  job_id?: string
  legal_entity_id?: string
  template_id?: string
  status: OnboardingStatus
  started_at: string
  completed_at?: string
  completed_by?: string
  override_completed: boolean
  override_reason?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface OnboardingInstanceItem {
  id: string
  company_id: string
  onboarding_instance_id: string
  template_item_id?: string
  item_type: string
  title: string
  description?: string
  required: boolean
  status: ItemStatus
  due_date?: string
  assigned_to?: string
  completed_by?: string
  completed_at?: string
  rejection_reason?: string
  skip_reason?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * Create onboarding instance from hired candidate.
 * Uses template to generate required items.
 */
export async function createOnboardingFromHired(
  companyId: string,
  candidateId: string,
  applicationId?: string,
  jobId?: string,
  createdBy?: string
): Promise<OnboardingInstance> {
  // Check for existing active onboarding
  const { data: existing } = await supabase
    .from('onboarding_instances')
    .select('id')
    .eq('company_id', companyId)
    .eq('candidate_id', candidateId)
    .in('status', ['draft', 'active', 'waiting_for_candidate', 'waiting_for_hr'])
    .maybeSingle()

  if (existing) throw new Error('Active onboarding already exists for this candidate')

  // Find best matching template (default for company)
  const { data: template } = await supabase
    .from('onboarding_templates')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_default', true)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  // Create instance
  const { data: instance, error: instErr } = await supabase
    .from('onboarding_instances')
    .insert({
      company_id: companyId,
      candidate_id: candidateId,
      application_id: applicationId || null,
      job_id: jobId || null,
      template_id: template?.id || null,
      status: 'active',
      created_by: createdBy,
    })
    .select()
    .single()
  if (instErr) throw instErr

  // Create items from template
  if (template) {
    const { data: templateItems } = await supabase
      .from('onboarding_template_items')
      .select('*')
      .eq('template_id', template.id)
      .order('sort_order')

    if (templateItems && templateItems.length > 0) {
      const items = templateItems.map(ti => ({
        company_id: companyId,
        onboarding_instance_id: instance.id,
        template_item_id: ti.id,
        item_type: ti.item_type,
        title: ti.title,
        description: ti.description,
        required: ti.required,
        status: 'pending' as const,
        due_date: ti.due_days_after_hire
          ? new Date(Date.now() + ti.due_days_after_hire * 86400000).toISOString().split('T')[0]
          : null,
        metadata: ti.metadata || {},
      }))
      await supabase.from('onboarding_instance_items').insert(items)
    }
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: createdBy,
    action: 'onboarding.created',
    resource_type: 'onboarding_instance',
    resource_id: instance.id,
    details: JSON.stringify({ candidate_id: candidateId, template_id: template?.id }),
  })

  return instance as unknown as OnboardingInstance
}

export async function getOnboardingInstance(id: string): Promise<OnboardingInstance | null> {
  const { data, error } = await supabase
    .from('onboarding_instances')
    .select('*, onboarding_instance_items(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as OnboardingInstance | null
}

export async function listOnboardingInstances(
  companyId: string,
  filters?: { status?: string; jobId?: string }
): Promise<OnboardingInstance[]> {
  let query = supabase
    .from('onboarding_instances')
    .select('*, candidates(full_name), jobs(title), onboarding_instance_items(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.jobId) query = query.eq('job_id', filters.jobId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as OnboardingInstance[]
}

/**
 * Calculate completion percentage from instance items.
 */
export async function calculateCompletion(instanceId: string): Promise<{ percentage: number; totalRequired: number; completedRequired: number; totalItems: number; completedItems: number }> {
  const { data: items } = await supabase
    .from('onboarding_instance_items')
    .select('required, status')
    .eq('onboarding_instance_id', instanceId)

  if (!items || items.length === 0) return { percentage: 100, totalRequired: 0, completedRequired: 0, totalItems: 0, completedItems: 0 }

  const totalRequired = items.filter(i => i.required).length
  const completedRequired = items.filter(i => i.required && ['verified', 'completed', 'skipped'].includes(i.status)).length
  const totalItems = items.length
  const completedItems = items.filter(i => ['verified', 'completed', 'skipped'].includes(i.status)).length

  const percentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100

  return { percentage, totalRequired, completedRequired, totalItems, completedItems }
}

/**
 * Complete onboarding. Only allowed if all required items are complete.
 * Override requires reason and admin/hr_manager role.
 */
export async function completeOnboarding(
  instanceId: string,
  completedBy: string,
  overrideReason?: string
): Promise<void> {
  const { percentage, totalRequired, completedRequired } = await calculateCompletion(instanceId)

  if (totalRequired > 0 && completedRequired < totalRequired && !overrideReason) {
    throw new Error(`Cannot complete: ${totalRequired - completedRequired} required items remaining. Use override with reason.`)
  }

  const updates: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    completed_by: completedBy,
    updated_at: new Date().toISOString(),
  }
  if (overrideReason) {
    updates.override_completed = true
    updates.override_reason = overrideReason
  }

  const { error } = await supabase
    .from('onboarding_instances')
    .update(updates)
    .eq('id', instanceId)
  if (error) throw error

  // Audit log
  const { data: instance } = await supabase
    .from('onboarding_instances')
    .select('company_id')
    .eq('id', instanceId)
    .single()

  if (instance) {
    await supabase.from('audit_logs').insert({
      company_id: instance.company_id,
      user_id: completedBy,
      action: overrideReason ? 'onboarding.override_completed' : 'onboarding.completed',
      resource_type: 'onboarding_instance',
      resource_id: instanceId,
      details: JSON.stringify({
        percentage,
        override: !!overrideReason,
        override_reason: overrideReason,
      }),
    })
  }
}
