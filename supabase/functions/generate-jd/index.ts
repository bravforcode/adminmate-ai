import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@latest'
import { corsHeaders, verifyAuth, checkRateLimit } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const user = await verifyAuth(req, supabase)
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
    const allowed = await checkRateLimit(supabase, profile!.company_id, 'jd_generation', 10)
    if (!allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: corsHeaders })

    const { title, department, location, employmentType, experienceLevel, country, language } = await req.json()

    const langInstr: Record<string, string> = { th: 'Write entirely in Thai language. Professional, formal tone for HR documents.', en: 'Write entirely in English. Professional tone.', vi: 'Write entirely in Vietnamese.', id: 'Write entirely in Bahasa Indonesia.' }
    const countryCtx: Record<string, string> = { TH: 'Thailand, salary in THB', VN: 'Vietnam, salary in VND', ID: 'Indonesia, salary in IDR' }

    const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a senior HR professional for a company in ${countryCtx[country as string] || 'Southeast Asia'}. ${langInstr[language as string] || langInstr.en} Return ONLY valid JSON (no markdown, no explanation): { "title": "string", "title_en": "string", "description": "string (3 compelling paragraphs)", "description_th": "string", "responsibilities": ["8-12 items"], "requirements": ["6-10 items"], "nice_to_have": ["3-5 items"], "skills_required": ["5-8 skills"], "salary_suggestion": { "min": number, "max": number } }`,
        temperature: 0.7, maxOutputTokens: 4096,
      },
      contents: `Create JD for: ${title} | ${department} | ${location} | ${employmentType} | ${experienceLevel}`,
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const jd = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    await supabase.from('ai_usage_log').insert({ company_id: profile!.company_id, user_id: user.id, feature: 'jd_generation', model: 'gemini-2.5-flash' })

    return new Response(JSON.stringify({ success: true, data: jd }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return errorResponse(error, 500, corsHeaders)
  }
})
