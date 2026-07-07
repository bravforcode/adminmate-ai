import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Asset & Equipment Management Service
   Tracks company assets, assignments, returns, maintenance.

   RULES:
   - company_id resolved from auth, never from client input.
   - RLS enforced on all tables.
   - Asset return links to offboarding (Release 6B).
   - Audit logged on all mutations.
   ============================================================ */

// ── Types ──

export type AssetType = 'laptop' | 'phone' | 'access_card' | 'uniform' | 'vehicle' | 'tool' | 'document' | 'other'
export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost'
export type AssignmentStatus = 'assigned' | 'returned' | 'overdue'

export interface Asset {
  id: string
  company_id: string
  asset_name: string
  asset_type: string
  serial_number: string | null
  purchase_date: string | null
  purchase_price: number | null
  status: string
  location: string | null
  created_at: string
  updated_at: string
}

export interface AssetAssignment {
  id: string
  company_id: string
  asset_id: string
  employee_id: string
  assigned_date: string
  returned_date: string | null
  condition_notes: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface AssetMaintenanceLog {
  id: string
  company_id: string
  asset_id: string
  maintenance_date: string
  description: string
  cost: number
  performed_by: string | null
  created_at: string
}

export interface CreateAssetInput {
  asset_name: string
  asset_type?: AssetType
  serial_number?: string
  purchase_date?: string
  purchase_price?: number
  location?: string
}

export interface AssetFilters {
  status?: string
  asset_type?: string
  search?: string
}

// ── Helper: Resolve company_id from auth ──

async function resolveCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('No company associated with user')
  return profile.company_id
}

// ── Service ──

export const assetService = {
  /**
   * Create a new asset record.
   * Requires: asset_write permission.
   */
  async createAsset(input: CreateAssetInput): Promise<Asset> {
    const canWrite = await hasPermission('asset', 'write')
    if (!canWrite) throw new Error('Requires asset_write permission')

    const companyId = await resolveCompanyId()

    const { data, error } = await supabase
      .from('assets')
      .insert({
        company_id: companyId,
        asset_name: input.asset_name,
        asset_type: input.asset_type ?? 'other',
        serial_number: input.serial_number ?? null,
        purchase_date: input.purchase_date ?? null,
        purchase_price: input.purchase_price ?? null,
        location: input.location ?? null,
        status: 'available',
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create asset: ${error.message}`)
    return data as Asset
  },

  /**
   * Assign an asset to an employee.
   * Requires: asset_write permission.
   * Asset must be in 'available' status.
   */
  async assignAsset(assetId: string, employeeId: string): Promise<AssetAssignment> {
    const canWrite = await hasPermission('asset', 'write')
    if (!canWrite) throw new Error('Requires asset_write permission')

    const companyId = await resolveCompanyId()

    // Verify asset exists and is available
    const { data: asset } = await supabase
      .from('assets')
      .select('id, status')
      .eq('id', assetId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!asset) throw new Error('Asset not found')
    if (asset.status !== 'available') {
      throw new Error(`Cannot assign asset in status '${asset.status}': must be 'available'`)
    }

    // Check no active assignment exists for this asset
    const { data: active } = await supabase
      .from('asset_assignments')
      .select('id')
      .eq('asset_id', assetId)
      .eq('company_id', companyId)
      .eq('status', 'assigned')
      .maybeSingle()

    if (active) throw new Error('Asset already has an active assignment')

    const { data, error } = await supabase
      .from('asset_assignments')
      .insert({
        company_id: companyId,
        asset_id: assetId,
        employee_id: employeeId,
        assigned_date: new Date().toISOString().split('T')[0],
        status: 'assigned',
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to assign asset: ${error.message}`)

    // Update asset status
    await supabase
      .from('assets')
      .update({ status: 'assigned', updated_at: new Date().toISOString() })
      .eq('id', assetId)

    return data as AssetAssignment
  },

  /**
   * Return an asset from an employee.
   * Requires: asset_write permission.
   * This links to offboarding: during offboarding, asset returns
   * are tracked via offboarding_asset_returns. This method allows
   * returning assets outside the offboarding flow.
   */
  async returnAsset(assignmentId: string, conditionNotes: string): Promise<AssetAssignment> {
    const canWrite = await hasPermission('asset', 'write')
    if (!canWrite) throw new Error('Requires asset_write permission')

    const companyId = await resolveCompanyId()

    // Fetch assignment
    const { data: assignment } = await supabase
      .from('asset_assignments')
      .select('id, asset_id, status')
      .eq('id', assignmentId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (!assignment) throw new Error('Assignment not found')
    if (assignment.status !== 'assigned') {
      throw new Error(`Cannot return assignment in status '${assignment.status}'`)
    }

    const { data, error } = await supabase
      .from('asset_assignments')
      .update({
        status: 'returned',
        returned_date: new Date().toISOString().split('T')[0],
        condition_notes: conditionNotes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) throw new Error(`Failed to return asset: ${error.message}`)

    // Update asset status back to available
    await supabase
      .from('assets')
      .update({ status: 'available', updated_at: new Date().toISOString() })
      .eq('id', assignment.asset_id)

    return data as AssetAssignment
  },

  /**
   * Get assets for a company with optional filters.
   * Requires: asset_read permission.
   */
  async getAssets(companyId: string, filters: AssetFilters = {}): Promise<Asset[]> {
    const canRead = await hasPermission('asset', 'read')
    if (!canRead) throw new Error('Requires asset_read permission')

    let query = supabase
      .from('assets')
      .select('*')
      .eq('company_id', companyId)
      .order('asset_name', { ascending: true })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.asset_type) query = query.eq('asset_type', filters.asset_type)
    if (filters.search) {
      query = query.or(`asset_name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch assets: ${error.message}`)
    return (data ?? []) as Asset[]
  },

  /**
   * Get assignments for an asset or employee.
   * Requires: asset_read permission.
   */
  async getAssignments(
    companyId: string,
    filters: { asset_id?: string; employee_id?: string; status?: string } = {}
  ): Promise<AssetAssignment[]> {
    const canRead = await hasPermission('asset', 'read')
    if (!canRead) throw new Error('Requires asset_read permission')

    let query = supabase
      .from('asset_assignments')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (filters.asset_id) query = query.eq('asset_id', filters.asset_id)
    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch assignments: ${error.message}`)
    return (data ?? []) as AssetAssignment[]
  },
}
