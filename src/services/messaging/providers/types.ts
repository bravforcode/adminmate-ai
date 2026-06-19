/* ============================================================
   Messaging Provider Adapter Layer
   Defines the interface for all messaging providers.
   Each adapter must check configuration before sending.
   ============================================================ */

export type MessageChannel = 'email' | 'line' | 'whatsapp' | 'sms' | 'facebook' | 'in_app'

export interface MessageProviderSendInput {
  companyId: string
  channel: MessageChannel
  to: string
  subject?: string
  body: string
  metadata?: Record<string, unknown>
}

export type MessageProviderStatus =
  | 'sent'
  | 'queued'
  | 'failed'
  | 'provider_not_configured'

export interface MessageProviderSendResult {
  success: boolean
  provider: string
  providerMessageId?: string
  status: MessageProviderStatus
  errorMessage?: string
}

export interface MessageProvider {
  provider: string
  channel: MessageChannel
  isConfigured(companyId: string): Promise<boolean>
  send(input: MessageProviderSendInput): Promise<MessageProviderSendResult>
}

// ── Provider Status Check ───────────────────────────────────

export interface ProviderConfigCheck {
  configured: boolean
  reason?: string
}

// ── Template Rendering ──────────────────────────────────────

export interface TemplateVariable {
  name: string
  type: string
  required: boolean
  defaultValue?: string
}

export interface RenderedTemplate {
  subject?: string
  body: string
  missingVariables: string[]
}

/**
 * Render a template with provided variables.
 * Returns missing variables if any required variables are missing.
 */
export function renderTemplate(
  subjectTemplate: string | null | undefined,
  bodyTemplate: string,
  variables: Record<string, string>,
  schema: TemplateVariable[]
): RenderedTemplate {
  let subject = subjectTemplate ?? undefined
  let body = bodyTemplate
  const missingVariables: string[] = []

  for (const vars of schema) {
    const value = variables[vars.name]
    if (vars.required && (!value || value.trim() === '')) {
      missingVariables.push(vars.name)
    }
    const placeholder = `{{${vars.name}}}`
    if (subject) subject = subject.replace(placeholder, value ?? vars.defaultValue ?? '')
    body = body.replace(placeholder, value ?? vars.defaultValue ?? `[${vars.name}]`)
  }

  return { subject, body, missingVariables }
}

/**
 * Validate that all required variables are present.
 */
export function validateTemplateVariables(
  variables: Record<string, string>,
  schema: TemplateVariable[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  for (const vars of schema) {
    if (vars.required && (!variables[vars.name] || variables[vars.name].trim() === '')) {
      missing.push(vars.name)
    }
  }
  return { valid: missing.length === 0, missing }
}
