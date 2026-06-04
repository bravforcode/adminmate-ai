import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@latest'
import {
  corsHeaders,
  JSON_HEADERS,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  getGeminiKey,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'mate-ai-chat'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: JSON_HEADERS })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS })
    userId = user.id

    const rateLimited = await enforceRateLimit(supabase, user.id, 'mate_ai_chat', 30, 60)
    if (rateLimited) return rateLimited

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS }) }

    const { question, companyId, language } = body
    if (!question || typeof question !== 'string' || question.length > 2000) {
      return new Response(JSON.stringify({ success: false, error: 'question is required (string, max 2000 chars)' }), { status: 400, headers: JSON_HEADERS })
    }
    if (!companyId || typeof companyId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'companyId is required' }), { status: 400, headers: JSON_HEADERS })
    }

    const [{ data: company }, { data: policies }, { data: hrContacts }] = await Promise.all([
      supabase.from('companies').select('name, industry, country, settings').eq('id', companyId).single(),
      supabase.from('documents').select('name, description').eq('company_id', companyId).eq('document_type', 'company_policy').limit(10),
      supabase.from('user_profiles').select('full_name, email').eq('company_id', companyId).eq('role', 'hr').limit(3),
    ])

    if (!company) {
      return new Response(JSON.stringify({ success: false, error: 'Company not found or no access' }), { status: 403, headers: JSON_HEADERS })
    }

    const context = `COMPANY: ${company?.name}, ${company?.industry}, ${company?.country}
POLICIES: ${policies?.map(p => `${p.name}: ${p.description}`).join(' | ') || 'Standard SME policies'}
HR: ${hrContacts?.map(h => `${h.full_name} (${h.email})`).join(', ') || 'Contact HR team'}
TODAY: ${new Date().toLocaleDateString()}`

    const langInstr: Record<string, string> = {
      th: 'ตอบเป็นภาษาไทยเท่านั้น สุภาพและเป็นมืออาชีพ',
      en: 'Respond in English only. Professional and helpful.',
      vi: 'Trả lời bằng tiếng Việt. Chuyên nghiệp và hữu ích.',
      id: 'Jawab dalam Bahasa Indonesia. Profesional dan membantu.',
    }

    const ai = new GoogleGenAI({ apiKey: getGeminiKey() })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are Mate AI, the HR knowledge assistant. ${langInstr[language as string] || langInstr.en} Answer based on the company context provided. If unsure, say so and suggest contacting HR. Context: ${context}`,
        temperature: 0.5,
        maxOutputTokens: 2048,
      },
      contents: question,
    })

    const reply = response.text || 'ขออภัย ไม่สามารถตอบคำถามได้ในขณะนี้. Please try again or contact HR.'

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(JSON.stringify({ success: true, data: { response: reply } }), { headers: JSON_HEADERS })
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, corsHeaders)
  }
})
