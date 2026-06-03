import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useScheduleInterview } from '../../hooks/useInterviews'
import { useUpdateApplicationStatus } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { Calendar } from 'lucide-react'

const interviewSchema = z.object({
  interviewer_name: z.string().min(1, 'Interviewer name required'),
  interviewer_email: z.string().email('Valid email required'),
  interview_type: z.string().default('phone_screen'),
  scheduled_at: z.string().min(1, 'Date/time required'),
  duration_minutes: z.coerce.number().min(15).default(60),
  location: z.string().optional(),
  meeting_link: z.string().url('Valid URL required').optional().or(z.literal('')),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof interviewSchema>

const TYPES = ['phone_screen', 'technical', 'behavioral', 'panel', 'hr', 'final']

interface Props { applicationId: string; onClose: () => void }

export function ScheduleInterviewForm({ applicationId, onClose }: Props) {
  const scheduleInterview = useScheduleInterview()
  const updateStatus = useUpdateApplicationStatus()
  const company = useAuthStore(s => s.company)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(interviewSchema), defaultValues: { interview_type: 'phone_screen', duration_minutes: 60 } })

  const onSubmit = async (data: FormData) => {
    await scheduleInterview.mutateAsync({ ...data, application_id: applicationId, company_id: company?.id })
    await updateStatus.mutateAsync({ id: applicationId, status: 'interviewing' })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2 mb-4"><Calendar size={20} className="text-primary" /><h3 className="font-semibold">Schedule Interview</h3></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Interviewer Name *</label>
          <input {...register('interviewer_name')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
          {errors.interviewer_name && <p className="text-error text-xs mt-1">{errors.interviewer_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Interviewer Email *</label>
          <input {...register('interviewer_email')} type="email" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
          {errors.interviewer_email && <p className="text-error text-xs mt-1">{errors.interviewer_email.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select {...register('interview_type')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none">
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
          <input {...register('duration_minutes')} type="number" min="15" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Date & Time *</label>
        <input {...register('scheduled_at')} type="datetime-local" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
        {errors.scheduled_at && <p className="text-error text-xs mt-1">{errors.scheduled_at.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input {...register('location')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="Meeting Room A" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Meeting Link</label>
          <input {...register('meeting_link')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="https://meet.google.com/..." />
          {errors.meeting_link && <p className="text-error text-xs mt-1">{errors.meeting_link.message}</p>}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-on-surface-variant">Cancel</button>
        <button type="submit" disabled={scheduleInterview.isPending} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {scheduleInterview.isPending ? 'Scheduling...' : 'Schedule Interview'}
        </button>
      </div>
    </form>
  )
}
