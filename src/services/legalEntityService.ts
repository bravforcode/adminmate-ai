import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

export interface LegalEntity {
  id: string
  company_id: string
  name: string
  legal_name?: string
  registration_number?: string
  tax_id?: string
  country_code: string
  default_currency: string
  default_timezone: string
  address_line1?: string
  address_line2?: string
  city?: string
  state_province?: string
  postal_code?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export async function getLegalEntities(companyId: string): Promise<LegalEntity[]> {
  const { data, error } = await supabase
    .from('legal_entities')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) {
    logger.error('Failed to fetch legal entities', { error: error.message })
    return []
  }
  return data ?? []
}

export async function getLegalEntity(id: string): Promise<LegalEntity | null> {
  const { data, error } = await supabase
    .from('legal_entities')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    logger.error('Failed to fetch legal entity', { error: error.message })
    return null
  }
  return data
}

export async function createLegalEntity(entity: Omit<LegalEntity, 'id' | 'created_at' | 'updated_at'>): Promise<LegalEntity | null> {
  const { data, error } = await supabase
    .from('legal_entities')
    .insert(entity)
    .select()
    .single()
  if (error) {
    logger.error('Failed to create legal entity', { error: error.message })
    return null
  }
  return data
}

export async function updateLegalEntity(id: string, updates: Partial<LegalEntity>): Promise<LegalEntity | null> {
  const { data, error } = await supabase
    .from('legal_entities')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    logger.error('Failed to update legal entity', { error: error.message })
    return null
  }
  return data
}

export async function deleteLegalEntity(id: string): Promise<boolean> {
  const { error } = await supabase.from('legal_entities').delete().eq('id', id)
  if (error) {
    logger.error('Failed to delete legal entity', { error: error.message })
    return false
  }
  return true
}
