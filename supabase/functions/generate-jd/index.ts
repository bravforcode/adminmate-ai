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

const FN = 'generate-jd'

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

    const rateLimited = await enforceRateLimit(supabase, user.id, 'jd_generation', 10, 60)
    if (rateLimited) return rateLimited

    let body: any
    try { body = await req.json() } catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: JSON_HEADERS }) }

    const { title, department, location, employmentType, experienceLevel, country, language } = body
    if (!title || typeof title !== 'string' || title.length > 200) {
      return new Response(JSON.stringify({ success: false, error: 'title is required (string, max 200 chars)' }), { status: 400, headers: JSON_HEADERS })
    }
    if (!department || typeof department !== 'string' || department.length > 100) {
      return new Response(JSON.stringify({ success: false, error: 'department is required' }), { status: 400, headers: JSON_HEADERS })
    }

    const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ success: false, error: 'User has no company. Complete onboarding first.' }), { status: 400, headers: JSON_HEADERS })
    }

    const langInstr: Record<string, string> = {
      th: 'Write entirely in Thai language. Professional, formal tone for HR documents.',
      en: 'Write entirely in English. Professional tone.',
      vi: 'Write entirely in Vietnamese.',
      id: 'Write entirely in Bahasa Indonesia.',
    }
    const countryCtx: Record<string, string> = {
      TH: 'Thailand, salary in THB',
      VN: 'Vietnam, salary in VND',
      ID: 'Indonesia, salary in IDR',
    }

    const ai = new GoogleGenAI({ apiKey: getGeminiKey() })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a senior HR professional for a company in ${countryCtx[country as string] || 'Southeast Asia'}. ${langInstr[language as string] || langInstr.en} Return ONLY valid JSON (no markdown, no explanation): { "title": "string", "title_en": "string", "description": "string (3 compelling paragraphs)", "description_th": "string", "responsibilities": ["8-12 items"], "requirements": ["6-10 items"], "nice_to_have": ["3-5 items"], "skills_required": ["5-8 skills"], "salary_suggestion": { "min": number, "max": number } }`,
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
      contents: `Create JD for: ${title} | ${department} | ${location} | ${employmentType} | ${experienceLevel}`,
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const jd = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (!jd) {
      return new Response(JSON.stringify({ success: false, error: 'AI returned no parseable content. Please try again.' }), { status: 502, headers: JSON_HEADERS })
    }

    await supabase.from('ai_usage_log').insert({
      company_id: profile.company_id,
      user_id: user.id,
      feature: 'jd_generation',
      model: 'gemini-2.5-flash',
    })

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(JSON.stringify({ success: true, data: jd }), { headers: JSON_HEADERS })
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, corsHeaders)
  }
})
