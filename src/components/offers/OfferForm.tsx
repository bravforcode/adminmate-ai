import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateOffer } from '../../hooks/useOffers'
import { useUpdateApplicationStatus } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { Sparkles } from 'lucide-react'
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
    await createOffer.mutateAsync({ ...data, company_id: company?.id, benefits: data.benefits?.split('\n').filter(Boolean), status: 'draft' })
    if (applicationId) await updateStatus.mutateAsync({ id: applicationId, status: 'offered' })
    toast.success('Offer created. Click Generate to create PDF.')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2 mb-4"><Sparkles size={20} className="text-primary" /><h3 className="font-semibold">Create Offer Letter</h3></div>
      <div>
        <label className="block text-sm font-medium mb-1">Position Title *</label>
        <input {...register('position_title')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
        {errors.position_title && <p className="text-error text-xs mt-1">{errors.position_title.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Salary Offered *</label>
          <input {...register('salary_offered')} type="number" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
          {errors.salary_offered && <p className="text-error text-xs mt-1">{errors.salary_offered.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <select {...register('salary_currency')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none">
            <option value="THB">THB</option><option value="VND">VND</option><option value="IDR">IDR</option><option value="USD">USD</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <input {...register('start_date')} type="date" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
          {errors.start_date && <p className="text-error text-xs mt-1">{errors.start_date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Work Hours</label>
          <input {...register('work_hours')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Benefits (one per line)</label>
        <textarea {...register('benefits')} rows={3} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="Health insurance&#10;Annual leave: 12 days&#10;Provident fund" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Special Conditions</label>
        <textarea {...register('special_conditions')} rows={2} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-on-surface-variant">Cancel</button>
        <button type="submit" disabled={createOffer.isPending} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {createOffer.isPending ? 'Creating...' : 'Create Offer'}
        </button>
      </div>
    </form>
  )
}
