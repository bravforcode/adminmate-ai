import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, verifyAuth } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    const { templateKey, to, language = 'en', data } = await req.json()
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) return new Response(JSON.stringify({ error: 'Email not configured' }), { status: 500, headers: corsHeaders })

    const templates: Record<string, any> = {
      welcome: {
        subject: { th: 'ยินดีต้อนรับสู่ AdminMate AI!', en: 'Welcome to AdminMate AI!', vi: 'Chào mừng đến AdminMate AI!', id: 'Selamat Datang di AdminMate AI!' },
        html: (d: any) => `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px"><div style="background:#003d9a;color:white;padding:20px;border-radius:12px 12px 0 0"><h1>AdminMate AI</h1></div><div style="padding:20px;background:#f8f9fa;border-radius:0 0 12px 12px"><h2>Welcome, ${d.name}!</h2><p>${d.message}</p><a href="${d.appUrl}" style="display:inline-block;background:#003d9a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Get Started</a></div></div>`,
      },
      document_reminder: {
        subject: { th: 'แจ้งเตือน: เอกสารรอดำเนินการ', en: 'Reminder: Pending Document', vi: 'Nhắc nhở: Tài liệu đang chờ', id: 'Pengingat: Dokumen Tertunda' },
        html: (d: any) => `<div style="font-family:sans-serif;padding:20px"><h2>${d.title}</h2><p>${d.message}</p><p style="color:#666">Due: ${d.dueDate || 'ASAP'}</p></div>`,
      },
      interview: {
        subject: { th: 'นัดสัมภาษณ์งาน', en: 'Interview Invitation', vi: 'Lời mời phỏng vấn', id: 'Undangan Wawancara' },
        html: (d: any) => `<div style="font-family:sans-serif;padding:20px"><h2>Interview Scheduled</h2><p>Candidate: ${d.candidateName}</p><p>Date: ${d.date}</p><p>Type: ${d.type}</p></div>`,
      },
    }

    const template = templates[templateKey]
    if (!template) return new Response(JSON.stringify({ error: 'Template not found' }), { status: 400, headers: corsHeaders })

    const lang = ['th','en','vi','id'].includes(language) ? language : 'en'
    const subject = typeof template.subject === 'object' ? (template.subject[lang] || template.subject.en) : template.subject
    const html = template.html(data)

    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: Deno.env.get('EMAIL_FROM') || 'AdminMate AI <noreply@adminmate.ai>', to: [to], subject, html }),
    })

    const resendResult = await result.json()
    return new Response(JSON.stringify({ success: true, id: resendResult.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return errorResponse(error, 500, corsHeaders)
  }
})
