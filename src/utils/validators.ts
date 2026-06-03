import { z } from 'zod'

export const emailSchema = z.string().email('Invalid email address')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
export const phoneSchema = z.string().regex(/^\+?[\d\s-]{8,15}$/, 'Invalid phone number')
export const taxIdSchema = z.string().min(5, 'Tax ID must be at least 5 characters')
export const requiredString = z.string().min(1, 'This field is required')
export const optionalString = z.string().optional()
export const urlSchema = z.string().url('Invalid URL').optional().or(z.literal(''))
