import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useScheduleInterview } from '../../hooks/useInterviews'
import { useUpdateApplicationStatus } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { Calendar, Save } from 'lucide-react'

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
    await scheduleInterview.mutateAsync({ ...data, application_id: applicationId, company_id: company?.id ?? '' })
    await updateStatus.mutateAsync({ id: applicationId, status: 'interviewing' })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2 mb-4"><Calendar size={20} className="text-primary dark:text-[#93c5fd]" /><h3 className="font-semibold dark:text-[#f1f5f9]">Schedule Interview</h3></div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]" htmlFor="interviewer-name">Interviewer Name *</label>
          <input {...register('interviewer_name')} id="interviewer-name" aria-required="true" aria-invalid={!!errors.interviewer_name} aria-describedby={errors.interviewer_name ? 'interviewer-name-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
          {errors.interviewer_name && <p id="interviewer-name-error" role="alert" className="text-error dark:text-[#f87171] text-xs mt-1">{errors.interviewer_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]" htmlFor="interviewer-email">Interviewer Email *</label>
          <input {...register('interviewer_email')} id="interviewer-email" type="email" aria-required="true" aria-invalid={!!errors.interviewer_email} aria-describedby={errors.interviewer_email ? 'interviewer-email-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
          {errors.interviewer_email && <p id="interviewer-email-error" role="alert" className="text-error dark:text-[#f87171] text-xs mt-1">{errors.interviewer_email.message}</p>}
        </div>
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Type</label>
          <select {...register('interview_type')} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none">
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Duration (minutes)</label>
          <input {...register('duration_minutes')} type="number" min="15" className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
      </div>
      <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]" htmlFor="scheduled-at">Date & Time *</label>
          <input {...register('scheduled_at')} id="scheduled-at" type="datetime-local" aria-required="true" aria-invalid={!!errors.scheduled_at} aria-describedby={errors.scheduled_at ? 'scheduled-at-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
          {errors.scheduled_at && <p id="scheduled-at-error" role="alert" className="text-error dark:text-[#f87171] text-xs mt-1">{errors.scheduled_at.message}</p>}
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]">Location</label>
          <input {...register('location')} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder="Meeting Room A" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-[#f1f5f9]" htmlFor="meeting-link">Meeting Link</label>
          <input {...register('meeting_link')} id="meeting-link" aria-invalid={!!errors.meeting_link} aria-describedby={errors.meeting_link ? 'meeting-link-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder="https://meet.google.com/..." />
          {errors.meeting_link && <p id="meeting-link-error" role="alert" className="text-error dark:text-[#f87171] text-xs mt-1">{errors.meeting_link.message}</p>}
        </div>
      </div>
      <div className="form-actions flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="default" type="submit" disabled={scheduleInterview.isPending} loading={scheduleInterview.isPending} icon={<Save size={16} />}>
          {scheduleInterview.isPending ? 'Scheduling...' : 'Schedule Interview'}
        </Button>
      </div>
    </form>
  )
}
