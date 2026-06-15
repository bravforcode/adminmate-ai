import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCandidate } from '../../hooks/useCandidates'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { UserPlus, Save } from 'lucide-react'

const candidateSchema = z.object({
  full_name: z.string().min(1, 'Name required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  current_position: z.string().optional(),
  location: z.string().optional(),
  source: z.string().default('direct'),
})

type CandidateFormData = z.infer<typeof candidateSchema>

interface CandidateFormProps { onClose: () => void }

export function CandidateForm({ onClose }: CandidateFormProps) {
  const createCandidate = useCreateCandidate()
  const company = useAuthStore(s => s.company)
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
        <UserPlus size={20} className="text-primary dark:text-[#93c5fd]" />
        <h3 className="font-semibold dark:text-[#f1f5f9]">Add Candidate</h3>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Full Name *</label>
        <input {...register('full_name')} data-testid="candidate-name" aria-required="true" aria-invalid={!!errors.full_name} aria-describedby={errors.full_name ? 'candidate-name-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder="Somchai Jaidee" />
        {errors.full_name && <p id="candidate-name-error" role="alert" className="text-error dark:text-[#f87171] text-xs mt-1">{errors.full_name.message}</p>}
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]" htmlFor="candidate-email">Email</label>
          <input {...register('email')} id="candidate-email" type="email" data-testid="candidate-email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'candidate-email-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Phone</label>
          <input {...register('phone')} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Current Position</label>
          <input {...register('current_position')} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Location</label>
          <input {...register('location')} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder="Bangkok" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Source</label>
        <select {...register('source')} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none">
          <option value="direct">Direct Application</option>
          <option value="linkedin">LinkedIn</option>
          <option value="referral">Referral</option>
          <option value="line">LINE</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="portal">Job Portal</option>
        </select>
      </div>
      <div className="form-actions flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="default" disabled={createCandidate.isPending} data-testid="save-candidate" loading={createCandidate.isPending} icon={<Save size={16} />}>
          {createCandidate.isPending ? 'Saving...' : 'Save Candidate'}
        </Button>
      </div>
    </form>
  )
}
