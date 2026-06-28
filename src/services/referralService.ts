import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

export interface EmployeeReferral {
  id: string
  company_id: string
  referrer_user_id: string
  candidate_id?: string
  application_id?: string
  job_id: string
  candidate_name: string
  candidate_email?: string
  candidate_phone?: string
  candidate_linkedin?: string
  relationship: string
  referral_notes?: string
  status: 'submitted' | 'reviewed' | 'interviewed' | 'hired' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  interviewed_at?: string
  hired_at?: string
  bonus_amount?: number
  bonus_currency: string
  bonus_status: 'pending' | 'approved' | 'paid' | 'rejected'
  bonus_paid_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface CreateReferralInput {
  company_id: string
  referrer_user_id: string
  job_id: string
  candidate_name: string
  candidate_email?: string
  candidate_phone?: string
  candidate_linkedin?: string
  relationship?: string
  referral_notes?: string
}

// Get all referrals for a company (HR/admin view)
export async function getReferrals(companyId: string): Promise<EmployeeReferral[]> {
  const { data, error } = await supabase
    .from('employee_referrals')
    .select('*')
    .eq('company_id', companyId)
    .order('submitted_at', { ascending: false })
  if (error) {
    logger.error('Failed to fetch referrals', { error: error.message })
    return []
  }
  return data ?? []
}

// Get referrals by referrer (employee's own referrals)
export async function getMyReferrals(userId: string, companyId: string): Promise<EmployeeReferral[]> {
  const { data, error } = await supabase
    .from('employee_referrals')
    .select('*')
    .eq('company_id', companyId)
    .eq('referrer_user_id', userId)
    .order('submitted_at', { ascending: false })
  if (error) {
    logger.error('Failed to fetch my referrals', { error: error.message })
    return []
  }
  return data ?? []
}

// Get single referral by id
export async function getReferralById(id: string): Promise<EmployeeReferral | null> {
  const { data, error } = await supabase
    .from('employee_referrals')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    logger.error('Failed to fetch referral', { error: error.message })
    return null
  }
  return data
}

// Create a new referral
export async function createReferral(input: CreateReferralInput): Promise<EmployeeReferral | null> {
  const { data, error } = await supabase
    .from('employee_referrals')
    .insert({
      ...input,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      bonus_status: 'pending',
    })
    .select()
    .single()
  if (error) {
    logger.error('Failed to create referral', { error: error.message })
    return null
  }
  return data
}

// Update referral status (HR/admin)
export async function updateReferralStatus(
  id: string,
  status: EmployeeReferral['status'],
  reason?: string
): Promise<EmployeeReferral | null> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'reviewed') updates.reviewed_at = new Date().toISOString()
  if (status === 'interviewed') updates.interviewed_at = new Date().toISOString()
  if (status === 'hired') updates.hired_at = new Date().toISOString()
  if (status === 'rejected' && reason) updates.rejection_reason = reason

  const { data, error } = await supabase
    .from('employee_referrals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) {
    logger.error('Failed to update referral status', { error: error.message })
    return null
  }
  return data
}

// Approve/set bonus for a referral
export async function setReferralBonus(
  id: string,
  amount: number,
  currency = 'THB'
): Promise<EmployeeReferral | null> {
  const { data, error } = await supabase
    .from('employee_referrals')
    .update({
      bonus_amount: amount,
      bonus_currency: currency,
      bonus_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    logger.error('Failed to set referral bonus', { error: error.message })
    return null
  }
  return data
}

// Mark bonus as paid
export async function markBonusPaid(id: string): Promise<EmployeeReferral | null> {
  const { data, error } = await supabase
    .from('employee_referrals')
    .update({
      bonus_status: 'paid',
      bonus_paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    logger.error('Failed to mark bonus paid', { error: error.message })
    return null
  }
  return data
}

// Delete a referral (admin only)
export async function deleteReferral(id: string): Promise<boolean> {
  const { error } = await supabase.from('employee_referrals').delete().eq('id', id)
  if (error) {
    logger.error('Failed to delete referral', { error: error.message })
    return false
  }
  return true
}
