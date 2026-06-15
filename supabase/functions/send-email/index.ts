import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getCorsHeaders,
  getJsonHeaders,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  requireEnv,
  getEnv,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'send-email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_TEMPLATES = new Set(['welcome', 'document_reminder', 'interview'])

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: getJsonHeaders(req) })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: getJsonHeaders(req) })
    userId = user.id

    const rateLimited = await enforceRateLimit(supabase, user.id, 'send_email', 20, 60)
    if (rateLimited) return rateLimited

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: getJsonHeaders(req) }) }

    const { templateKey, to, language = 'en', data } = body
    if (!templateKey || !ALLOWED_TEMPLATES.has(templateKey)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid templateKey' }), { status: 400, headers: getJsonHeaders(req) })
    }
    if (!to || typeof to !== 'string' || !EMAIL_RE.test(to) || to.length > 254) {
      return new Response(JSON.stringify({ success: false, error: 'Valid recipient email is required' }), { status: 400, headers: getJsonHeaders(req) })
    }
    if (!data || typeof data !== 'object') {
      return new Response(JSON.stringify({ success: false, error: 'data object is required' }), { status: 400, headers: getJsonHeaders(req) })
    }
    if (!['th', 'en', 'vi', 'zh', 'id'].includes(language)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid language' }), { status: 400, headers: getJsonHeaders(req) })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ success: false, error: 'Email service not configured' }), { status: 503, headers: getJsonHeaders(req) })
    }

    const templates: Record<string, any> = {
      welcome: {
        subject: { th: 'ยินดีต้อนรับสู่ AdminMate AI!', en: 'Welcome to AdminMate AI!', vi: 'Chào mừng đến AdminMate AI!', zh: '欢迎使用 AdminMate AI!', id: 'Selamat Datang di AdminMate AI!' },
        html: (d: any) => `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px"><div style="background:#003d9a;color:white;padding:20px;border-radius:12px 12px 0 0"><h1>AdminMate AI</h1></div><div style="padding:20px;background:#f8f9fa;border-radius:0 0 12px 12px"><h2>Welcome, ${escapeHtml(d.name)}!</h2><p>${escapeHtml(d.message || '')}</p><a href="${escapeAttr(d.appUrl)}" style="display:inline-block;background:#003d9a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Get Started</a></div></div>`,
      },
      document_reminder: {
        subject: { th: 'แจ้งเตือน: เอกสารรอดำเนินการ', en: 'Reminder: Pending Document', vi: 'Nhắc nhở: Tài liệu đang chờ', zh: '提醒：待处理文档', id: 'Pengingat: Dokumen Tertunda' },
        html: (d: any) => `<div style="font-family:sans-serif;padding:20px"><h2>${escapeHtml(d.title)}</h2><p>${escapeHtml(d.message)}</p><p style="color:#666">Due: ${escapeHtml(d.dueDate || 'ASAP')}</p></div>`,
      },
      interview: {
        subject: { th: 'นัดสัมภาษณ์งาน', en: 'Interview Invitation', vi: 'Lời mời phỏng vấn', zh: '面试邀请', id: 'Undangan Wawancara' },
        html: (d: any) => `<div style="font-family:sans-serif;padding:20px"><h2>Interview Scheduled</h2><p>Candidate: ${escapeHtml(d.candidateName)}</p><p>Date: ${escapeHtml(d.date)}</p><p>Type: ${escapeHtml(d.type)}</p></div>`,
      },
    }

    const template = templates[templateKey]
    const lang = ['th', 'en', 'vi', 'zh', 'id'].includes(language) ? language : 'en'
    const subject = typeof template.subject === 'object' ? (template.subject[lang] || template.subject.en) : template.subject
    const html = template.html(data)

    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: getEnv('EMAIL_FROM', 'AdminMate AI <noreply@adminmate.ai>'),
        to: [to],
        subject,
        html,
      }),
    })

    if (!result.ok) {
      const errText = await result.text().catch(() => '')
      console.error('Resend error:', result.status, errText)
      return new Response(JSON.stringify({ success: false, error: 'Email provider rejected the request' }), { status: 502, headers: getJsonHeaders(req) })
    }

    const resendResult = await result.json().catch(() => ({}))
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(JSON.stringify({ success: true, id: resendResult.id }), { headers: getJsonHeaders(req) })
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})

function escapeHtml(s: unknown): string {
  if (s === undefined || s === null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: unknown): string {
  if (s === undefined || s === null) return ''
  return escapeHtml(s)
}
