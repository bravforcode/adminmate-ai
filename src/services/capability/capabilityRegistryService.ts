import { supabase } from '../../lib/supabase'

export type CapabilityStatus =
  | 'complete'
  | 'partial'
  | 'schema_only'
  | 'adapter_only'
  | 'functional_local'
  | 'sandbox_verified'
  | 'disabled_not_configured'
  | 'not_started'

export interface FeatureCapability {
  id: string
  feature_key: string
  module_name: string
  capability_status: CapabilityStatus
  owner: string | null
  dependencies: string[]
  permission_set: string[]
  plan_entitlement: string | null
  country_availability: string
  provider_requirement: string | null
  support_tier: string | null
  known_limitations: string | null
  evidence_links: string[]
  last_reviewed_at: string | null
  is_user_visible: boolean
  created_at: string
  updated_at: string
}

export interface CapabilityMatrix {
  total: number
  byStatus: Record<CapabilityStatus, number>
  byModule: Record<string, FeatureCapability[]>
  byPlan: Record<string, FeatureCapability[]>
  visible: FeatureCapability[]
  hidden: FeatureCapability[]
}

export async function getCapabilities(_companyId?: string): Promise<FeatureCapability[]> {
  const { data, error } = await supabase
    .from('feature_capabilities')
    .select('*')
    .order('module_name', { ascending: true })
    .order('feature_key', { ascending: true })

  if (error) {
    console.error('Failed to fetch capabilities:', error.message)
    return []
  }

  return (data as FeatureCapability[]) ?? []
}

export async function getCapability(featureKey: string): Promise<FeatureCapability | null> {
  const { data, error } = await supabase
    .from('feature_capabilities')
    .select('*')
    .eq('feature_key', featureKey)
    .single()

  if (error) {
    console.error(`Failed to fetch capability ${featureKey}:`, error.message)
    return null
  }

  return data as FeatureCapability
}

export async function updateCapabilityStatus(
  featureKey: string,
  status: CapabilityStatus,
): Promise<boolean> {
  const { error } = await supabase
    .from('feature_capabilities')
    .update({ capability_status: status, updated_at: new Date().toISOString() })
    .eq('feature_key', featureKey)

  if (error) {
    console.error(`Failed to update capability ${featureKey}:`, error.message)
    return false
  }

  return true
}

export async function getCapabilityMatrix(companyId?: string): Promise<CapabilityMatrix> {
  const capabilities = await getCapabilities(companyId)

  const byStatus = {} as Record<CapabilityStatus, number>
  const byModule: Record<string, FeatureCapability[]> = {}
  const byPlan: Record<string, FeatureCapability[]> = {}
  const visible: FeatureCapability[] = []
  const hidden: FeatureCapability[] = []

  for (const cap of capabilities) {
    byStatus[cap.capability_status] = (byStatus[cap.capability_status] ?? 0) + 1

    if (!byModule[cap.module_name]) byModule[cap.module_name] = []
    byModule[cap.module_name].push(cap)

    const plan = cap.plan_entitlement ?? 'unknown'
    if (!byPlan[plan]) byPlan[plan] = []
    byPlan[plan].push(cap)

    if (cap.is_user_visible) {
      visible.push(cap)
    } else {
      hidden.push(cap)
    }
  }

  return {
    total: capabilities.length,
    byStatus,
    byModule,
    byPlan,
    visible,
    hidden,
  }
}
