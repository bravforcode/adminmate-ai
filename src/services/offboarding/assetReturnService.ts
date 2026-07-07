import { supabase } from '../../lib/supabase'

/* ============================================================
   Asset Return Service
   Tracks physical asset returns during offboarding.
   ============================================================ */

export type AssetType = 'laptop' | 'phone' | 'access_card' | 'uniform' | 'vehicle' | 'tool' | 'document' | 'other'
export type AssetStatus = 'pending' | 'returned' | 'lost' | 'damaged' | 'deducted' | 'waived'

export interface AssetReturn {
  id: string
  company_id: string
  offboarding_case_id: string
  employee_user_id: string
  asset_name: string
  asset_type: AssetType
  asset_identifier?: string
  return_required: boolean
  status: AssetStatus
  return_due_date?: string
  returned_at?: string
  received_by?: string
  condition_notes?: string
  deduction_amount?: number
  deduction_currency?: string
  waiver_reason?: string
  created_at: string
  updated_at: string
}

export async function createAssetReturn(
  companyId: string,
  caseId: string,
  employeeUserId: string,
  input: { assetName: string; assetType: AssetType; assetIdentifier?: string; returnDueDate?: string }
): Promise<AssetReturn> {
  const { data, error } = await supabase
    .from('offboarding_asset_returns')
    .insert({
      company_id: companyId,
      offboarding_case_id: caseId,
      employee_user_id: employeeUserId,
      asset_name: input.assetName,
      asset_type: input.assetType,
      asset_identifier: input.assetIdentifier || null,
      return_due_date: input.returnDueDate || null,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as AssetReturn
}

export async function markAssetReturned(
  assetId: string,
  receivedBy: string,
  conditionNotes?: string
): Promise<void> {
  const { error } = await supabase
    .from('offboarding_asset_returns')
    .update({
      status: 'returned',
      returned_at: new Date().toISOString(),
      received_by: receivedBy,
      condition_notes: conditionNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
  if (error) throw error
}

export async function markAssetLostOrDamaged(
  assetId: string,
  status: 'lost' | 'damaged',
  notes: string
): Promise<void> {
  if (!notes || notes.trim().length < 3) throw new Error('Condition notes required for lost/damaged asset')
  const { error } = await supabase
    .from('offboarding_asset_returns')
    .update({ status, condition_notes: notes.trim(), updated_at: new Date().toISOString() })
    .eq('id', assetId)
  if (error) throw error
}

export async function waiveAsset(
  assetId: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 3) throw new Error('Waiver reason required')
  const { error } = await supabase
    .from('offboarding_asset_returns')
    .update({ status: 'waived', waiver_reason: reason.trim(), updated_at: new Date().toISOString() })
    .eq('id', assetId)
  if (error) throw error
}

export async function getAssetReturns(caseId: string): Promise<AssetReturn[]> {
  const { data, error } = await supabase
    .from('offboarding_asset_returns')
    .select('*')
    .eq('offboarding_case_id', caseId)
    .order('asset_name')
  if (error) throw error
  return (data ?? []) as unknown as AssetReturn[]
}
