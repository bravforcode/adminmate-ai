import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useCreateCandidate } from '../../hooks/useCandidates'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { UserPlus, Save } from 'lucide-react'

type CandidateFormData = {
  full_name: string
  email?: string
  phone?: string
  current_position?: string
  location?: string
  source: string
}

interface CandidateFormProps { onClose: () => void }

export function CandidateForm({ onClose }: CandidateFormProps) {
  const { t } = useTranslation(['recruitment', 'common'])
  const createCandidate = useCreateCandidate()
  const company = useAuthStore(s => s.company)
  const candidateSchema = z.object({
    full_name: z.string().min(1, t('candidates.name_required', { ns: 'recruitment' })),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    current_position: z.string().optional(),
    location: z.string().optional(),
    source: z.string().default('direct'),
  })
  const { register, handleSubmit, formState: { errors } } = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema), defaultValues: { source: 'direct' },
  })

  const onSubmit = async (data: CandidateFormData) => {
    await createCandidate.mutateAsync({ ...data, company_id: company?.id ?? '' })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus size={20} className="text-primary dark:text-primary-muted" />
        <h3 className="font-semibold text-ink">{t('candidates.add_candidate', { ns: 'recruitment' })}</h3>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-ink">{t('candidates.name', { ns: 'recruitment' })} *</label>
        <input {...register('full_name')} data-testid="candidate-name" aria-required="true" aria-invalid={!!errors.full_name} aria-describedby={errors.full_name ? 'candidate-name-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('candidates.name_placeholder', { ns: 'recruitment' })} />
        {errors.full_name && <p id="candidate-name-error" role="alert" className="text-destructive dark:text-destructive text-xs mt-1">{errors.full_name.message}</p>}
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-ink" htmlFor="candidate-email">{t('candidates.email', { ns: 'recruitment' })}</label>
          <input {...register('email')} id="candidate-email" type="email" data-testid="candidate-email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'candidate-email-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('candidates.phone', { ns: 'recruitment' })}</label>
          <input {...register('phone')} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('candidates.position', { ns: 'recruitment' })}</label>
          <input {...register('current_position')} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('candidates.position_placeholder', { ns: 'recruitment' })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('candidates.location', { ns: 'recruitment' })}</label>
          <input {...register('location')} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('candidates.location_placeholder', { ns: 'recruitment' })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-ink">{t('candidates.source', { ns: 'recruitment' })}</label>
        <select {...register('source')} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none">
          <option value="direct">{t('candidates.sources.direct', { ns: 'recruitment' })}</option>
          <option value="linkedin">{t('candidates.sources.linkedin', { ns: 'recruitment' })}</option>
          <option value="referral">{t('candidates.sources.referral', { ns: 'recruitment' })}</option>
          <option value="line">LINE</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="portal">{t('candidates.sources.portal', { ns: 'recruitment' })}</option>
        </select>
      </div>
      <div className="form-actions flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>{t('cancel', { ns: 'common' })}</Button>
        <Button type="submit" variant="default" disabled={createCandidate.isPending} data-testid="save-candidate" loading={createCandidate.isPending} icon={<Save size={16} />}>
          {createCandidate.isPending ? t('saving', { ns: 'common' }) : t('save', { ns: 'common' })}
        </Button>
      </div>
    </form>
  )
}
