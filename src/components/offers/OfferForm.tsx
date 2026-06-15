import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateOffer } from '../../hooks/useOffers'
import { useUpdateApplicationStatus } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { Sparkles, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const offerSchema = z.object({
  application_id: z.string().min(1),
  candidate_id: z.string().min(1),
  job_id: z.string().min(1),
  position_title: z.string().min(1),
  salary_offered: z.coerce.number().min(1, 'Salary required'),
  salary_currency: z.string().default('THB'),
  employment_type: z.string().default('full_time'),
  start_date: z.string().min(1),
  work_hours: z.string().default('09:00-18:00'),
  benefits: z.string().optional(),
  special_conditions: z.string().optional(),
})

type FormData = z.infer<typeof offerSchema>

interface Props { applicationId?: string; onClose: () => void }

export function OfferForm({ applicationId, onClose }: Props) {
  const createOffer = useCreateOffer()
  const updateStatus = useUpdateApplicationStatus()
  const company = useAuthStore(s => s.company)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(offerSchema), defaultValues: { application_id: applicationId || '', salary_currency: company?.currency || 'THB', employment_type: 'full_time', work_hours: '09:00-18:00' } })

  const onSubmit = async (data: FormData) => {
    await createOffer.mutateAsync({ ...data, company_id: company?.id ?? '', benefits: data.benefits?.split('\n').filter(Boolean), status: 'draft' })
    if (applicationId) await updateStatus.mutateAsync({ id: applicationId, status: 'offered' })
    toast.success('Offer created. Click Generate to create PDF.')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2 mb-4"><Sparkles size={20} className="text-primary" /><h3 className="font-semibold">Create Offer Letter</h3></div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="offer-position">Position Title *</label>
        <input {...register('position_title')} id="offer-position" aria-required="true" aria-invalid={!!errors.position_title} aria-describedby={errors.position_title ? 'offer-position-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        {errors.position_title && <p id="offer-position-error" role="alert" className="text-error text-xs mt-1">{errors.position_title.message}</p>}
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="offer-salary">Salary Offered *</label>
          <input {...register('salary_offered')} id="offer-salary" type="number" aria-required="true" aria-invalid={!!errors.salary_offered} aria-describedby={errors.salary_offered ? 'offer-salary-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
          {errors.salary_offered && <p id="offer-salary-error" role="alert" className="text-error text-xs mt-1">{errors.salary_offered.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <select {...register('salary_currency')} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none">
            <option value="THB">THB</option><option value="VND">VND</option><option value="IDR">IDR</option><option value="USD">USD</option>
          </select>
        </div>
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="offer-start-date">Start Date *</label>
          <input {...register('start_date')} id="offer-start-date" type="date" aria-required="true" aria-invalid={!!errors.start_date} aria-describedby={errors.start_date ? 'offer-start-date-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
          {errors.start_date && <p id="offer-start-date-error" role="alert" className="text-error text-xs mt-1">{errors.start_date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Work Hours</label>
          <input {...register('work_hours')} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Benefits (one per line)</label>
        <textarea {...register('benefits')} rows={3} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder="Health insurance&#10;Annual leave: 12 days&#10;Provident fund" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Special Conditions</label>
        <textarea {...register('special_conditions')} rows={2} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
      </div>
      <div className="form-actions flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="default" type="submit" disabled={createOffer.isPending} loading={createOffer.isPending} icon={<Save size={16} />}>
          {createOffer.isPending ? 'Creating...' : 'Create Offer'}
        </Button>
      </div>
    </form>
  )
}
