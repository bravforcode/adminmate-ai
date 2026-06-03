import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Eye, EyeOff, UserPlus } from 'lucide-react'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const { t } = useTranslation('common')
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.email, data.password, data.fullName)
      toast.success(t('auth.check_email'))
      navigate('/login')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">{t('auth.full_name')}</label>
        <input {...register('fullName')} type="text" data-testid="name-input"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="Somchai Jaidee" />
        {errors.fullName && <p className="text-error text-sm mt-1">{errors.fullName.message}</p>}
      </div>

      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">{t('auth.email')}</label>
        <input {...register('email')} type="email"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="you@company.com" />
        {errors.email && <p className="text-error text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">{t('auth.password')}</label>
        <div className="relative">
          <input {...register('password')} type={showPassword ? 'text' : 'password'}
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10"
            placeholder="••••••••" />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-error text-sm mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-label-md text-on-surface-variant mb-1">{t('auth.confirm_password')}</label>
        <input {...register('confirmPassword')} type="password"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="••••••••" />
        {errors.confirmPassword && <p className="text-error text-sm mt-1">{errors.confirmPassword.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting} data-testid="register-button"
        className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
        <UserPlus size={18} /> {isSubmitting ? t('auth.registering') : t('auth.create_account')}
      </button>

      <p className="text-center text-sm text-on-surface-variant mt-4">
        {t('auth.already_have_account')} <Link to="/login" className="text-primary hover:underline">{t('auth.sign_in')}</Link>
      </p>
    </form>
  )
}
