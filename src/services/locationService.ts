import { supabase } from '../lib/supabase'

export interface Location {
  id: string
  company_id: string
  legal_entity_id?: string
  name: string
  code?: string
  location_type: 'office' | 'branch' | 'store' | 'factory' | 'warehouse' | 'remote'
  country_code: string
  timezone?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state_province?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export async function getLocations(companyId: string): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').eq('company_id', companyId).order('name')
  if (error) { console.error('Failed to fetch locations:', error.message); return [] }
  return data ?? []
}

export async function createLocation(loc: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<Location | null> {
  const { data, error } = await supabase.from('locations').insert(loc).select().single()
  if (error) { console.error('Failed to create location:', error.message); return null }
  return data
}

export async function updateLocation(id: string, updates: Partial<Location>): Promise<Location | null> {
  const { data, error } = await supabase.from('locations').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) { console.error('Failed to update location:', error.message); return null }
  return data
}

export async function deleteLocation(id: string): Promise<boolean> {
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) { console.error('Failed to delete location:', error.message); return false }
  return true
}
