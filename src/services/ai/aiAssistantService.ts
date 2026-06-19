import { supabase } from '../../lib/supabase'

/* ============================================================
   Employee AI Assistant Service
   All queries scoped to company_id via RLS.
   ============================================================ */

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// ── Types ───────────────────────────────────────────────────

export interface AIConversation {
  id: string
  company_id: string
  user_id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

export interface AIMessage {
  id: string
  company_id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources: Array<{ title: string; type: string; id?: string }>
  confidence: 'low' | 'medium' | 'high'
  created_at: string
}

export interface AIKnowledgeSource {
  id: string
  company_id: string
  source_type: string
  title: string
  content: string
  metadata: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AddKnowledgeSourceInput {
  companyId: string
  sourceType: string
  title: string
  content: string
  metadata?: Record<string, unknown>
}

export interface SendMessageResult {
  message: AIMessage
  hrDisclaimer: boolean
}

// ── Helpers ─────────────────────────────────────────────────

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'AI assistant function failed')
  return json
}

// ── Conversations ───────────────────────────────────────────

export async function createConversation(
  companyId: string,
  userId: string,
  title?: string
): Promise<AIConversation> {
  const { data, error } = await supabase
    .from('ai_assistant_conversations')
    .insert({
      company_id: companyId,
      user_id: userId,
      title: title ?? 'New Conversation',
    })
    .select()
    .single()

  if (error) throw error
  return data as AIConversation
}

export async function getConversations(
  userId: string,
  companyId: string
): Promise<AIConversation[]> {
  const { data, error } = await supabase
    .from('ai_assistant_conversations')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AIConversation[]
}

export async function getConversationMessages(
  conversationId: string,
  companyId: string
): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from('ai_assistant_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as AIMessage[]
}

// ── Messages ────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<SendMessageResult> {
  const result = await invokeFunction<{
    message: AIMessage
    hr_disclaimer: boolean
  }>('ai-assistant-chat', {
    conversation_id: conversationId,
    content,
  })

  return {
    message: result.message,
    hrDisclaimer: result.hr_disclaimer,
  }
}

// ── Knowledge Sources ───────────────────────────────────────

export async function getKnowledgeSources(
  companyId: string
): Promise<AIKnowledgeSource[]> {
  const { data, error } = await supabase
    .from('ai_knowledge_sources')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as AIKnowledgeSource[]
}

export async function addKnowledgeSource(
  input: AddKnowledgeSourceInput
): Promise<AIKnowledgeSource> {
  const { data, error } = await supabase
    .from('ai_knowledge_sources')
    .insert({
      company_id: input.companyId,
      source_type: input.sourceType,
      title: input.title,
      content: input.content,
      metadata: input.metadata ?? {},
    })
    .select()
    .single()

  if (error) throw error
  return data as AIKnowledgeSource
}

export async function deactivateKnowledgeSource(
  sourceId: string,
  companyId: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_knowledge_sources')
    .update({ is_active: false })
    .eq('id', sourceId)
    .eq('company_id', companyId)

  if (error) throw error
}
