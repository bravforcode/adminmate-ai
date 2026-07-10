import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { companyService, CreateCompanyData } from '../../services/companyService'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Building2, Globe } from 'lucide-react'

const companySchema = z.object({
  name: z.string().min(1, 'Company name required'),
  name_th: z.string().optional(),
  industry: z.string().min(1, 'Industry required'),
  country: z.enum(['TH', 'VN', 'ID']),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  city: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

const COUNTRIES = [
  { value: 'TH', label: 'Thailand' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'ID', label: 'Indonesia' },
]

export function CompanySetupPage() {
  const { t } = useTranslation('common')
  const { user, setProfile, setCompany } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: { country: 'TH' },
  })
  const country = watch('country')

  const onSubmit = async (data: CompanyFormData) => {
    try {
      const company = await companyService.create(data as CreateCompanyData)
      if (user?.id) {
        await supabase.from('user_profiles').update({ company_id: company.id, role: 'admin' }).eq('id', user.id)
      }
      setCompany(company)
      setProfile({ ...useAuthStore.getState().profile!, company_id: company.id, role: 'admin' })
      toast.success(t('company.setup_complete'))
      navigate('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Company creation failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-sunken p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Building2 size={40} className="mx-auto text-primary mb-3" />
          <h1 className="text-headline-md font-bold text-ink">{t('company.setup_title')}</h1>
          <p className="text-body-md text-ink-variant mt-2">{t('company.setup_subtitle')}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-label-md text-ink-variant mb-1">{t('company.name')}</label>
              <input {...register('name')} data-testid="company-name"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder={t('auth.placeholder_company')} />
              {errors.name && <p className="text-error text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-label-md text-ink-variant mb-1">{t('company.name_th')}</label>
              <input {...register('name_th')}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                placeholder="" />
            </div>

            <div>
              <label className="block text-label-md text-ink-variant mb-1">{t('company.industry')}</label>
              <select {...register('industry')}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                <option value="">{t('auth.reg_select_industry')}</option>
                <option value="Technology">{t('auth.industry_technology')}</option>
                <option value="Finance">{t('auth.industry_finance')}</option>
                <option value="Healthcare">{t('auth.industry_healthcare')}</option>
                <option value="Manufacturing">{t('auth.industry_manufacturing')}</option>
                <option value="Retail">{t('auth.industry_retail')}</option>
                <option value="Education">{t('auth.industry_education')}</option>
                <option value="Logistics">{t('auth.industry_logistics')}</option>
                <option value="Other">{t('auth.industry_other')}</option>
              </select>
              {errors.industry && <p className="text-error text-sm mt-1">{errors.industry.message}</p>}
            </div>

            <div>
              <label className="block text-label-md text-ink-variant mb-1">{t('company.country')}</label>
              <div className="grid grid-cols-3 gap-2">
                {COUNTRIES.map(c => (
                  <label key={c.value} className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${country === c.value ? 'border-primary bg-primary-container/10' : 'border-border hover:border-primary/50'}`}>
                    <input type="radio" {...register('country')} value={c.value} className="sr-only" />
                    <span className="text-sm font-medium">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-label-md text-ink-variant mb-1">{t('company.tax_id')}</label>
              <input {...register('tax_id')}
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md text-ink-variant mb-1">{t('company.phone')}</label>
                <input {...register('phone')} type="tel"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-label-md text-ink-variant mb-1">{t('company.email')}</label>
                <input {...register('email')} type="email"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} data-testid="setup-company"
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              <Globe size={18} /> {isSubmitting ? t('company.creating') : t('company.create')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CompanySetupPage
