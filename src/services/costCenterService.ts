import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

export interface CostCenter {
  id: string
  company_id: string
  legal_entity_id?: string
  business_unit_id?: string
  name: string
  code?: string
  description?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export async function getCostCenters(companyId: string): Promise<CostCenter[]> {
  const { data, error } = await supabase.from('cost_centers').select('*').eq('company_id', companyId).order('name')
  if (error) { logger.error('Failed to fetch cost centers', { error: error.message }); return [] }
  return data ?? []
}

export async function createCostCenter(cc: Omit<CostCenter, 'id' | 'created_at' | 'updated_at'>): Promise<CostCenter | null> {
  const { data, error } = await supabase.from('cost_centers').insert(cc).select().single()
  if (error) { logger.error('Failed to create cost center', { error: error.message }); return null }
  return data
}

export async function updateCostCenter(id: string, updates: Partial<CostCenter>): Promise<CostCenter | null> {
  const { data, error } = await supabase.from('cost_centers').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) { logger.error('Failed to update cost center', { error: error.message }); return null }
  return data
}

export async function deleteCostCenter(id: string): Promise<boolean> {
  const { error } = await supabase.from('cost_centers').delete().eq('id', id)
  if (error) { logger.error('Failed to delete cost center', { error: error.message }); return false }
  return true
}
