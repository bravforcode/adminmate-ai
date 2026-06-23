import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Logo } from '../../components/brand/Logo'
import { Briefcase, MapPin, Clock, Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

/* ============================================================
   AdminMate AI — Public Apply Page
   Route: /apply/:jobToken (no auth required)
   ============================================================ */

interface PublicJob {
  id: string
  title: string
  title_th?: string
  department?: string
  location?: string
  employment_type?: string
  experience_level?: string
  description?: string
  description_th?: string
  responsibilities?: string[]
  requirements?: string[]
  nice_to_have?: string[]
  skills_required?: string[]
  application_deadline?: string
  company_name: string
  company_logo_url?: string
  salary_visible: boolean
}

interface FormData {
  full_name: string
  email: string
  phone: string
  location: string
  current_position: string
  experience_years: string
  linkedin_url: string
  cover_letter: string
  consent_given: boolean
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function ApplyPage() {
  const { jobToken } = useParams<{ jobToken: string }>()
  const { i18n } = useTranslation()
  const isThai = i18n.language === 'th'

  const [job, setJob] = useState<PublicJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [trackingToken, setTrackingToken] = useState<string | null>(null)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState<FormData>({
    full_name: '', email: '', phone: '', location: '',
    current_position: '', experience_years: '', linkedin_url: '',
    cover_letter: '', consent_given: false,
  })

  // Fetch public job data
  useEffect(() => {
    if (!jobToken) return
    const controller = new AbortController()

    async function fetchJob() {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-public-job?token=${jobToken}`, {
          signal: controller.signal,
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        setJob(json.job)
      } catch (err: any) {
        if (err.name !== 'AbortError') setError(err.message || 'Failed to load job')
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
    return () => controller.abort()
  }, [jobToken])

  function updateForm(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!form.full_name.trim()) errors.full_name = isThai ? 'กรุณากรอกชื่อ-นามสกุล' : 'Full name is required'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = isThai ? 'กรุณากรอกอีเมลที่ถูกต้อง' : 'Valid email is required'
    }
    if (!form.consent_given) errors.consent_given = isThai ? 'กรุณายอมรับเงื่อนไข' : 'Consent is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !jobToken) return

    setSubmitting(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_token: jobToken,
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone || undefined,
          location: form.location || undefined,
          current_position: form.current_position || undefined,
          experience_years: form.experience_years ? Number(form.experience_years) : undefined,
          linkedin_url: form.linkedin_url || undefined,
          cover_letter: form.cover_letter || undefined,
          preferred_language: isThai ? 'th' : 'en',
          consent_given: true,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      if (json.already_applied) {
        setAlreadyApplied(true)
        setTrackingToken(json.tracking_token)
      } else {
        setTrackingToken(json.tracking_token)
        setSubmitted(true)
      }
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Submission failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  // ── Error state ──
  if (error || !job) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            {isThai ? 'ไม่พบงาน' : 'Job Not Found'}
          </h1>
          <p className="text-secondary mb-6">
            {error || (isThai ? 'งานนี้อาจถูกลบหรือไม่เปิดรับสมัครอีกต่อไป' : 'This job may have been removed or is no longer accepting applications.')}
          </p>
          <Link to="/" className="text-[var(--color-primary)] hover:underline">
            {isThai ? 'กลับหน้าแรก' : 'Back to home'}
          </Link>
        </div>
      </div>
    )
  }

  // ── Success state ──
  if (submitted || alreadyApplied) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            {alreadyApplied
              ? (isThai ? 'คุณสมัครแล้ว' : 'Already Applied')
              : (isThai ? 'สมัครสำเร็จ!' : 'Application Submitted!')}
          </h1>
          <p className="text-secondary mb-4">
            {alreadyApplied
              ? (isThai ? 'คุณได้สมัครงานนี้ไปแล้ว' : 'You have already applied to this position.')
              : (isThai ? 'ขอบคุณที่สนใจร่วมงานกับเรา' : 'Thank you for your interest. We will review your application.')}
          </p>
          {trackingToken && (
            <div className="bg-[var(--color-surface)] rounded-xl p-4 mb-6 border border-[var(--color-border)]">
              <p className="text-sm text-secondary mb-1">
                {isThai ? 'รหัสติดตาม' : 'Tracking Code'}
              </p>
              <p className="font-mono text-lg font-bold text-[var(--color-primary)]">{trackingToken}</p>
              <Link
                to={`/portal/track/${trackingToken}`}
                className="inline-block mt-2 text-sm text-[var(--color-primary)] hover:underline"
              >
                {isThai ? 'ติดตามสถานะ →' : 'Track Status →'}
              </Link>
            </div>
          )}
          <Link to="/" className="text-[var(--color-primary)] hover:underline">
            {isThai ? 'กลับหน้าแรก' : 'Back to home'}
          </Link>
        </div>
      </div>
    )
  }

  // ── Application Form ──
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Minimal header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <Logo size={22} showText={false} />
          <span className="text-sm font-medium text-secondary">AdminMate AI</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Job summary card */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 mb-8">
          <div className="flex items-start gap-4">
            {job.company_logo_url ? (
              <img src={job.company_logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                {isThai && job.title_th ? job.title_th : job.title}
              </h1>
              <p className="text-sm text-secondary">{job.company_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 text-sm text-secondary">
            {job.department && (
              <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.department}</span>
            )}
            {job.location && (
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
            )}
            {job.employment_type && (
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.employment_type}</span>
            )}
          </div>
          {job.description && (
            <p className="mt-4 text-sm text-secondary leading-relaxed whitespace-pre-line">
              {isThai && job.description_th ? job.description_th : job.description}
            </p>
          )}
          {job.application_deadline && (
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              {isThai ? 'ปิดรับสมัคร' : 'Deadline'}: {new Date(job.application_deadline).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {isThai ? 'กรอกข้อมูลสมัครงาน' : 'Apply Now'}
          </h2>

          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {isThai ? 'ชื่อ-นามสกุล *' : 'Full Name *'}
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => updateForm('full_name', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder={isThai ? 'เช่น สมชาย ใจดี' : 'e.g. John Smith'}
            />
            {formErrors.full_name && <p className="text-red-500 text-xs mt-1">{formErrors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {isThai ? 'อีเมล *' : 'Email *'}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => updateForm('email', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder={isThai ? 'example@email.com' : 'you@example.com'}
            />
            {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {isThai ? 'เบอร์โทรศัพท์' : 'Phone'}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => updateForm('phone', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder={isThai ? '081-234-5678' : '+1 234 567 890'}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {isThai ? 'ที่อยู่' : 'Location'}
            </label>
            <input
              type="text"
              value={form.location}
              onChange={e => updateForm('location', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder={isThai ? 'กรุงเทพฯ' : 'Bangkok, Thailand'}
            />
          </div>

          {/* Current position */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {isThai ? 'ตำแหน่งปัจจุบัน' : 'Current Position'}
            </label>
            <input
              type="text"
              value={form.current_position}
              onChange={e => updateForm('current_position', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder={isThai ? 'เช่น Software Engineer' : 'e.g. Software Engineer'}
            />
          </div>

          {/* Experience years */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {isThai ? 'ประสบการณ์ (ปี)' : 'Years of Experience'}
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={form.experience_years}
              onChange={e => updateForm('experience_years', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">LinkedIn</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={e => updateForm('linkedin_url', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          {/* Cover letter */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {isThai ? 'จดหมายสมัครงาน' : 'Cover Letter'}
            </label>
            <textarea
              rows={4}
              value={form.cover_letter}
              onChange={e => updateForm('cover_letter', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
              placeholder={isThai ? 'บอกเราทำไมคุณถึงสนใจตำแหน่งนี้...' : 'Tell us why you are interested...'}
            />
          </div>

          {/* Consent */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={form.consent_given}
              onChange={e => updateForm('consent_given', e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <label htmlFor="consent" className="text-sm text-secondary">
              {isThai
                ? 'ฉันยินยอมให้บริษัทเก็บและใช้ข้อมูลส่วนบุคคลของฉันเพื่อวัตถุประสงค์ในการสรรหาบุคลากร ตามนโยบาย PDPA *'
                : 'I consent to the collection and use of my personal data for recruitment purposes, in accordance with the PDPA policy. *'}
            </label>
          </div>
          {formErrors.consent_given && <p className="text-red-500 text-xs">{formErrors.consent_given}</p>}
          {formErrors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {formErrors.submit}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? (isThai ? 'กำลังส่ง...' : 'Submitting...')
              : (isThai ? 'ส่งใบสมัคร' : 'Submit Application')}
          </button>
        </form>

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center text-xs text-[var(--color-text-muted)]">
          Powered by AdminMate AI
        </footer>
      </main>
    </div>
  )
}
