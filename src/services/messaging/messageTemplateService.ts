import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'
import type { MessageChannel } from './providers/types'

/* ============================================================
   Message Template Service
   CRUD + versioning for bilingual message templates.
   ============================================================ */

export interface MessageTemplate {
  id: string
  company_id: string
  template_key: string
  template_type: string
  name: string
  description?: string
  default_channel: MessageChannel
  subject_template?: string
  body_template: string
  language_code: string
  variables_schema: Array<{ name: string; type: string; required: boolean }>
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export async function getTemplates(companyId: string): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as MessageTemplate[]
}

export async function getTemplatesByKey(companyId: string, templateKey: string): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('template_key', templateKey)
    .order('language_code')
  if (error) throw error
  return (data ?? []) as unknown as MessageTemplate[]
}

export async function getActiveTemplates(companyId: string): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as MessageTemplate[]
}

export async function createTemplate(
  template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<MessageTemplate> {
  const canWrite = await hasPermission('message_template', 'write')
  if (!canWrite) throw new Error('Requires message_template_write permission')

  const { data, error } = await supabase
    .from('message_templates')
    .insert(template)
    .select()
    .single()
  if (error) throw error
  return data as unknown as MessageTemplate
}

export async function updateTemplate(
  id: string,
  updates: Partial<MessageTemplate>
): Promise<MessageTemplate> {
  const canWrite = await hasPermission('message_template', 'write')
  if (!canWrite) throw new Error('Requires message_template_write permission')

  const { data, error } = await supabase
    .from('message_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as MessageTemplate
}

export async function toggleTemplateActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('message_templates')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTemplate(id: string): Promise<void> {
  const canWrite = await hasPermission('message_template', 'write')
  if (!canWrite) throw new Error('Requires message_template_write permission')

  const { error } = await supabase.from('message_templates').delete().eq('id', id)
  if (error) throw error
}
