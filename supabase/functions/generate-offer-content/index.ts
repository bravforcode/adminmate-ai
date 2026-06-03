import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@latest'
import { corsHeaders, verifyAuth } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { offerId, language } = await req.json()

    const { data: offer } = await supabase.from('offers').select('*, companies(name, country), candidates(full_name), jobs(title, department)').eq('id', offerId).single()

    const countryCtx: Record<string, string> = { TH: 'Thai Labor Protection Act B.E. 2541', VN: 'Vietnam Labor Code 2019', ID: 'Indonesia Manpower Law 13/2003' }
    const langInstr: Record<string, string> = { th: 'Write in formal Thai language', en: 'Write in professional English', vi: 'Write in formal Vietnamese', id: 'Write in formal Bahasa Indonesia' }

    const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a legal document specialist for ${countryCtx[offer?.companies?.country as string] || 'SEA'}. ${langInstr[language as string] || langInstr.en}. Return ONLY valid JSON: { "header": "string", "employee_name": "string", "company_name": "string", "position": "string", "salary_paragraph": "string", "benefits_paragraph": "string", "working_conditions": "string", "termination_clause": "string", "confidentiality_clause": "string" }`,
        temperature: 0.2, maxOutputTokens: 4096,
      },
      contents: `Generate offer content for ${offer?.candidates?.full_name} at ${offer?.companies?.name}, position ${offer?.position_title}, salary ${offer?.salary_offered} ${offer?.salary_currency}`,
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const content = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (content) {
      await supabase.from('offers').update({ offer_letter_content: content }).eq('id', offerId)
    }

    return new Response(JSON.stringify({ success: true, data: content }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return errorResponse(error, 500, corsHeaders)
  }
})
