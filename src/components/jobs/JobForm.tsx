import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useCreateJob } from '../../hooks/useJobs'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../ui/Button'
import { ArrowRight, ArrowLeft, Sparkles, Save } from 'lucide-react'
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from '../../utils/constants'

type JobFormData = {
  title: string
  title_th?: string
  department: string
  location: string
  employment_type: string
  experience_level: string
  headcount: number
  description?: string
  description_th?: string
  responsibilities?: string
  requirements?: string
  nice_to_have?: string
  skills_required?: string
  salary_min?: number
  salary_max?: number
  application_deadline?: string
}

interface JobFormProps {
  onClose: () => void
}

export function JobForm({ onClose }: JobFormProps) {
  const { t } = useTranslation('recruitment')
  const createJob = useCreateJob()
  const profile = useAuthStore(s => s.profile)
  const company = useAuthStore(s => s.company)
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const jobSchema = useMemo(() => z.object({
    title: z.string().min(1, t('jobs.title_required')),
    title_th: z.string().optional(),
    department: z.string().min(1, t('jobs.department_required')),
    location: z.string().min(1, t('jobs.location_required')),
    employment_type: z.string().default('full_time'),
    experience_level: z.string().default('mid'),
    headcount: z.coerce.number().min(1).default(1),
    description: z.string().optional(),
    description_th: z.string().optional(),
    responsibilities: z.string().optional(),
    requirements: z.string().optional(),
    nice_to_have: z.string().optional(),
    skills_required: z.string().optional(),
    salary_min: z.coerce.number().optional(),
    salary_max: z.coerce.number().optional(),
    application_deadline: z.string().optional(),
  }), [t])
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: { employment_type: 'full_time', experience_level: 'mid', headcount: 1 },
  })

  const handleGenerateJD = async () => {
    const title = watch('title')
    const department = watch('department')
    if (!title || !department) { toast.error(t('jobs.fill_first')); return }
    setGenerating(true)
    try {
      const { supabase } = await import('../../lib/supabase')
      const { data, error } = await supabase.functions.invoke('generate-jd', {
        body: { title, department, location: watch('location'), employmentType: watch('employment_type'), experienceLevel: watch('experience_level'), country: company?.country || 'TH', language: profile?.language_preference || 'en' }
      })
      if (error) throw new Error(t('jobs.ai_generation_failed'))
      const jd = data.data
      if (jd) {
        setValue('description', jd.description || '')
        setValue('description_th', jd.description_th || '')
        setValue('responsibilities', (jd.responsibilities || []).join('\n'))
        setValue('requirements', (jd.requirements || []).join('\n'))
        setValue('nice_to_have', (jd.nice_to_have || []).join('\n'))
        setValue('skills_required', (jd.skills_required || []).join(', '))
        setValue('salary_min', jd.salary_suggestion?.min || undefined)
        setValue('salary_max', jd.salary_suggestion?.max || undefined)
      }
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : t('jobs.ai_generation_failed')) }
    finally { setGenerating(false) }
  }

  // Required fields live on step 0 — if publish (step 2) fails validation,
  // jump back so the user actually sees the error messages.
  const onInvalid = (errs: typeof errors) => {
    if (errs.title || errs.department || errs.location) setStep(0)
  }

  const onSubmit = async (data: JobFormData) => {
    try {
      await createJob.mutateAsync({
        ...data,
        company_id: company?.id,
        created_by: profile?.id,
        responsibilities: data.responsibilities?.split('\n').filter(Boolean),
        requirements: data.requirements?.split('\n').filter(Boolean),
        nice_to_have: data.nice_to_have?.split('\n').filter(Boolean),
        skills_required: data.skills_required?.split(',').map(s => s.trim()).filter(Boolean),
        application_deadline: data.application_deadline || null,
        status: 'active',
        ai_generated: generating,
      })
      onClose()
    } catch {
      // error already surfaced via useCreateJob's onError toast
    }
  }

  const steps = [
    <div key="s0" className="space-y-4">
      <h3 className="font-semibold text-lg text-ink">{t('jobs.step_1')}</h3>
      <div>
        <label className="block text-sm font-medium mb-1 text-ink" htmlFor="job-title">{t('jobs.title_label')} *</label>
        <input {...register('title')} id="job-title" data-testid="job-title" aria-required="true" aria-invalid={!!errors.title} aria-describedby={errors.title ? 'job-title-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('jobs.title_placeholder')} />
        {errors.title && <p id="job-title-error" role="alert" className="text-destructive dark:text-destructive text-xs mt-1">{errors.title.message}</p>}
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-ink" htmlFor="job-department">{t('jobs.department')} *</label>
          <input {...register('department')} id="job-department" aria-required="true" aria-invalid={!!errors.department} aria-describedby={errors.department ? 'job-dept-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('jobs.department_placeholder')} />
          {errors.department && <p id="job-dept-error" role="alert" className="text-destructive dark:text-destructive text-xs mt-1">{errors.department.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-ink" htmlFor="job-location">{t('jobs.location')} *</label>
          <input {...register('location')} id="job-location" aria-required="true" aria-invalid={!!errors.location} aria-describedby={errors.location ? 'job-location-error' : undefined} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('jobs.location_placeholder')} />
          {errors.location && <p id="job-location-error" role="alert" className="text-destructive dark:text-destructive text-xs mt-1">{errors.location.message}</p>}
        </div>
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.type')}</label>
          <select {...register('employment_type')} data-testid="employment-type" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none">
            {EMPLOYMENT_TYPES.map(et => <option key={et.value} value={et.value}>{t(`employment.${et.value}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.experience')}</label>
          <select {...register('experience_level')} data-testid="experience-level" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none">
            {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{t(`experience.${l.value}`)}</option>)}
          </select>
        </div>
      </div>
    </div>,
    <div key="s1" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="font-semibold text-lg text-ink">{t('jobs.step_2')}</h3>
        <Button type="button" variant="default" onClick={handleGenerateJD} disabled={generating} data-testid="generate-with-ai" loading={generating} icon={<Sparkles size={16} />}>
          {generating ? t('jobs.generating') : t('jobs.generate_with_ai')}
        </Button>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.description_en')}</label>
        <textarea {...register('description')} data-testid="jd-description" rows={5} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.responsibilities')} {t('jobs.responsibilities_hint')}</label>
        <textarea {...register('responsibilities')} rows={6} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.requirements')}</label>
        <textarea {...register('requirements')} rows={6} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
      </div>
    </div>,
    <div key="s2" className="space-y-4">
      <h3 className="font-semibold text-lg text-ink">{t('jobs.step_3')}</h3>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.salary_min')}</label>
          <input {...register('salary_min')} type="number" data-testid="salary-min" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.salary_max')}</label>
          <input {...register('salary_max')} type="number" data-testid="salary-max" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.skills_required')}</label>
          <input {...register('skills_required')} className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" placeholder={t('jobs.skills_placeholder')} />
      </div>
      <div className="form-grid-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.headcount')}</label>
          <input {...register('headcount')} type="number" min="1" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-ink">{t('jobs.deadline')}</label>
          <input {...register('application_deadline')} type="date" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none" />
        </div>
      </div>
    </div>,
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {steps[step]}
      <div className="form-actions flex justify-between pt-4 border-t border-border gap-2">
        <Button variant="outline" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0} icon={<ArrowLeft size={16} />}>
          {t('common.back', { ns: 'common' })}
        </Button>
        {/* preventDefault on next: setStep re-renders this same DOM node as the
            type="submit" publish button before the click's default action runs,
            which would submit the form (create job early / bounce to step 0). */}
        {step < 2 ? (
          <Button variant="default" type="button" onClick={(e) => { e.preventDefault(); setStep(step + 1) }} data-testid="step-next" icon={<ArrowRight size={16} />} iconPosition="right">
            {t('common.next', { ns: 'common' })}
          </Button>
        ) : (
          <Button variant="default" type="submit" disabled={createJob.isPending} data-testid="publish-job" loading={createJob.isPending} icon={<Save size={16} />}>
            {createJob.isPending ? t('jobs.publishing') : t('jobs.publish_job')}
          </Button>
        )}
      </div>
    </form>
  )
}
