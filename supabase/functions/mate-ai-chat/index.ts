import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@latest'
import { corsHeaders, verifyAuth } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { question, companyId, language } = await req.json()

    const [{ data: company }, { data: policies }, { data: hrContacts }] = await Promise.all([
      supabase.from('companies').select('name, industry, country, settings').eq('id', companyId).single(),
      supabase.from('documents').select('name, description').eq('company_id', companyId).eq('document_type', 'company_policy').limit(10),
      supabase.from('user_profiles').select('full_name, email').eq('company_id', companyId).eq('role', 'hr').limit(3),
    ])

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

    const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are Mate AI, the HR knowledge assistant. ${langInstr[language as string] || langInstr.en} Answer based on the company context provided. If unsure, say so and suggest contacting HR. Context: ${context}`,
        temperature: 0.5, maxOutputTokens: 2048,
      },
      contents: question,
    })

    const reply = response.text || 'ขออภัย ไม่สามารถตอบคำถามได้ในขณะนี้. Please try again or contact HR.'

    return new Response(JSON.stringify({ success: true, data: { response: reply } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return errorResponse(error, 500, corsHeaders)
  }
})
