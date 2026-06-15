import { supabase } from '../lib/supabase'

export interface DocumentSignature {
  id: string
  company_id: string
  document_id: string
  signer_name: string
  signer_email: string
  signature_data: string | null
  signed_at: string | null
  ip_address: string | null
  status: 'pending' | 'signed' | 'declined'
  decline_reason: string | null
  verification_token: string
  created_at: string
  updated_at: string
}

export const signatureService = {
  requestSignature: async (companyId: string, documentId: string, signerInfo: { name: string; email: string }) => {
    const { data, error } = await supabase
      .from('document_signatures')
      .insert({
        company_id: companyId,
        document_id: documentId,
        signer_name: signerInfo.name,
        signer_email: signerInfo.email,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return data as DocumentSignature
  },

  signDocument: async (signatureId: string, signatureData: string, token: string, ipAddress?: string) => {
    const { data, error } = await supabase
      .from('document_signatures')
      .update({
        signature_data: signatureData,
        status: 'signed',
        signed_at: new Date().toISOString(),
        ip_address: ipAddress || null,
      })
      .eq('id', signatureId)
      .eq('verification_token', token)
      .eq('status', 'pending')
      .select()
      .single()
    if (error) throw error
    return data as DocumentSignature
  },

  declineSignature: async (signatureId: string, token: string, reason?: string) => {
    const { data, error } = await supabase
      .from('document_signatures')
      .update({
        status: 'declined',
        decline_reason: reason || null,
      })
      .eq('id', signatureId)
      .eq('verification_token', token)
      .eq('status', 'pending')
      .select()
      .single()
    if (error) throw error
    return data as DocumentSignature
  },

  getSignatures: async (documentId: string) => {
    const { data, error } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as DocumentSignature[]
  },

  getByVerificationToken: async (token: string) => {
    const { data, error } = await supabase
      .from('document_signatures')
      .select('*, documents(name, document_type, company_id)')
      .eq('verification_token', token)
      .single()
    if (error) throw error
    return data as DocumentSignature & { documents: { name: string; document_type: string; company_id: string } }
  },

  verifySignature: async (signatureId: string) => {
    const { data, error } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('id', signatureId)
      .single()
    if (error) throw error
    return data as DocumentSignature
  },

  deleteSignature: async (signatureId: string) => {
    const { error } = await supabase
      .from('document_signatures')
      .delete()
      .eq('id', signatureId)
      .eq('status', 'pending')
    if (error) throw error
  },
}
