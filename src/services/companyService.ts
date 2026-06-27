import { supabase } from '../lib/supabase'

export interface CreateCompanyData {
  name: string
  name_th?: string
  industry: string
  country: 'TH' | 'VN' | 'ID'
  tax_id?: string
  phone?: string
  email?: string
  address?: string
  city?: string
}

export const companyService = {
  getAll: async (companyId?: string) => {
    let query = supabase.from('companies').select('id, name, name_th, tax_id, phone, email, address, city, website_url, industry, country, currency, locale, timezone, subscription_tier')
    if (companyId) {
      query = query.eq('id', companyId)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  },

  getById: async (id: string) => {
    const { data, error } = await supabase.from('companies').select('id, name, name_th, tax_id, phone, email, address, city, website_url, industry, country, currency, locale, timezone, subscription_tier').eq('id', id).single()
    if (error) throw error
    return data
  },

  create: async (data: CreateCompanyData) => {
    const currency = data.country === 'TH' ? 'THB' : data.country === 'VN' ? 'VND' : 'IDR'
    const timezone = data.country === 'TH' ? 'Asia/Bangkok' : data.country === 'VN' ? 'Asia/Ho_Chi_Minh' : 'Asia/Jakarta'
    const locale = data.country === 'TH' ? 'th-TH' : data.country === 'VN' ? 'vi-VN' : 'id-ID'

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name: data.name,
        name_th: data.name_th,
        industry: data.industry,
        country: data.country,
        currency,
        timezone,
        locale,
        tax_id: data.tax_id,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
      })
      .select()
      .single()

    if (error) throw error
    return company
  },

  update: async (id: string, data: Partial<CreateCompanyData>) => {
    const { data: company, error } = await supabase
      .from('companies')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return company
  },
}
