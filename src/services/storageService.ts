import { supabase } from '../lib/supabase'

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateId(id: string, label: string): void {
  if (!id || !UUID_REGEX.test(id)) {
    throw new Error(`Invalid ${label}: must be a valid UUID`)
  }
}

function validateFileType(file: File, allowedTypes: string[]): void {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed. Allowed: ${allowedTypes.join(', ')}`)
  }
}

function validateFileSize(file: File, maxSize: number): void {
  if (file.size > maxSize) {
    const maxMb = maxSize / (1024 * 1024)
    throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds limit of ${maxMb}MB`)
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_')
}

export const storageService = {
  uploadCV: async (candidateId: string, file: File) => {
    validateId(candidateId, 'candidateId')
    validateFileType(file, ALLOWED_MIME_TYPES)
    validateFileSize(file, MAX_FILE_SIZE)

    const uniqueName = `${Date.now()}-${sanitizeFileName(file.name)}`
    const filePath = `${candidateId}/${uniqueName}`

    const { error } = await supabase.storage.from('cv-uploads').upload(filePath, file)
    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from('cv-uploads').getPublicUrl(filePath)
    return { path: filePath, url: publicUrl }
  },

  uploadLogo: async (companyId: string, file: File) => {
    validateId(companyId, 'companyId')
    validateFileType(file, ['image/png', 'image/jpeg', 'image/jpg'])
    validateFileSize(file, MAX_IMAGE_SIZE)

    const uniqueName = `logo-${Date.now()}-${sanitizeFileName(file.name)}`
    const filePath = `${companyId}/${uniqueName}`

    const { error } = await supabase.storage.from('company-logos').upload(filePath, file)
    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from('company-logos').getPublicUrl(filePath)
    return { path: filePath, url: publicUrl }
  },

  uploadAvatar: async (userId: string, file: File) => {
    validateId(userId, 'userId')
    validateFileType(file, ['image/png', 'image/jpeg', 'image/jpg'])
    validateFileSize(file, MAX_IMAGE_SIZE)

    const uniqueName = `avatar-${Date.now()}-${sanitizeFileName(file.name)}`
    const filePath = `${userId}/${uniqueName}`

    const { error } = await supabase.storage.from('avatars').upload(filePath, file)
    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return { path: filePath, url: publicUrl }
  },
}
