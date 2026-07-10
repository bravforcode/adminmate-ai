import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useScheduleInterview } from '../../hooks/useInterviews'
import { useUpdateApplicationStatus } from '../../hooks/useApplications'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { Calendar, Save } from 'lucide-react'

type FormData = {
  interviewer_name: string
  interviewer_email: string
  interview_type: string
  scheduled_at: string
  duration_minutes: number
  location?: string
  meeting_link?: string
  notes?: string
}

const TYPES = ['phone_screen', 'technical', 'behavioral', 'panel', 'hr', 'final']

interface Props { applicationId: string; onClose: () => void }

export function ScheduleInterviewForm({ applicationId, onClose }: Props) {
  const { t } = useTranslation('recruitment')
  const scheduleInterview = useScheduleInterview()
  const updateStatus = useUpdateApplicationStatus()
  const company = useAuthStore(s => s.company)
  const interviewSchema = useMemo(() => z.object({
    interviewer_name: z.string().min(1, t('interviews.form.interviewer_name_required')),
    interviewer_email: z.string().email(t('interviews.form.valid_email_required')),
    interview_type: z.string().default('phone_screen'),
    scheduled_at: z.string().min(1, t('interviews.form.datetime_required')),
    duration_minutes: z.coerce.number().min(15).default(60),
    location: z.string().optional(),
    meeting_link: z.string().url(t('interviews.form.valid_url_required')).optional().or(z.literal('')),
    notes: z.string().optional(),
  }), [t])
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(interviewSchema), defaultValues: { interview_type: 'phone_screen', duration_minutes: 60 } })

  const onSubmit = async (data: FormData) => {
    await scheduleInterview.mutateAsync({ ...data, application_id: applicationId, company_id: company?.id ?? '' })
    await updateStatus.mutateAsync({ id: applicationId, status: 'interviewing' })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2 mb-4"><Calendar size={20} className="text-primary dark:text-primary-muted" /><h3 className="font-semibold dark:text-ink">{t('interviews.form.title')}</h3></div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-ink" htmlFor="interviewer-name">{t('interviews.form.interviewer_name')} *</label>
          <input {...register('interviewer_name')} id="interviewer-name" aria-required="true" aria-invalid={!!errors.interviewer_name} aria-describedby={errors.interviewer_name ? 'interviewer-name-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
          {errors.interviewer_name && <p id="interviewer-name-error" role="alert" className="text-error dark:text-error text-xs mt-1">{errors.interviewer_name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-ink" htmlFor="interviewer-email">{t('interviews.form.interviewer_email')} *</label>
          <input {...register('interviewer_email')} id="interviewer-email" type="email" aria-required="true" aria-invalid={!!errors.interviewer_email} aria-describedby={errors.interviewer_email ? 'interviewer-email-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
          {errors.interviewer_email && <p id="interviewer-email-error" role="alert" className="text-error dark:text-error text-xs mt-1">{errors.interviewer_email.message}</p>}
        </div>
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-ink">{t('interviews.form.type')}</label>
          <select {...register('interview_type')} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none">
            {TYPES.map(type => <option key={type} value={type}>{t(`interviews.form.types.${type}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-ink">{t('interviews.form.duration')}</label>
          <input {...register('duration_minutes')} type="number" min="15" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
      </div>
      <div>
          <label className="block text-sm font-medium mb-1 dark:text-ink" htmlFor="scheduled-at">{t('interviews.form.datetime')} *</label>
          <input {...register('scheduled_at')} id="scheduled-at" type="datetime-local" aria-required="true" aria-invalid={!!errors.scheduled_at} aria-describedby={errors.scheduled_at ? 'scheduled-at-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
          {errors.scheduled_at && <p id="scheduled-at-error" role="alert" className="text-error dark:text-error text-xs mt-1">{errors.scheduled_at.message}</p>}
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-ink">{t('interviews.form.location')}</label>
          <input {...register('location')} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('interviews.form.location_placeholder')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-ink" htmlFor="meeting-link">{t('interviews.form.meeting_link')}</label>
          <input {...register('meeting_link')} id="meeting-link" aria-invalid={!!errors.meeting_link} aria-describedby={errors.meeting_link ? 'meeting-link-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('interviews.form.meeting_link_placeholder')} />
          {errors.meeting_link && <p id="meeting-link-error" role="alert" className="text-error dark:text-error text-xs mt-1">{errors.meeting_link.message}</p>}
        </div>
      </div>
      <div className="form-actions flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onClose}>{t('interviews.form.cancel')}</Button>
        <Button variant="default" type="submit" disabled={scheduleInterview.isPending} loading={scheduleInterview.isPending} icon={<Save size={16} />}>
          {scheduleInterview.isPending ? t('interviews.form.submitting') : t('interviews.form.submit')}
        </Button>
      </div>
    </form>
  )
}
