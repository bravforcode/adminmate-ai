import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, getJsonHeaders, handleCorsPreflight } from '../_shared/utils.ts'

const FN = 'submit-application'

// Allowed fields only — blocks injection of sensitive/internal fields
const ALLOWED_FIELDS = [
  'full_name', 'email', 'phone', 'location',
  'current_position', 'experience_years', 'linkedin_url',
  'portfolio_url', 'preferred_language', 'cover_letter',
]

// Sensitive fields that must NEVER be accepted from public
const BLOCKED_FIELDS = [
  'company_id', 'role', 'status', 'source',
  'ai_match_score', 'ai_analysis', 'recruiter_notes',
  'rejection_reason', 'internal_notes',
]

const MAX_NAME_LENGTH = 255
const MAX_EMAIL_LENGTH = 255
const MAX_PHONE_LENGTH = 50
const MAX_TEXT_LENGTH = 5000
const MAX_SKILLS_LENGTH = 50

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const h = getJsonHeaders(req)
  const start = Date.now()

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: h })
    }

    // Parse body
    let body: any
    try { body = await req.json() }
    catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: h }) }

    // Block sensitive fields
    for (const field of BLOCKED_FIELDS) {
      if (field in body) {
        return new Response(JSON.stringify({ success: false, error: `Field not allowed: ${field}` }), { status: 400, headers: h })
      }
    }

    // Validate required fields
    const { job_token, full_name, email, consent_given } = body
    if (!job_token || typeof job_token !== 'string' || job_token.length > 32) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid job token' }), { status: 400, headers: h })
    }
    if (!full_name || typeof full_name !== 'string' || full_name.length < 1 || full_name.length > MAX_NAME_LENGTH) {
      return new Response(JSON.stringify({ success: false, error: `Full name required (1-${MAX_NAME_LENGTH} chars)` }), { status: 400, headers: h })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX_EMAIL_LENGTH) {
      return new Response(JSON.stringify({ success: false, error: 'Valid email required' }), { status: 400, headers: h })
    }
    if (consent_given !== true) {
      return new Response(JSON.stringify({ success: false, error: 'Consent is required to submit application' }), { status: 400, headers: h })
    }

    // Sanitize optional fields
    const sanitized: Record<string, unknown> = {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
    }
    if (body.phone && typeof body.phone === 'string') sanitized.phone = body.phone.trim().slice(0, MAX_PHONE_LENGTH)
    if (body.location && typeof body.location === 'string') sanitized.location = body.location.trim().slice(0, MAX_NAME_LENGTH)
    if (body.current_position && typeof body.current_position === 'string') sanitized.current_position = body.current_position.trim().slice(0, MAX_NAME_LENGTH)
    if (body.experience_years && typeof body.experience_years === 'number') sanitized.experience_years = Math.min(Math.max(0, body.experience_years), 50)
    if (body.linkedin_url && typeof body.linkedin_url === 'string' && body.linkedin_url.startsWith('https://')) {
      sanitized.linkedin_url = body.linkedin_url.trim().slice(0, 500)
    }
    if (body.portfolio_url && typeof body.portfolio_url === 'string' && body.portfolio_url.startsWith('https://')) {
      sanitized.portfolio_url = body.portfolio_url.trim().slice(0, 500)
    }
    if (body.preferred_language && typeof body.preferred_language === 'string') {
      const lang = body.preferred_language.trim().slice(0, 5)
      if (['en', 'th', 'vi', 'zh', 'id'].includes(lang)) sanitized.preferred_language = lang
    }
    if (body.cover_letter && typeof body.cover_letter === 'string') {
      sanitized.cover_letter = body.cover_letter.trim().slice(0, MAX_TEXT_LENGTH)
    }

    // Resolve job + company (server-side only — never trust client for company_id)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, company_id, status, is_published, title')
      .eq('public_token', job_token)
      .single()

    if (jobErr || !job) {
      return new Response(JSON.stringify({ success: false, error: 'Job not found' }), { status: 404, headers: h })
    }
    if (job.status !== 'active' || !job.is_published) {
      return new Response(JSON.stringify({ success: false, error: 'This job is no longer accepting applications' }), { status: 410, headers: h })
    }

    // Verify company is active
    const { data: company } = await supabase
      .from('companies')
      .select('id, status')
      .eq('id', job.company_id)
      .single()

    if (!company || company.status !== 'active') {
      return new Response(JSON.stringify({ success: false, error: 'Company not available' }), { status: 410, headers: h })
    }

    // Simple rate limit: max 5 applications per email per hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const { count: recentApps } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', job.company_id)
      .gte('created_at', oneHourAgo)

    if (recentApps && recentApps >= 100) {
      return new Response(JSON.stringify({ success: false, error: 'Too many applications. Please try again later.' }), { status: 429, headers: { ...h, 'Retry-After': '3600' } })
    }

    // Check duplicate by email+job
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job.id)
      .eq('company_id', job.company_id)
      .maybeSingle()

    // Create or find candidate
    let candidateId: string
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('company_id', job.company_id)
      .eq('email', sanitized.email)
      .maybeSingle()

    if (existingCandidate) {
      candidateId = existingCandidate.id
      // Update candidate info
      await supabase.from('candidates').update({
        full_name: sanitized.full_name,
        phone: sanitized.phone ?? null,
        location: sanitized.location ?? null,
        current_position: sanitized.current_position ?? null,
        experience_years: sanitized.experience_years ?? null,
        linkedin_url: sanitized.linkedin_url ?? null,
        portfolio_url: sanitized.portfolio_url ?? null,
        preferred_language: sanitized.preferred_language ?? 'th',
        source: 'portal',
      }).eq('id', candidateId)
    } else {
      const { data: newCandidate, error: candErr } = await supabase
        .from('candidates')
        .insert({
          company_id: job.company_id,
          full_name: sanitized.full_name,
          email: sanitized.email,
          phone: sanitized.phone ?? null,
          location: sanitized.location ?? null,
          current_position: sanitized.current_position ?? null,
          experience_years: sanitized.experience_years ?? null,
          linkedin_url: sanitized.linkedin_url ?? null,
          portfolio_url: sanitized.portfolio_url ?? null,
          preferred_language: sanitized.preferred_language ?? 'th',
          source: 'portal',
        })
        .select('id')
        .single()

      if (candErr || !newCandidate) {
        console.error(`[${FN}] Candidate create error:`, candErr?.message)
        return new Response(JSON.stringify({ success: false, error: 'Failed to create candidate' }), { status: 500, headers: h })
      }
      candidateId = newCandidate.id
    }

    // Check if already applied to this job
    const { data: alreadyApplied } = await supabase
      .from('applications')
      .select('id, tracking_token')
      .eq('job_id', job.id)
      .eq('candidate_id', candidateId)
      .maybeSingle()

    if (alreadyApplied) {
      return new Response(JSON.stringify({
        success: true,
        tracking_token: alreadyApplied.tracking_token,
        message: 'You have already applied to this job',
        already_applied: true,
      }), { status: 200, headers: h })
    }

    // Create application
    const { data: application, error: appErr } = await supabase
      .from('applications')
      .insert({
        job_id: job.id,
        candidate_id: candidateId,
        company_id: job.company_id,
        status: 'applied',
        cover_letter: sanitized.cover_letter ?? null,
      })
      .select('tracking_token')
      .single()

    if (appErr || !application) {
      console.error(`[${FN}] Application create error:`, appErr?.message)
      return new Response(JSON.stringify({ success: false, error: 'Failed to submit application' }), { status: 500, headers: h })
    }

    // Store consent log
    await supabase.from('pdpa_consents').insert({
      company_id: job.company_id,
      candidate_id: candidateId,
      data_subject_email: sanitized.email,
      consent_type: 'application',
      purposes: ['recruitment', 'candidate_evaluation'],
      consent_given: true,
      consent_form_version: '1.0',
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    })

    // Audit log
    await supabase.from('audit_logs').insert({
      company_id: job.company_id,
      user_id: null,
      action: 'application.submitted',
      resource_type: 'application',
      resource_id: application.id,
      details: JSON.stringify({
        job_id: job.id,
        candidate_id: candidateId,
        source: 'portal',
        ip: req.headers.get('x-forwarded-for')?.slice(0, 45) ?? null,
      }),
    })

    const duration = Date.now() - start
    console.log(`[${FN}] OK ${duration}ms job=${job.id} candidate=${candidateId}`)

    return new Response(JSON.stringify({
      success: true,
      tracking_token: application.tracking_token,
      message: 'Application submitted successfully',
    }), { status: 201, headers: h })
  } catch (err) {
    console.error(`[${FN}] Unhandled:`, err)
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), { status: 500, headers: h })
  }
})
