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

const FN = 'generate-offer-content'

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

    const rateLimited = await enforceRateLimit(supabase, user.id, 'offer_generation', 10, 60)
    if (rateLimited) return rateLimited

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS }) }

    const { offerId, language } = body
    if (!offerId || typeof offerId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'offerId is required' }), { status: 400, headers: JSON_HEADERS })
    }
    if (language && !['th', 'en', 'vi', 'id'].includes(language)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid language' }), { status: 400, headers: JSON_HEADERS })
    }

    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*, companies(name, country), candidates(full_name), jobs(title, department)')
      .eq('id', offerId)
      .single()
    if (offerError || !offer) {
      return new Response(JSON.stringify({ success: false, error: 'Offer not found' }), { status: 404, headers: JSON_HEADERS })
    }

    const countryCtx: Record<string, string> = {
      TH: 'Thai Labor Protection Act B.E. 2541',
      VN: 'Vietnam Labor Code 2019',
      ID: 'Indonesia Manpower Law 13/2003',
    }
    const langInstr: Record<string, string> = {
      th: 'Write in formal Thai language',
      en: 'Write in professional English',
      vi: 'Write in formal Vietnamese',
      id: 'Write in formal Bahasa Indonesia',
    }

    const ai = new GoogleGenAI({ apiKey: getGeminiKey() })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a legal document specialist for ${countryCtx[offer?.companies?.country as string] || 'SEA'}. ${langInstr[language as string] || langInstr.en}. Return ONLY valid JSON: { "header": "string", "employee_name": "string", "company_name": "string", "position": "string", "salary_paragraph": "string", "benefits_paragraph": "string", "working_conditions": "string", "termination_clause": "string", "confidentiality_clause": "string" }`,
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
      contents: `Generate offer content for ${offer?.candidates?.full_name} at ${offer?.companies?.name}, position ${offer?.position_title}, salary ${offer?.salary_offered} ${offer?.salary_currency}`,
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const content = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!content) {
      return new Response(JSON.stringify({ success: false, error: 'AI returned no parseable content' }), { status: 502, headers: JSON_HEADERS })
    }

    await supabase.from('offers').update({ offer_letter_content: content }).eq('id', offerId)

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(JSON.stringify({ success: true, data: content }), { headers: JSON_HEADERS })
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, corsHeaders)
  }
})
