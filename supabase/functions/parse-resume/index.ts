import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenAI } from 'https://esm.sh/@google/genai@latest'
import { corsHeaders, verifyAuth } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const user = await verifyAuth(req, supabase)
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  try {
    const { cvDocumentId, candidateId, companyId } = await req.json()

    const { data: cvDoc, error: cvError } = await supabase.from('cv_documents').select('file_url').eq('id', cvDocumentId).single()
    if (cvError) throw cvError

    const fileRes = await fetch(cvDoc.file_url)
    const fileBuffer = await fileRes.arrayBuffer()
    const fileText = new TextDecoder().decode(fileBuffer)

    const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `Extract structured data from this resume text. Return ONLY valid JSON: { "full_name": "string", "email": "string", "phone": "string", "location": "string", "linkedin_url": "string", "portfolio_url": "string", "summary": "string", "total_experience_years": number, "work_experience": [{"company":"string","title":"string","start_date":"string","end_date":"string","description":"string","skills_used":["string"]}], "education": [{"institution":"string","degree":"string","field":"string","start_date":"string","end_date":"string"}], "skills": [{"name":"string","level":"string","years":number}], "languages": [{"name":"string","level":"string"}], "certifications": [{"name":"string","issuer":"string","date":"string"}] }`,
        temperature: 0.1, maxOutputTokens: 4096,
      },
      contents: fileText.slice(0, 15000),
    })

    const text = response.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (parsed) {
      await supabase.from('cv_documents').update({ parsed_content: parsed, skills_extracted: (parsed.skills || []).map((s: any) => s.name), experience_years: parsed.total_experience_years, education_extracted: parsed.education, summary: parsed.summary }).eq('id', cvDocumentId)

      if (parsed.email && candidateId) {
        const { data: candidate } = await supabase.from('candidates').select('email').eq('id', candidateId).single()
        if (!candidate?.email) {
          await supabase.from('candidates').update({ email: parsed.email, phone: parsed.phone || undefined, location: parsed.location || undefined, linkedin_url: parsed.linkedin_url || undefined, portfolio_url: parsed.portfolio_url || undefined, experience_years: parsed.total_experience_years }).eq('id', candidateId)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return errorResponse(error, 500, corsHeaders)
  }
})
