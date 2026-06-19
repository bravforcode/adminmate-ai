import { supabase } from '../../lib/supabase'

/* ============================================================
   Contract Template Service
   Manages contract templates with variable schemas.
   ============================================================ */

export interface ContractTemplate {
  id: string
  company_id: string
  legal_entity_id?: string
  country_code: string
  employee_type: string
  template_key: string
  name: string
  language_code: string
  body_template: string
  variables_schema: Array<{ name: string; type: string; required: boolean; label: string }>
  version_number: number
  is_active: boolean
  requires_legal_review: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export async function getContractTemplates(companyId: string): Promise<ContractTemplate[]> {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as ContractTemplate[]
}

export async function getActiveContractTemplates(companyId: string): Promise<ContractTemplate[]> {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? []) as unknown as ContractTemplate[]
}

export async function createContractTemplate(
  template: Omit<ContractTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<ContractTemplate> {
  const { data, error } = await supabase
    .from('contract_templates')
    .insert(template)
    .select()
    .single()
  if (error) throw error
  return data as unknown as ContractTemplate
}

export async function updateContractTemplate(
  id: string,
  updates: Partial<ContractTemplate>
): Promise<ContractTemplate> {
  const { data, error } = await supabase
    .from('contract_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as ContractTemplate
}

/**
 * Render a contract template with provided variables.
 * Returns missing variables if any required variables are missing.
 */
export function renderContractTemplate(
  bodyTemplate: string,
  variables: Record<string, string>,
  schema: Array<{ name: string; required: boolean }>
): { rendered: string; missing: string[] } {
  let rendered = bodyTemplate
  const missing: string[] = []

  for (const field of schema) {
    const value = variables[field.name]
    if (field.required && (!value || value.trim() === '')) {
      missing.push(field.name)
    }
    const placeholder = `{{${field.name}}}`
    rendered = rendered.replace(placeholder, value ?? `[${field.name}]`)
  }

  return { rendered, missing }
}
