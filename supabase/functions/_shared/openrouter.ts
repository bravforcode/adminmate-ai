import { requireEnv } from './utils.ts'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001:free'
const FALLBACK_MODEL = 'deepseek/deepseek-chat-v3-0324:free'

export function getOpenRouterKey(): string {
  return Deno.env.get('OPENROUTER_API_KEY') || requireEnv('OPENROUTER_API_KEY')
}

interface AiOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export async function callAi(
  systemPrompt: string,
  userPrompt: string,
  opts: AiOptions = {}
): Promise<string> {
  const apiKey = getOpenRouterKey()
  const model = opts.model || DEFAULT_MODEL
  const temperature = opts.temperature ?? 0.3

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://adminmate.ai',
      'X-Title': 'AdminMate AI',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: opts.maxTokens || 4096,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    // Try fallback model
    if (model !== FALLBACK_MODEL) {
      console.warn(`OpenRouter ${model} failed: ${res.status}, trying fallback`)
      return callAi(systemPrompt, userPrompt, { ...opts, model: FALLBACK_MODEL })
    }
    throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`)
  }

  const json = await res.json()
  return json.choices?.[0]?.message?.content || ''
}

export function getAiModel(): string {
  return Deno.env.get('OPENROUTER_MODEL') || DEFAULT_MODEL
}
