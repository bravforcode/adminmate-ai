import { supabase } from '../../lib/supabase'

/* ============================================================
   Contractor & Vendor Service
   Vendor companies, vendor workers, contractor engagements,
   contractor invoices with approval workflow.

   DESIGN PRINCIPLE:
   - Contractors are NOT employees. They live in separate tables.
   - Access expiry is enforced: cannot invoice past engagement end_date.
   - Invoice approval requires contractor_approve permission.
   ============================================================ */

// ── Types ──

export type VendorStatus = 'active' | 'inactive' | 'suspended'
export type WorkerStatus = 'active' | 'inactive' | 'terminated'
export type EngagementStatus = 'active' | 'completed' | 'terminated' | 'expired'
export type InvoiceStatus = 'pending' | 'approved' | 'rejected'

export interface VendorCompany {
  id: string
  company_id: string
  vendor_name: string
  contact_email?: string
  contact_phone?: string
  country_code?: string
  status: VendorStatus
  contract_start?: string
  contract_end?: string
  created_at: string
  updated_at: string
}

export interface VendorWorker {
  id: string
  company_id: string
  vendor_id: string
  worker_name: string
  worker_email?: string
  role?: string
  start_date?: string
  end_date?: string
  status: WorkerStatus
  created_at: string
  updated_at: string
}

export interface ContractorEngagement {
  id: string
  company_id: string
  vendor_id: string
  employee_id?: string
  contractor_name: string
  engagement_type: string
  start_date: string
  end_date: string
  daily_rate: number
  currency: string
  status: EngagementStatus
  created_at: string
  updated_at: string
}

export interface ContractorInvoice {
  id: string
  company_id: string
  engagement_id: string
  invoice_number: string
  amount: number
  currency: string
  invoice_date: string
  status: InvoiceStatus
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

// ── Input Types ──

export interface CreateVendorInput {
  vendor_name: string
  contact_email?: string
  contact_phone?: string
  country_code?: string
  contract_start?: string
  contract_end?: string
}

export interface CreateWorkerInput {
  vendor_id: string
  worker_name: string
  worker_email?: string
  role?: string
  start_date?: string
  end_date?: string
}

export interface CreateEngagementInput {
  vendor_id: string
  employee_id?: string
  contractor_name: string
  engagement_type: string
  start_date: string
  end_date: string
  daily_rate: number
  currency?: string
}

export interface SubmitInvoiceInput {
  engagement_id: string
  invoice_number: string
  amount: number
  currency?: string
  invoice_date: string
}

// ── Service ──

export const contractorService = {
  async createVendor(input: CreateVendorInput, companyId: string): Promise<VendorCompany> {
    const { data, error } = await supabase
      .from('vendor_companies')
      .insert({
        company_id: companyId,
        vendor_name: input.vendor_name,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone,
        country_code: input.country_code,
        contract_start: input.contract_start,
        contract_end: input.contract_end,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create vendor: ${error.message}`)
    return data as VendorCompany
  },

  async createWorker(input: CreateWorkerInput, companyId: string): Promise<VendorWorker> {
    const { data, error } = await supabase
      .from('vendor_workers')
      .insert({
        company_id: companyId,
        vendor_id: input.vendor_id,
        worker_name: input.worker_name,
        worker_email: input.worker_email,
        role: input.role,
        start_date: input.start_date,
        end_date: input.end_date,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create vendor worker: ${error.message}`)
    return data as VendorWorker
  },

  async createEngagement(input: CreateEngagementInput, companyId: string): Promise<ContractorEngagement> {
    if (input.end_date < input.start_date) {
      throw new Error('End date must be on or after start date')
    }
    const { data, error } = await supabase
      .from('contractor_engagements')
      .insert({
        company_id: companyId,
        vendor_id: input.vendor_id,
        employee_id: input.employee_id,
        contractor_name: input.contractor_name,
        engagement_type: input.engagement_type,
        start_date: input.start_date,
        end_date: input.end_date,
        daily_rate: input.daily_rate,
        currency: input.currency ?? 'THB',
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create engagement: ${error.message}`)
    return data as ContractorEngagement
  },

  async submitInvoice(input: SubmitInvoiceInput, companyId: string): Promise<ContractorInvoice> {
    const engagement = await this.getEngagementById(input.engagement_id, companyId)
    if (!engagement) throw new Error('Engagement not found')
    if (engagement.status !== 'active') throw new Error('Cannot invoice: engagement is not active')
    const today = new Date().toISOString().split('T')[0]
    if (engagement.end_date < today) throw new Error('Cannot invoice: engagement has expired')

    const { data, error } = await supabase
      .from('contractor_invoices')
      .insert({
        company_id: companyId,
        engagement_id: input.engagement_id,
        invoice_number: input.invoice_number,
        amount: input.amount,
        currency: input.currency ?? 'THB',
        invoice_date: input.invoice_date,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to submit invoice: ${error.message}`)
    return data as ContractorInvoice
  },

  async approveInvoice(invoiceId: string, approvedBy: string, companyId: string): Promise<ContractorInvoice> {
    const { data: existing, error: fetchErr } = await supabase
      .from('contractor_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .single()
    if (fetchErr || !existing) throw new Error('Invoice not found')
    if (existing.status !== 'pending') throw new Error(`Invoice is already ${existing.status}`)

    const { data, error } = await supabase
      .from('contractor_invoices')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to approve invoice: ${error.message}`)
    return data as ContractorInvoice
  },

  async rejectInvoice(invoiceId: string, companyId: string): Promise<ContractorInvoice> {
    const { data: existing, error: fetchErr } = await supabase
      .from('contractor_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .single()
    if (fetchErr || !existing) throw new Error('Invoice not found')
    if (existing.status !== 'pending') throw new Error(`Invoice is already ${existing.status}`)

    const { data, error } = await supabase
      .from('contractor_invoices')
      .update({ status: 'rejected' })
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .select()
      .single()
    if (error) throw new Error(`Failed to reject invoice: ${error.message}`)
    return data as ContractorInvoice
  },

  async getVendors(companyId: string): Promise<VendorCompany[]> {
    const { data, error } = await supabase
      .from('vendor_companies')
      .select('*')
      .eq('company_id', companyId)
      .order('vendor_name')
    if (error) throw new Error(`Failed to fetch vendors: ${error.message}`)
    return (data ?? []) as VendorCompany[]
  },

  async getEngagements(companyId: string): Promise<ContractorEngagement[]> {
    const { data, error } = await supabase
      .from('contractor_engagements')
      .select('*')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false })
    if (error) throw new Error(`Failed to fetch engagements: ${error.message}`)
    return (data ?? []) as ContractorEngagement[]
  },

  async getEngagementById(engagementId: string, companyId: string): Promise<ContractorEngagement | null> {
    const { data, error } = await supabase
      .from('contractor_engagements')
      .select('*')
      .eq('id', engagementId)
      .eq('company_id', companyId)
      .single()
    if (error && error.code !== 'PGRST116') throw new Error(`Failed to fetch engagement: ${error.message}`)
    return data as ContractorEngagement | null
  },

  async getInvoicesByEngagement(engagementId: string, companyId: string): Promise<ContractorInvoice[]> {
    const { data, error } = await supabase
      .from('contractor_invoices')
      .select('*')
      .eq('engagement_id', engagementId)
      .eq('company_id', companyId)
      .order('invoice_date', { ascending: false })
    if (error) throw new Error(`Failed to fetch invoices: ${error.message}`)
    return (data ?? []) as ContractorInvoice[]
  },
}
