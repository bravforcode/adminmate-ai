import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Eye, EyeOff, UserPlus, Building2, Check } from 'lucide-react'
import { translateAuthError } from '../../utils/authErrors'
import { evaluatePassword } from '../../utils/passwordStrength'

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Name required'),
    companyName: z.string().min(2, 'Company name required'),
    email: z.string().email('Invalid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[0-9]/, 'Add a number'),
    confirmPassword: z.string(),
    country: z.enum(['TH', 'VN', 'ID']),
    industry: z.string().min(1, 'Industry required'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Education',
  'Logistics',
  'Other',
]

const COUNTRIES: Array<{ value: 'TH' | 'VN' | 'ID'; label: string }> = [
  { value: 'TH', label: 'Thailand' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'ID', label: 'Indonesia' },
]

export function RegisterForm() {
  const { t } = useTranslation('common')
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const defaultValues = useMemo<RegisterFormData>(
    () => ({
      fullName: '',
      companyName: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: 'TH',
      industry: '',
    }),
    []
  )

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<RegisterFormData>({
      resolver: zodResolver(registerSchema),
      defaultValues,
    })

  const passwordValue = useWatch({ control, name: 'password' }) ?? ''
  const strength = useMemo(() => evaluatePassword(passwordValue), [passwordValue])

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitError(null)
    try {
      const result = await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        companyName: data.companyName,
        country: data.country,
        industry: data.industry,
      })
      if (result.needsEmailVerification) {
        toast.success(t('auth.check_email'))
        navigate('/login', { replace: true })
        return
      }
      toast.success(t('auth.account_created'))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = translateAuthError(err, t)
      setSubmitError(message)
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="fullName" className="block text-label-md text-on-surface-variant mb-1">
          {t('auth.full_name')}
        </label>
        <input
          id="fullName"
          {...register('fullName')}
          type="text"
          autoComplete="name"
          data-testid="name-input"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="Somchai Jaidee"
        />
        {errors.fullName && <p className="text-error text-sm mt-1">{t('auth.error_name_required')}</p>}
      </div>

      <div>
        <label htmlFor="companyName" className="block text-label-md text-on-surface-variant mb-1">
          <span className="inline-flex items-center gap-1">
            <Building2 size={14} /> {t('auth.company_name')}
          </span>
        </label>
        <input
          id="companyName"
          {...register('companyName')}
          type="text"
          data-testid="company-name-input"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="TechNova Solutions Co., Ltd."
        />
        {errors.companyName && (
          <p className="text-error text-sm mt-1">{t('auth.error_company_required')}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="country" className="block text-label-md text-on-surface-variant mb-1">
            {t('company.country')}
          </label>
          <select
            id="country"
            {...register('country')}
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="industry" className="block text-label-md text-on-surface-variant mb-1">
            {t('company.industry')}
          </label>
          <select
            id="industry"
            {...register('industry')}
            data-testid="industry-input"
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">{t('common.select')}...</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {errors.industry && (
            <p className="text-error text-sm mt-1">{t('auth.error_industry_required')}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-label-md text-on-surface-variant mb-1">
          {t('auth.email')}
        </label>
        <input
          id="email"
          {...register('email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="you@company.com"
        />
        {errors.email && <p className="text-error text-sm mt-1">{t('auth.error_invalid_email')}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-label-md text-on-surface-variant mb-1">
          {t('auth.password')}
        </label>
        <div className="relative">
          <input
            id="password"
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            data-testid="password-input"
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
            tabIndex={-1}
            aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {passwordValue && (
          <div className="mt-2" data-testid="password-strength">
            <div className="h-1.5 w-full rounded-full bg-outline-variant overflow-hidden">
              <div
                className={`h-full ${strength.color} transition-all`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-on-surface-variant">
                {t(`auth.password_${strength.label}`)}
              </span>
              {strength.hints.length > 0 && (
                <span className="text-xs text-on-surface-variant">
                  {strength.hints[0]}
                </span>
              )}
            </div>
          </div>
        )}
        {errors.password && (
          <p className="text-error text-sm mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-label-md text-on-surface-variant mb-1">
          {t('auth.confirm_password')}
        </label>
        <input
          id="confirmPassword"
          {...register('confirmPassword')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="text-error text-sm mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-error/40 bg-error-container/40 text-error px-3 py-2 text-sm"
        >
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="register-button"
        className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <UserPlus size={18} />{' '}
        {isSubmitting ? t('auth.registering') : t('auth.create_account')}
      </button>

      <p className="text-center text-sm text-on-surface-variant mt-4">
        {t('auth.already_have_account')}{' '}
        <Link to="/login" className="text-primary hover:underline">
          {t('auth.sign_in')}
        </Link>
      </p>

      <p className="text-center text-xs text-on-surface-variant flex items-center justify-center gap-1">
        <Check size={12} /> {t('auth.admin_role_note')}
      </p>
    </form>
  )
}
