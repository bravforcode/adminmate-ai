import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useCreateJob } from '../../hooks/useJobs'
import { useAuthStore } from '../../stores/authStore'
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from '../../utils/constants'

const jobSchema = z.object({
  title: z.string().min(1, 'Title required'),
  title_th: z.string().optional(),
  department: z.string().min(1, 'Department required'),
  location: z.string().min(1, 'Location required'),
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
})

type JobFormData = z.infer<typeof jobSchema>

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

  const onSubmit = async (data: JobFormData) => {
    await createJob.mutateAsync({
      ...data,
      company_id: company?.id,
      created_by: profile?.id,
      responsibilities: data.responsibilities?.split('\n').filter(Boolean),
      requirements: data.requirements?.split('\n').filter(Boolean),
      nice_to_have: data.nice_to_have?.split('\n').filter(Boolean),
      skills_required: data.skills_required?.split(',').map(s => s.trim()).filter(Boolean),
      status: 'active',
      ai_generated: generating,
    })
    onClose()
  }

  const steps = [
    <div key="s0" className="space-y-4">
      <h3 className="font-semibold text-lg">{t('jobs.step_1')}</h3>
      <div>
        <label className="block text-sm font-medium mb-1">{t('jobs.title_label')} *</label>
        <input {...register('title')} data-testid="job-title" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Senior Frontend Developer" />
        {errors.title && <p className="text-error text-xs mt-1">{errors.title.message}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('jobs.department')} *</label>
          <input {...register('department')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="Engineering" />
          {errors.department && <p className="text-error text-xs mt-1">{errors.department.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('jobs.location')} *</label>
          <input {...register('location')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="Bangkok" />
          {errors.location && <p className="text-error text-xs mt-1">{errors.location.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('jobs.type')}</label>
          <select {...register('employment_type')} data-testid="employment-type" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none">
            {EMPLOYMENT_TYPES.map(et => <option key={et.value} value={et.value}>{t(`employment.${et.value}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('jobs.experience')}</label>
          <select {...register('experience_level')} data-testid="experience-level" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none">
            {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{t(`experience.${l.value}`)}</option>)}
          </select>
        </div>
      </div>
    </div>,
    <div key="s1" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="font-semibold text-lg">{t('jobs.step_2')}</h3>
        <button type="button" onClick={handleGenerateJD} disabled={generating} data-testid="generate-with-ai"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
          <Sparkles size={16} /> {generating ? t('jobs.generating') : t('jobs.generate_with_ai')}
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('jobs.description_en')}</label>
        <textarea {...register('description')} data-testid="jd-description" rows={5} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('jobs.responsibilities')} {t('jobs.responsibilities_hint')}</label>
        <textarea {...register('responsibilities')} rows={6} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('jobs.requirements')}</label>
        <textarea {...register('requirements')} rows={6} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
      </div>
    </div>,
    <div key="s2" className="space-y-4">
      <h3 className="font-semibold text-lg">{t('jobs.step_3')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('jobs.salary_min')}</label>
          <input {...register('salary_min')} type="number" data-testid="salary-min" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('jobs.salary_max')}</label>
          <input {...register('salary_max')} type="number" data-testid="salary-max" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{t('jobs.skills_required')}</label>
        <input {...register('skills_required')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" placeholder="React, TypeScript, Node.js" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('jobs.headcount')}</label>
          <input {...register('headcount')} type="number" min="1" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('jobs.deadline')}</label>
          <input {...register('application_deadline')} type="date" className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none" />
        </div>
      </div>
    </div>,
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {steps[step]}
      <div className="flex justify-between pt-4 border-t border-outline-variant gap-2">
        <button type="button" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}
          className="flex items-center gap-1 px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface disabled:opacity-30">
          <ArrowLeft size={16} /> {t('common.back', { ns: 'common' })}
        </button>
        {step < 2 ? (
          <button type="button" onClick={() => setStep(step + 1)} data-testid="step-next"
            className="flex items-center gap-1 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium">
            {t('common.next', { ns: 'common' })} <ArrowRight size={16} />
          </button>
        ) : (
          <button type="submit" disabled={createJob.isPending} data-testid="publish-job"
            className="flex items-center gap-1 px-6 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {createJob.isPending ? t('jobs.publishing') : t('jobs.publish_job')}
          </button>
        )}
      </div>
    </form>
  )
}
