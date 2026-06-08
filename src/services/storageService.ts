import { supabase } from '../lib/supabase'

export const storageService = {
  uploadCV: async (candidateId: string, file: File) => {
    const filePath = `${candidateId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error } = await supabase.storage.from('cv-uploads').upload(filePath, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('cv-uploads').getPublicUrl(filePath)
    return { path: filePath, url: publicUrl }
  },
  uploadLogo: async (companyId: string, file: File) => {
    const filePath = `${companyId}/logo-${Date.now()}`
    const { error } = await supabase.storage.from('company-logos').upload(filePath, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(filePath)
    return { path: filePath, url: publicUrl }
  },
  uploadAvatar: async (userId: string, file: File) => {
    const filePath = `${userId}/avatar-${Date.now()}`
    const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return { path: filePath, url: publicUrl }
  },
}
