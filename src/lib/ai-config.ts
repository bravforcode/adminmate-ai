export const GEMINI_CONFIG = {
  model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
  temperature: 0.7,
  maxOutputTokens: 8192,
}

export const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  th: 'ตอบเป็นภาษาไทยเท่านั้น ใช้ภาษาที่เป็นทางการและสุภาพ เหมาะสำหรับเอกสาร HR',
  en: 'Respond in English only. Use professional, formal language for HR documents.',
  vi: 'Chỉ trả lời bằng tiếng Việt. Sử dụng ngôn ngữ chuyên nghiệp cho tài liệu nhân sự.',
  id: 'Jawab hanya dalam Bahasa Indonesia. Gunakan bahasa formal dan profesional untuk dokumen HR.',
}

export const COUNTRY_LABOR_LAW_CONTEXT: Record<string, string> = {
  TH: 'Thailand. Labor Protection Act B.E. 2541. Minimum wage 400 THB/day. Social Security 5%. PDPA applies.',
  VN: 'Vietnam. Labor Code 2019. Social Insurance Law. Minimum wage varies by region. VND currency.',
  ID: 'Indonesia. UU 13/2003. BPJS mandatory. Minimum wage (UMP) by province. IDR currency.',
}
