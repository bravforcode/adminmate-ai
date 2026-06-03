import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCandidate } from '../../hooks/useCandidates'
import { useAuthStore } from '../../stores/authStore'
import { UserPlus } from 'lucide-react'

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
    await createCandidate.mutateAsync({ ...data, company_id: company?.id })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus size={20} className="text-primary" />
        <h3 className="font-semibold">Add Candidate</h3>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Full Name *</label>
        <input {...register('full_name')} data-testid="candidate-name" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Somchai Jaidee" />
        {errors.full_name && <p className="text-error text-xs mt-1">{errors.full_name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input {...register('email')} type="email" data-testid="candidate-email" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input {...register('phone')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Current Position</label>
          <input {...register('current_position')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input {...register('location')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Bangkok" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Source</label>
        <select {...register('source')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none">
          <option value="direct">Direct Application</option>
          <option value="linkedin">LinkedIn</option>
          <option value="referral">Referral</option>
          <option value="line">LINE</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="portal">Job Portal</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface">Cancel</button>
        <button type="submit" disabled={createCandidate.isPending} data-testid="save-candidate" className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {createCandidate.isPending ? 'Saving...' : 'Save Candidate'}
        </button>
      </div>
    </form>
  )
}
