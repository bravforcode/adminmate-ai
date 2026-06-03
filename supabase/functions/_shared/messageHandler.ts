import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface PlatformMessage {
  platform: 'line' | 'whatsapp'
  platformUserId: string
  message: string
  replyToken?: string
  companyId: string
}

export async function handleIncomingMessage(
  msg: PlatformMessage,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  if (!msg.message?.trim()) return

  const normalizedLang = (lang: string): string => {
    if (lang?.startsWith('th')) return 'th'
    if (lang?.startsWith('vi')) return 'vi'
    if (lang?.startsWith('id')) return 'id'
    return 'en'
  }

  const { data: candidate } = await supabase.from('candidates').select('id, preferred_language').or(`line_user_id.eq.${msg.platformUserId},whatsapp_phone.eq.${msg.platformUserId}`).eq('company_id', msg.companyId).maybeSingle()

  const lang = normalizedLang(candidate?.preferred_language || 'th')
  const intent = detectCommand(msg.message.toLowerCase())

  let response = ''
  switch (intent) {
    case 'jobs': {
      const { data: jobs } = await supabase.from('jobs').select('title, location, department').eq('company_id', msg.companyId).eq('status', 'active').limit(5)
      response = jobs?.length ? formatJobsResponse(jobs, lang) : getMessage('no_jobs', lang)
      break
    }
    case 'status': {
      if (candidate) {
        const { data: apps } = await supabase.from('applications').select('status, jobs(title)').eq('candidate_id', candidate.id).order('created_at', { ascending: false }).limit(3)
        response = apps?.length ? formatStatusResponse(apps, lang) : getMessage('no_applications', lang)
      } else { response = getMessage('not_found', lang) }
      break
    }
    case 'help':
      response = getMessage('help', lang)
      break
    default: {
      if (candidate) {
        const { data: { response: aiResponse } } = await supabase.functions.invoke('mate-ai-chat', { body: { question: msg.message, companyId: msg.companyId, language: lang } })
        response = aiResponse?.data?.response || getMessage('unknown', lang)
      } else {
        response = getMessage('welcome_new', lang)
      }
    }
  }

  if (msg.platform === 'line' && msg.replyToken) {
    await sendLineReply(msg.replyToken, response, msg.companyId, supabase)
  } else if (msg.platform === 'whatsapp') {
    await sendWhatsAppReply(msg.platformUserId, response, msg.companyId, supabase)
  }
}

function detectCommand(text: string): string {
  const jobsKeywords = ['jobs', 'positions', 'open', 'vacancy', 'งาน', 'ตำแหน่ง', 'tuyển', 'lowongan']
  const statusKeywords = ['status', 'application', 'apply', 'สมัคร', 'ứng tuyển', 'lamaran']
  const helpKeywords = ['help', 'menu', 'command', 'ช่วย', 'trợ giúp', 'bantuan']
  if (jobsKeywords.some(k => text.includes(k))) return 'jobs'
  if (statusKeywords.some(k => text.includes(k))) return 'status'
  if (helpKeywords.some(k => text.includes(k))) return 'help'
  return 'general'
}

function getMessage(key: string, lang: string): string {
  const msgs: Record<string, Record<string, string>> = {
    no_jobs: { th: 'ขณะนี้ไม่มีตำแหน่งงานเปิดรับ', en: 'No open positions right now', vi: 'Không có vị trí nào đang mở', id: 'Tidak ada lowongan saat ini' },
    no_applications: { th: 'คุณยังไม่ได้สมัครงาน', en: 'You have no applications', vi: 'Bạn chưa nộp đơn', id: 'Anda belum melamar' },
    not_found: { th: 'ไม่พบข้อมูลของคุณ', en: 'We could not find your profile', vi: 'Không tìm thấy hồ sơ', id: 'Profil tidak ditemukan' },
    help: { th: 'พิมพ์: jobs (ดูตำแหน่งงาน), status (ดูสถานะสมัคร), help (ช่วยเหลือ)', en: 'Type: jobs (view openings), status (check application), help (assistance)', vi: 'Gõ: jobs (xem việc làm), status (trạng thái), help (trợ giúp)', id: 'Ketik: jobs (lowongan), status (lamaran), help (bantuan)' },
    unknown: { th: 'ขออภัย ไม่เข้าใจ กรุณาพิมพ์ help', en: 'Sorry, I did not understand. Type help', vi: 'Xin lỗi, tôi không hiểu. Gõ help', id: 'Maaf, saya tidak mengerti. Ketik help' },
    welcome_new: { th: 'สวัสดี! AdminMate AI พร้อมให้บริการ พิมพ์ help เพื่อดูคำสั่ง', en: 'Hello! AdminMate AI at your service. Type help for commands', vi: 'Xin chào! AdminMate AI sẵn sàng. Gõ help', id: 'Halo! AdminMate AI siap membantu. Ketik help' },
  }
  return msgs[key]?.[lang] || msgs[key]?.en || 'Sorry, something went wrong'
}

function formatJobsResponse(jobs: any[], lang: string): string {
  const headers: Record<string, string> = { th: 'ตำแหน่งงานเปิดรับ:\n', en: 'Open Positions:\n', vi: 'Vị trí đang tuyển:\n', id: 'Lowongan terbuka:\n' }
  return (headers[lang] || headers.en) + jobs.map((j, i) => `${i + 1}. ${j.title} - ${j.department} (${j.location})`).join('\n')
}

function formatStatusResponse(apps: any[], lang: string): string {
  const h: Record<string, string> = { th: 'สถานะการสมัคร:\n', en: 'Application Status:\n', vi: 'Trạng thái ứng tuyển:\n', id: 'Status Lamaran:\n' }
  return (h[lang] || h.en) + apps.map((a, i) => `${i + 1}. ${a.jobs?.title}: ${a.status}`).join('\n')
}

async function sendLineReply(replyToken: string, text: string, companyId: string, supabase: ReturnType<typeof createClient>) {
  const { data: conn } = await supabase.from('chat_platform_connections').select('access_token').eq('company_id', companyId).eq('platform', 'line').eq('is_active', true).single()
  const token = conn?.access_token || Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
  if (!token) return
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: text.slice(0, 5000) }] }),
  })
}

async function sendWhatsAppReply(to: string, text: string, companyId: string, supabase: ReturnType<typeof createClient>) {
  const { data: conn } = await supabase.from('chat_platform_connections').select('access_token, platform_account_id').eq('company_id', companyId).eq('platform', 'whatsapp').eq('is_active', true).single()
  const token = conn?.access_token || Deno.env.get('WHATSAPP_API_TOKEN')
  const phoneId = conn?.platform_account_id || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  if (!token || !phoneId) return
  await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text.slice(0, 4096) } }),
  })
}
